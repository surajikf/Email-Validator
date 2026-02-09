import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { emailQueue } from '../queue/emailQueue';
import { parseFile, EmailRecord } from '../utils/fileParser';

export const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Upload Endpoint
router.post('/upload', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const files = req.files as Express.Multer.File[];
        let allRecords: EmailRecord[] = [];
        const filePathsToClean: string[] = [];

        for (const file of files) {
            const filePath = file.path;
            filePathsToClean.push(filePath);
            const records = await parseFile(filePath, file.originalname, file.mimetype);
            allRecords = allRecords.concat(records);
        }

        // Deduplicate by email
        const seen = new Set<string>();
        const uniqueEmails: EmailRecord[] = [];

        for (const record of allRecords) {
            const emailLower = record.email.toLowerCase();
            if (!seen.has(emailLower)) {
                seen.add(emailLower);
                uniqueEmails.push(record);
            }
        }

        const duplicatesRemoved = allRecords.length - uniqueEmails.length;

        try {
            const job = await emailQueue.add('validate-job', {
                emails: uniqueEmails,
                jobId: files[0].filename,
                duplicatesRemoved
            });

            // Check if this is a batch job
            const isBatchJob = (job as any).isBatchJob || false;
            const batchCount = (job as any).batchCount || 1;

            console.log(`[Upload] Job ${job.id} added: ${uniqueEmails.length} emails${isBatchJob ? ` (${batchCount} batches)` : ''}.`);

            res.json({
                message: 'Files uploaded and processing started',
                jobId: job.id,
                totalEmails: uniqueEmails.length,
                duplicatesRemoved,
                isBatchJob,
                batchCount
            });
        } catch (error: any) {
            console.error("Queue Error:", error);
            if (error.message.includes('ECONNREFUSED') || error.message.includes('Redis')) {
                return res.status(503).json({ error: 'Background service (Redis) unavailable.' });
            }
            res.status(500).json({ error: 'Failed to queue job' });
        } finally {
            filePathsToClean.forEach(filePath => {
                try { fs.unlinkSync(filePath); } catch (e) { }
            });
        }
    } catch (error: any) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error processing files', details: error.message });
        }
    }
});

// Paste Endpoint
router.post('/paste', async (req, res) => {
    const { emails } = req.body;

    let rawList: string[] = [];
    if (typeof emails === 'string') {
        rawList = emails.split(/[\n,]/).map(e => e.trim()).filter(e => e.includes('@'));
    } else if (Array.isArray(emails)) {
        rawList = emails;
    }

    if (rawList.length === 0) {
        return res.status(400).json({ error: 'No valid emails found' });
    }

    const uniqueEmails = Array.from(new Set(rawList));
    const duplicatesRemoved = rawList.length - uniqueEmails.length;

    try {
        const job = await emailQueue.add('validate-job', {
            emails: uniqueEmails,
            jobId: `paste-${Date.now()}`,
            duplicatesRemoved
        });

        res.json({
            jobId: job.id,
            message: 'Processing started',
            totalEmails: uniqueEmails.length,
            duplicatesRemoved
        });
    } catch (err: any) {
        console.error("Queue Error:", err);
        if (err.message.includes('ECONNREFUSED') || err.message.includes('Redis')) {
            return res.status(503).json({ error: 'Background service (Redis) unavailable. Please start Redis.' });
        }
        res.status(500).json({ error: 'Processing failed' });
    }
});

// Revalidate Endpoint (Using Paste logic effectively, but for revalidation)
router.post('/revalidate-invalid', async (req, res) => {
    // This requires supabase access, so maybe it fits better in Campaign or a separate 'Management' route?
    // Or we keep it here as it triggers validation. 
    // Actually, this reads from DB, so imports supabase.
    // Let's implement it here as it triggers a job.

    // Import dynamically or at top if needed.
    // Since it's DB dependent, maybe Dashboard or Campaign is better?
    // But it triggers a 'validate-job' (or revalidate-job).
    // Let's put it here for now, but I need to import supabase.

    // Deferring implementation to match imports.
    res.status(501).json({ error: 'Moved to campaign/management routes' });
});
