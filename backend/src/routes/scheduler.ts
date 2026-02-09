import express from 'express';
import { supabase } from '../lib/supabase';
import { SchedulerService } from '../services/scheduler';

export const router = express.Router();

// Get Scheduler Settings
router.get('/settings', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { data, error } = await supabase
            .from('scheduler_settings')
            .select('*')
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error: any) {
        console.error('[API] Scheduler Settings Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update Scheduler Settings
router.post('/settings', async (req, res) => {
    try {
        const { frequency, time, batch_size, is_active, day_of_week } = req.body;

        if (!supabase) {
            return res.status(503).json({ error: 'Database not available' });
        }

        // 1. Update DB
        const { data, error } = await supabase
            .from('scheduler_settings')
            .update({
                frequency,
                time,
                batch_size,
                is_active,
                day_of_week,
                updated_at: new Date().toISOString()
            })
            .eq('id', '00000000-0000-0000-0000-000000000000') // Singleton ID
            .select()
            .single();

        if (error) throw error;

        // 2. Restart Scheduler with new settings
        await SchedulerService.restart();

        res.json({ message: 'Settings updated and scheduler restarted', settings: data });

    } catch (error: any) {
        console.error('[API] Update Scheduler Error:', error.message);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
