import express from 'express';
import { supabase } from '../lib/supabase';
import { emailQueue } from '../queue/emailQueue';

export const router = express.Router();

// --- Analytics ---

import { DashboardService } from '../services/dashboard';

router.get('/summary', async (req, res) => {
    try {
        const stats = await DashboardService.getSummaryStats();
        res.json(stats);
    } catch (error: any) {
        console.error('[Dashboard] Error:', error);
        res.status(500).json({ error: 'Failed to fetch summary stats' });
    }
});

router.get('/daily', async (req, res) => {
    try {
        const stats = await DashboardService.getDailyStats();
        res.json(stats);
    } catch (error: any) {
        console.error('[Dashboard] Error:', error);
        res.status(500).json({ error: 'Failed to fetch daily stats' });
    }
});

// ... (analytics route remains if needed)

// --- Database View ---

router.get('/database', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const status = req.query.status as string;
        const search = req.query.search as string;

        const result = await DashboardService.getDatabaseView(page, limit, status, search);
        res.json(result);
    } catch (err: any) {
        console.error('[API] Database Fetch Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch database' });
    }
});

// --- Job Status (History & Detail) ---

router.get('/history', async (req, res) => {
    try {
        const jobs = await emailQueue.getRecentJobs();
        res.json(jobs);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

router.get('/status/:id', async (req, res) => {
    const jobId = req.params.id;
    const job = await emailQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    // Handle batch jobs differently
    if ((job as any).isBatchJob) {
        const batchProgress = (job as any).progress;
        const result = job.returnvalue;
        const state = await job.getState();

        res.json({
            id: jobId,
            state,
            isBatchJob: true,
            progress: batchProgress?.progress || 0,
            batchInfo: {
                completedBatches: batchProgress?.completedBatches || 0,
                totalBatches: batchProgress?.totalBatches || 0,
                processedEmails: batchProgress?.processedEmails || 0,
                totalEmails: batchProgress?.totalEmails || 0
            },
            result: state === 'completed' ? result : null
        });
        return;
    }

    // Standard job handling
    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const duplicatesRemoved = job.data?.duplicatesRemoved || 0;

    res.json({
        id: jobId,
        state,
        progress: typeof progress === 'number' ? progress : 0,
        result: state === 'completed' ? result : null,
        duplicatesRemoved
    });
});
