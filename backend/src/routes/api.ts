import express from 'express';
import multer from 'multer';
import { emailQueue } from '../queue/emailQueue';
import fs from 'fs';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';

export const router = express.Router();

const upload = multer({ dest: 'uploads/' });

async function parseFile(filePath: string, originalname: string, mimeType: string): Promise<string[]> {
    const emails: string[] = [];
    try {
        if (mimeType.includes('csv') || originalname.endsWith('.csv')) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row: any) => {
                        const email = Object.values(row)[0] as string;
                        if (email && email.includes('@')) emails.push(email.trim());
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else if (mimeType.includes('sheet') || originalname.match(/\.xlsx?$/)) {
            const workbook = xlsx.readFile(filePath, { type: 'file', cellDates: true });
            const emailSet = new Set<string>();
            const emailRegex = /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/g;

            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                const textContent = JSON.stringify(data);
                const matches = textContent.match(emailRegex);
                if (matches) {
                    matches.forEach(email => emailSet.add(email.trim().toLowerCase()));
                }
            });
            emails.push(...Array.from(emailSet));
        } else {
            const content = fs.readFileSync(filePath, 'utf-8');
            content.split(/\r?\n/).forEach(line => {
                if (line.includes('@')) emails.push(line.trim());
            });
        }
    } catch (error) {
        console.error(`Error parsing file ${originalname}:`, error);
        throw error;
    }
    return emails;
}

router.post('/upload', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const files = req.files as Express.Multer.File[];
        let allEmails: string[] = [];
        const filePathsToClean: string[] = [];

        for (const file of files) {
            const filePath = file.path;
            filePathsToClean.push(filePath);
            const emails = await parseFile(filePath, file.originalname, file.mimetype);
            allEmails = allEmails.concat(emails);
        }

        const uniqueEmails = Array.from(new Set(allEmails));
        const duplicatesRemoved = allEmails.length - uniqueEmails.length;

        try {
            const job = await emailQueue.add('validate-job', {
                emails: uniqueEmails,
                jobId: files[0].filename,
                duplicatesRemoved
            });
            console.log(`[API] Multi-file Job added: ${job.id} with ${uniqueEmails.length} unique emails.`);

            res.json({
                message: 'Files uploaded and processing started',
                jobId: job.id,
                totalEmails: uniqueEmails.length,
                duplicatesRemoved
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

router.get('/history', async (req, res) => {
    try {
        const jobs = await emailQueue.getRecentJobs();
        res.json(jobs);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

import { supabase } from '../lib/supabase';

// ... existing code ...

router.get('/database', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const status = req.query.status as string;
        const search = req.query.search as string;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        let query = supabase
            .from('validated_emails')
            .select('*', { count: 'exact' });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.ilike('email', `%${search}%`);
        }

        const { data, error, count } = await query
            .order('validated_at', { ascending: false })
            .range(start, end);

        if (error) throw error;
        res.json({
            records: data,
            totalCount: count || 0,
            page,
            limit
        });
    } catch (err: any) {
        console.error('[API] Database Fetch Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch database' });
    }
});

router.post('/revalidate-invalid', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('validated_emails')
            .select('email')
            .eq('status', 'invalid');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.json({ message: 'No invalid emails to revalidate', jobId: null });
        }

        const emails = data.map(r => r.email);
        const job = await emailQueue.add('revalidate-job', {
            emails,
            jobId: `revalidate-${Date.now()}`,
            isRevalidation: true
        });

        res.json({
            message: `Started re-validation for ${emails.length} emails`,
            jobId: job.id,
            totalEmails: emails.length
        });
    } catch (err: any) {
        console.error('[API] Re-validation Error:', err.message);
        res.status(500).json({ error: 'Failed to start re-validation' });
    }
});

router.get('/analytics', async (req, res) => {
    try {
        // 1. Get Totals & Distribution
        const { data: distribution, error: distError } = await supabase
            .from('validated_emails')
            .select('status');

        if (distError) throw distError;

        const totals = {
            total: distribution.length,
            valid: distribution.filter(r => r.status === 'valid').length,
            invalid: distribution.filter(r => r.status === 'invalid').length,
            risky: distribution.filter(r => r.status === 'risky').length,
        };

        // 2. Get Trend (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: trendData, error: trendError } = await supabase
            .from('validated_emails')
            .select('validated_at, status')
            .gte('validated_at', sevenDaysAgo.toISOString());

        if (trendError) throw trendError;

        const trendMap: Record<string, any> = {};
        trendData.forEach(r => {
            const date = r.validated_at.split('T')[0];
            if (!trendMap[date]) trendMap[date] = { date, valid: 0, invalid: 0, risky: 0 };
            trendMap[date][r.status]++;
        });

        const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        res.json({ totals, trend });
    } catch (err: any) {
        console.error('[API] Analytics Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

router.get('/status/:id', async (req, res) => {
    const jobId = req.params.id;
    const job = await emailQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    console.log(`[API] Status req for ${jobId}. State: ${state}, Result Length: ${result ? result.length : 'null'}`);

    res.json({
        id: jobId,
        state,
        progress: typeof progress === 'number' ? progress : 0,
        result: state === 'completed' ? result : null
    });
});
