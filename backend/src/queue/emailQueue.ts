import { Queue, Worker, Job } from 'bullmq';
import { EmailValidatorService, ValidationResult } from '../services/validator';
import { Redis } from 'ioredis';
import { InMemoryQueue } from './InMemoryQueue';
import { supabase } from '../lib/supabase';
import { batchManager } from './batchManager';

let queueInstance: Queue | InMemoryQueue;
let redisConnection: Redis | null = null;

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

// Batch processing constants
const BATCH_SIZE = 10000; // Emails per batch job
const VALIDATION_CONCURRENCY = 25; // Increased to 25 for better speed (Balanced)

console.log(`[Queue] Initializing... trying Redis at ${REDIS_HOST}:${REDIS_PORT}`);

class QueueWrapper {
    private queue: any;
    private isRedis: boolean = false;
    private redisClient: Redis | null = null;

    constructor() {
        this.init();
    }

    async init() {
        // If USE_REDIS is set to 'false', skip Redis entirely
        if (process.env.USE_REDIS === 'false') {
            console.log("[Queue] Redis disabled by config. Using In-Memory Queue.");
            this.isRedis = false;
            this.queue = new InMemoryQueue('email-validation');
            this.initWorker(null);
            return;
        }

        const tempRedis = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            maxRetriesPerRequest: null,
            connectTimeout: 2000,
            lazyConnect: true
        });

        try {
            await tempRedis.connect();
            console.log("✅ [Queue] Redis Connected! Using BullMQ.");
            this.isRedis = true;
            await tempRedis.quit();

            // Real connection
            const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });
            this.redisClient = connection;
            this.queue = new Queue('email-validation', { connection });

            // Initialize batch manager with Redis
            batchManager.setRedis(connection);

            this.initWorker(connection);

        } catch (e) {
            console.warn("⚠️ [Queue] Redis connection failed/timed out. Falling back to In-Memory Queue.");
            this.isRedis = false;
            this.queue = new InMemoryQueue('email-validation');
            this.initWorker(null);
        }
    }

    private initWorker(connection: any) {
        const processor = async (job: any) => {
            const { emails, isRevalidation, parentJobId, batchIndex } = job.data;
            const total = emails.length;
            const results: ValidationResult[] = [];

            console.log(`[Worker] Processing ${total} emails (batch ${batchIndex ?? 'single'})`);

            for (let i = 0; i < total; i += VALIDATION_CONCURRENCY) {
                const batch = emails.slice(i, i + VALIDATION_CONCURRENCY);
                let emailsToValidate = batch;

                // Duplicate Check: Filter out emails that already exist in Supabase
                if (supabase) {
                    try {
                        const batchEmails = batch.map((item: any) => typeof item === 'string' ? item : item.email);
                        const { data: existing, error } = await supabase
                            .from('validated_emails')
                            .select('email')
                            .in('email', batchEmails);

                        if (!error && existing) {
                            const existingSet = new Set(existing.map((e: any) => e.email));
                            // Filter current batch
                            emailsToValidate = batch.filter((item: any) => {
                                const email = typeof item === 'string' ? item : item.email;
                                return !existingSet.has(email);
                            });
                            console.log(`[Worker] Skipped ${batch.length - emailsToValidate.length} duplicates in current chunk.`);
                        }
                    } catch (dupErr) {
                        console.error('[Worker] Duplicate check failed, proceeding with all:', dupErr);
                    }
                }

                if (emailsToValidate.length === 0) {
                    await job.updateProgress(Math.round(((i + batch.length) / total) * 100));
                    continue; // Skip if all are duplicates
                }

                // Validate emails (handle string or object)
                const batchResults = await Promise.all(emailsToValidate.map(async (item: any) => {
                    const emailParam = typeof item === 'string' ? item : item.email;

                    // Add timeout failsafe
                    const timeoutPromise = new Promise<ValidationResult>((resolve) => {
                        setTimeout(() => resolve({
                            email: emailParam,
                            isValid: false,
                            status: 'unknown',
                            score: 0,
                            reason: 'Validation Timeout',
                            details: {
                                syntax: false, mx: false, smtp: false, isDisposable: false,
                                isCatchAll: false, isRoleBased: false, isGmail: false, reputation: 'low'
                            }
                        }), 30000); // 30s max per email
                    });

                    return Promise.race([
                        EmailValidatorService.validate(emailParam),
                        timeoutPromise
                    ]);
                }));

                // Persist to Supabase
                try {
                    const dbRecords = batchResults.map((r, index) => {
                        const originalItem = batch[index];
                        const meta = typeof originalItem === 'object' ? originalItem : {};

                        const first_name = meta.first_name || undefined;
                        const company_name = (() => {
                            let cName = meta.company_name || null;
                            // Feature: Deduce company name for custom domains
                            if (!cName && !EmailValidatorService.isFreeProvider(r.email)) {
                                try {
                                    const domain = r.email.split('@')[1];
                                    if (domain) {
                                        const namePart = domain.split('.')[0];
                                        // Capitalize first letter
                                        cName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                                    }
                                } catch (e) {
                                    // Fallback to null on error
                                }
                            }
                            return cName || undefined;
                        })();

                        // Update result object for frontend
                        r.first_name = first_name;
                        r.company_name = company_name;

                        return {
                            email: r.email,
                            status: r.status,
                            score: r.score,
                            reason: r.reason,
                            is_disposable: r.details.isDisposable,
                            is_catch_all: r.details.isCatchAll,
                            is_role_based: r.details.isRoleBased,
                            is_gmail: r.details.isGmail,
                            reputation: r.details.reputation,
                            validated_at: new Date().toISOString(),
                            // Add metadata if present
                            first_name: first_name || null,
                            company_name: company_name || null,
                            ...(isRevalidation ? {
                                last_revalidated_at: new Date().toISOString(),
                                is_reactivated: r.status === 'valid' || r.status === 'risky'
                            } : {})
                        };
                    });

                    if (supabase) {
                        if (isRevalidation) {
                            const { error } = await supabase
                                .from('validated_emails')
                                .upsert(dbRecords, { onConflict: 'email' });
                            if (error) console.error('[QueueWorker] Supabase upsert error:', error.message);
                        } else {
                            const { error } = await supabase.from('validated_emails').insert(dbRecords);
                            if (error) console.error('[QueueWorker] Supabase insert error:', error.message);
                        }
                    }
                } catch (dbError) {
                    console.error('[QueueWorker] Failed to save to Supabase:', dbError);
                }

                results.push(...batchResults);
                await job.updateProgress(Math.round(((i + batch.length) / total) * 100));
            }

            // If this is part of a batch job, update the batch manager
            if (parentJobId) {
                await batchManager.onBatchComplete(parentJobId, job.id, results.length, results);
            }

            return results;
        };

        if (this.isRedis) {
            const worker = new Worker('email-validation', processor, { connection, concurrency: 5 });
            worker.on('completed', (job) => {
                console.log(`Job ${job.id} completed!`);
            });
            worker.on('failed', async (job, err) => {
                console.log(`Job ${job?.id} failed: ${err.message}`);
                // Update batch manager on failure
                if (job?.data?.parentJobId) {
                    await batchManager.onBatchFailed(job.data.parentJobId, job.id!, err.message);
                }
            });
        } else {
            this.queue.process(processor);
        }
    }

    /**
     * Add a job - automatically splits into batches for large email lists
     */
    async add(name: string, data: any) {
        if (!this.queue) await this.init();

        const { emails, ...otherData } = data;
        const emailCount = emails?.length || 0;

        console.log(`[QueueWrapper] Adding job ${name} with ${emailCount} emails`);

        // For small jobs, process directly
        if (emailCount <= BATCH_SIZE) {
            return this.queue.add(name, data);
        }

        // For large jobs, split into batches
        console.log(`[QueueWrapper] Large file detected! Splitting ${emailCount} emails into batches of ${BATCH_SIZE}`);

        const parentJobId = `parent-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const batchIds: string[] = [];

        // Create batch jobs
        for (let i = 0; i < emailCount; i += BATCH_SIZE) {
            const batchEmails = emails.slice(i, i + BATCH_SIZE);
            const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
            const batchName = `${name}-batch-${batchIndex}`;

            const batchJob = await this.queue.add(batchName, {
                ...otherData,
                emails: batchEmails,
                parentJobId,
                batchIndex,
                totalBatches: Math.ceil(emailCount / BATCH_SIZE)
            });

            batchIds.push(batchJob.id);
            console.log(`[QueueWrapper] Created batch ${batchIndex}: ${batchEmails.length} emails (Job ID: ${batchJob.id})`);
        }

        // Create batch tracking entry
        await batchManager.createBatchJob(parentJobId, emailCount, batchIds);

        // Return a mock job object with the parent ID
        return {
            id: parentJobId,
            isBatchJob: true,
            batchCount: batchIds.length,
            totalEmails: emailCount
        };
    }

    async getJob(id: string) {
        if (!this.queue) await this.init();

        // Check if this is a batch parent job
        const batchInfo = await batchManager.getBatchJob(id);
        if (batchInfo) {
            return {
                id,
                isBatchJob: true,
                data: { emails: [] },
                progress: await batchManager.getProgress(id),
                returnvalue: batchInfo.status === 'completed' ? batchInfo.results : null,
                getState: async () => batchInfo.status === 'completed' ? 'completed' :
                    batchInfo.status === 'failed' ? 'failed' : 'active'
            };
        }

        return this.queue.getJob(id);
    }

    /**
     * Get batch job status with aggregated progress
     */
    async getBatchStatus(parentJobId: string) {
        return batchManager.getProgress(parentJobId);
    }

    async getRecentJobs() {
        if (!this.queue) await this.init();

        if (this.isRedis) {
            const jobs = await this.queue.getJobs(['completed', 'failed'], 0, 19, true);
            return jobs
                .filter((job: any) => !job.data?.parentJobId) // Exclude child batch jobs
                .map((job: any) => ({
                    id: job.id,
                    date: parseInt(job.timestamp) || Date.now(),
                    status: (job.returnvalue ? 'completed' : 'failed'),
                    total: job.data && job.data.emails ? job.data.emails.length : 0,
                    validCount: job.returnvalue ? job.returnvalue.filter((r: any) => r.status === 'valid').length : 0
                }));
        } else {
            return this.queue.getRecentJobs();
        }
    }
}

export const emailQueue = new QueueWrapper();
