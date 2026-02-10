import { supabase } from '../lib/supabase';
import { BrevoService } from '../services/brevo';

export class SendingQueue {
    private static isRunning = false;
    private static BATCH_SIZE = 50; // Process 50 at a time to avoid rate limits

    static async processDailyCampaign(manualBatchSize?: number) {
        const batchSize = manualBatchSize || this.BATCH_SIZE;

        if (this.isRunning) {
            console.log('[SendingQueue] Job already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log(`[SendingQueue] Starting Daily Campaign with batch size: ${batchSize}`);

        try {
            if (!supabase) {
                throw new Error('Supabase client not initialized');
            }

            // 1. Fetch valid, unsent emails
            // Ensure schema has these columns!
            const { data: candidates, error } = await supabase
                .from('validated_emails')
                .select('*')
                .eq('status', 'valid')
                .is('sent_at', null)
                .limit(batchSize);

            if (error) throw error;

            if (!candidates || candidates.length === 0) {
                console.log('[SendingQueue] No pending valid emails found.');
                this.isRunning = false;
                return;
            }

            console.log(`[SendingQueue] Found ${candidates.length} candidates. Processing...`);

            let successCount = 0;
            let failCount = 0;

            for (const record of candidates) {
                // n8n Logic: Check for Company Name
                // Assuming 'company_name' might be in a different table or metadata column?
                // For now, checks if we have email.

                // Note: The Validation service stores 'result' but not necessarily 'company_name'. 
                // If the user uploads a CSV with Company Name, it needs to be stored in Supabase first.
                // Assuming 'metadata' column or similar exists or was added.
                // For this implementation, we will proceed with available data.

                const companyName = record.company_name || 'Valued Company';
                const name = record.first_name || 'there';

                const result = await BrevoService.sendEmail({
                    to: [{ email: record.email, name }],
                    subject: `${companyName}'s AI Roadmap for Operational Excellence`, // From n8n
                    params: { COMPANY_NAME: companyName }
                });

                if (result.success) {
                    // Update Supabase
                    const { error: updateError } = await supabase
                        .from('validated_emails')
                        .update({ sent_at: new Date().toISOString() })
                        .eq('email', record.email);

                    if (updateError) {
                        console.error(`[SendingQueue] Failed to update status for ${record.email}`, updateError);
                    } else {
                        successCount++;
                    }
                } else {
                    failCount++;
                }
            }

            console.log(`[SendingQueue] Batch Finished. Sent: ${successCount}, Failed: ${failCount}`);

            // If there are more, we could recursively call or just wait for next cron. 
            // Better to loop until empty if permitted, but for safety we stop here.

            // Send Summary Email (using Brevo for simplicity)
            if (successCount > 0) {
                await BrevoService.sendEmail({
                    to: [{ email: 'mtarate2004@gmail.com', name: 'Mayur' }],
                    subject: 'AI Cold Outreach Daily Run Complete',
                    params: {
                        COMPANY_NAME: 'Admin',
                        body: `Sent: ${successCount}\nFailed: ${failCount}`
                    }
                });
            }

        } catch (error) {
            console.error('[SendingQueue] Error in processing:', error);
        } finally {
            this.isRunning = false;
        }
    }
}
