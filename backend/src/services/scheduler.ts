import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { emailQueue } from '../queue/emailQueue';

export class SchedulerService {
    static init() {
        console.log('📅 [Scheduler] Initializing automation...');

        // Daily Check - at 00:00 every day
        cron.schedule('0 0 * * *', async () => {
            console.log('🕒 [Scheduler] Running Daily Re-validation check...');
            await this.revalidateInvalid();
        });

        // Weekly Check - at 00:00 on Sunday
        cron.schedule('0 0 * * 0', async () => {
            console.log('🕒 [Scheduler] Running Weekly Re-validation check...');
            // In a real app, you might distinguish daily vs weekly
            // For now, they both trigger the same re-validation logic
            await this.revalidateInvalid();
        });
    }

    private static async revalidateInvalid() {
        try {
            const { data, error } = await supabase
                .from('validated_emails')
                .select('email')
                .eq('status', 'invalid');

            if (error) throw error;

            if (data && data.length > 0) {
                const emails = data.map(r => r.email);
                console.log(`🚀 [Scheduler] Queueing ${emails.length} emails for re-validation.`);

                await emailQueue.add('auto-revalidate-job', {
                    emails,
                    jobId: `auto-revalidate-${Date.now()}`,
                    isRevalidation: true
                });
            } else {
                console.log('ℹ️ [Scheduler] No invalid emails to re-validate.');
            }
        } catch (err: any) {
            console.error('❌ [Scheduler] Error during auto re-validation:', err.message);
        }
    }
}
