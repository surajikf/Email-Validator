import express from 'express';
import { supabase } from '../lib/supabase';
import { emailQueue } from '../queue/emailQueue';
import { SendingQueue } from '../queue/sendingQueue';
import { BrevoService } from '../services/brevo';

export const router = express.Router();

// Manual Campaign Trigger Endpoint
router.post('/trigger', async (req, res) => {
    try {
        const { batchSize } = req.body;
        const size = batchSize ? parseInt(batchSize) : 50;

        SendingQueue.processDailyCampaign(size);

        res.json({ message: `Campaign triggered manually with batch size ${size}` });
    } catch (error) {
        console.error('Manual trigger error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test Email Endpoint
router.post('/send-test', async (req, res) => {
    try {
        const { to, companyName, subject } = req.body;

        if (!to || !companyName) {
            return res.status(400).json({ error: 'Missing required fields: to, companyName' });
        }

        const result = await BrevoService.sendEmail({
            to: [{ email: to, name: 'Test User' }],
            subject: subject || `${companyName}'s AI Roadmap for Operational Excellence`,
            params: {
                COMPANY_NAME: companyName
            }
        });

        if (result.success) {
            res.json({
                message: 'Test email sent successfully',
                messageId: result.messageId,
                to: to
            });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send email' });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Revalidate Endpoint
router.post('/revalidate-invalid', async (req, res) => {
    try {
        if (!supabase) {
            return res.json({ message: 'Database not configured', jobId: null });
        }
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
