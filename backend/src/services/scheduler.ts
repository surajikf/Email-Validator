import cron from 'node-cron';
import { SendingQueue } from '../queue/sendingQueue';
import { supabase } from '../lib/supabase';

interface SchedulerSettings {
    frequency: 'daily' | 'hourly' | 'weekly';
    time: string; // HH:MM
    batch_size: number;
    is_active: boolean;
    day_of_week: number; // 0-6
}

export class SchedulerService {
    private static currentTask: any | null = null;
    private static settings: SchedulerSettings | null = null;

    static async init() {
        console.log('[Scheduler] Initializing...');
        await this.restart();
    }

    static async restart() {
        // Stop existing task
        if (this.currentTask) {
            console.log('[Scheduler] Stopping previous task...');
            this.currentTask.stop();
            this.currentTask = null;
        }

        if (!supabase) {
            console.warn('[Scheduler] Database not connected. Scheduler disabled.');
            return;
        }

        // Fetch settings
        const { data, error } = await supabase
            .from('scheduler_settings')
            .select('*')
            .single();

        if (error || !data) {
            console.error('[Scheduler] Failed to load settings. Using defaults (Inactive).');
            return;
        }

        this.settings = data as SchedulerSettings;

        if (!this.settings.is_active) {
            console.log('[Scheduler] Scheduler is currently DISABLED in settings.');
            return;
        }

        this.scheduleJob();
    }

    private static scheduleJob() {
        if (!this.settings) return;

        const { frequency, time, day_of_week } = this.settings;
        let cronExpression = '';

        // Parse Time (HH:MM)
        const [hour, minute] = time.split(':').map(Number); // IST Time from DB

        // Note: node-cron uses server time. Assuming server is UTC or local.
        // If server is UTC and user inputs IST, we might need conversion.
        // For now, assuming user inputs server-relative time or server is IST.
        // Let's assume input is "Local Time" of the user/server.

        if (frequency === 'hourly') {
            // Run at minute 0 of every hour
            cronExpression = '0 * * * *';
            console.log(`[Scheduler] Scheduled HOURLY at minute 0.`);
        } else if (frequency === 'daily') {
            cronExpression = `${minute} ${hour} * * *`;
            console.log(`[Scheduler] Scheduled DAILY at ${time}.`);
        } else if (frequency === 'weekly') {
            cronExpression = `${minute} ${hour} * * ${day_of_week}`;
            console.log(`[Scheduler] Scheduled WEEKLY on day ${day_of_week} at ${time}.`);
        }

        if (cronExpression) {
            this.currentTask = cron.schedule(cronExpression, async () => {
                console.log(`[Scheduler] Triggering Campaign (${frequency})...`);
                // Pass dynamic batch size
                await SendingQueue.processDailyCampaign(this.settings!.batch_size);
            });
        }
    }
}
