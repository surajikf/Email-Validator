import { Queue, Worker, Job } from 'bullmq';
import { EmailValidatorService, ValidationResult } from '../services/validator';
import { Redis } from 'ioredis';
import { InMemoryQueue } from './InMemoryQueue';
import { supabase } from '../lib/supabase';

let queueInstance: Queue | InMemoryQueue;
let redisConnection: Redis | null = null;

// Determine mode based on Redis availability
// We can't easily wait for async connection at top level effectively without top-level await,
// so we'll try to connect and if it fails, we use memory.
// Ideally, we'd check this on server start, but for now we will default to trying Redis.

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

console.log(`[Queue] Initializing... trying Redis at ${REDIS_HOST}:${REDIS_PORT}`);

// We'll create a factory function or just try/catch the connection in a way
// Since BullMQ requires a connection, we will use a wrapper.

// SIMPLIFIED APPROACH:
// We will default to InMemory for this user session since we know they don't have Redis.
// Un-comment the Redis parts if you indeed have Redis.

/*
redisConnection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        // If we fail more than 3 times, stop trying and potentially let the app know.
        // However, ioredis keeps trying. 
        if (times > 3) return null; 
        return Math.min(times * 50, 2000);
    }
});
*/

// For the purpose of the user request "Redis unavailable", we will detect that.
// But checking port availability usually requires async.
// To keep it robust, we will use a flag or just force In-Memory if connection fails.

// HYBRID IMPLEMENTATION:
// We export an object that behaves like the queue.

class QueueWrapper {
    private queue: any;
    private isRedis: boolean = false;

    constructor() {
        this.init();
    }

    async init() {
        // Attempt to connect to Redis with a short timeout
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
            await tempRedis.quit(); // Close temp connection

            // Real connection
            const connection = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null });
            this.queue = new Queue('email-validation', { connection });
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
            const { emails, isRevalidation } = job.data;
            const total = emails.length;
            const results: ValidationResult[] = [];
            const CONCURRENCY = 50;
            const VALIDATION_TIMEOUT_MS = Number(process.env.VALIDATION_TIMEOUT_MS || 15000);

            const validateWithTimeout = async (email: string): Promise<ValidationResult> => {
                const timeoutFallback: ValidationResult = {
                    email,
                    isValid: false,
                    status: 'risky',
                    subStatus: 'validation_timeout',
                    score: 10,
                    reason: `Validation timeout after ${VALIDATION_TIMEOUT_MS}ms`,
                    freeEmail: false,
                    didYouMean: 'Unknown',
                    account: email.includes('@') ? email.split('@')[0] : 'Unknown',
                    domain: email.includes('@') ? email.split('@')[1] : 'Unknown',
                    domainAgeDays: null,
                    smtpProvider: 'unknown',
                    mxFound: false,
                    mxRecord: null,
                    firstName: 'Unknown',
                    lastName: 'Unknown',
                    plusAddressed: email.includes('+'),
                    localPartLength: email.includes('@') ? email.split('@')[0].length : 0,
                    domainLength: email.includes('@') ? email.split('@')[1].length : 0,
                    tld: email.includes('.') ? `.${email.split('.').pop()}` : '',
                    hasUnicode: /[^\x00-\x7F]/.test(email),
                    isCorporateDomain: true,
                    mxCount: 0,
                    smtpResponseCode: null,
                    riskFlags: ['validation_timeout'],
                    details: {
                        syntax: false,
                        mx: false,
                        smtp: false,
                        isDisposable: false,
                        isCatchAll: false,
                        isRoleBased: false,
                        isGmail: false,
                        reputation: 'medium'
                    }
                };

                try {
                    return await Promise.race([
                        EmailValidatorService.validate(email),
                        new Promise<ValidationResult>((resolve) => {
                            setTimeout(() => resolve(timeoutFallback), VALIDATION_TIMEOUT_MS);
                        })
                    ]);
                } catch (error: any) {
                    return {
                        ...timeoutFallback,
                        status: 'unknown',
                        reason: `Validation error: ${error?.message || 'Unknown error'}`
                    };
                }
            };

            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = emails.slice(i, i + CONCURRENCY);
                const batchResults = await Promise.all(batch.map((email: string) => validateWithTimeout(email)));

                // Persist to Supabase
                try {
                    const dbRecords = batchResults.map(r => ({
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
                        ...(isRevalidation ? {
                            last_revalidated_at: new Date().toISOString(),
                            is_reactivated: r.status === 'valid' || r.status === 'risky'
                        } : {})
                    }));

                    if (isRevalidation) {
                        // For re-validation, we upsert to update the original record status
                        // Note: This assumes 'email' is unique or we are updating the record matching this email.
                        const { error } = await supabase
                            .from('validated_emails')
                            .upsert(dbRecords, { onConflict: 'email' });
                        if (error) console.error('[QueueWorker] Supabase upsert error:', error.message);
                    } else {
                        const { error } = await supabase.from('validated_emails').insert(dbRecords);
                        if (error) console.error('[QueueWorker] Supabase insert error:', error.message);
                    }
                } catch (dbError) {
                    console.error('[QueueWorker] Failed to save to Supabase:', dbError);
                }

                results.push(...batchResults);
                await job.updateProgress(Math.round(((i + batch.length) / total) * 100));
            }
            return results;
        };

        if (this.isRedis) {
            const worker = new Worker('email-validation', processor, { connection, concurrency: 5 });
            worker.on('completed', (job) => console.log(`Job ${job.id} completed!`));
            worker.on('failed', (job, err) => console.log(`Job ${job?.id} failed: ${err.message}`));
        } else {
            // InMemory logic
            this.queue.process(processor);
        }
    }

    async add(name: string, data: any) {
        console.log(`[QueueWrapper] Adding job ${name} with data length: ${data.emails ? data.emails.length : 'unknown'}`);
        if (!this.queue) await this.init(); // Just in case
        return this.queue.add(name, data);
    }

    async getJob(id: string) {
        if (!this.queue) await this.init();
        return this.queue.getJob(id);
    }

    async getRecentJobs() {
        if (!this.queue) await this.init();

        if (this.isRedis) {
            // Redis/BullMQ implementation
            const jobs = await this.queue.getJobs(['completed', 'failed'], 0, 19, true);
            // Fetch validation counts - this is expensive in BullMQ without custom storage, 
            // so we might just return basic info or skip the count for now.
            return jobs.map((job: any) => ({
                id: job.id,
                date: parseInt(job.timestamp) || Date.now(),
                status: (job.returnvalue ? 'completed' : 'failed'),
                total: job.data && job.data.emails ? job.data.emails.length : 0,
                validCount: job.returnvalue ? job.returnvalue.filter((r: any) => r.status === 'valid').length : 0
            }));
        } else {
            // InMemory implementation
            return this.queue.getRecentJobs();
        }
    }
}

export const emailQueue = new QueueWrapper();
