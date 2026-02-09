import { Redis } from 'ioredis';

export interface BatchInfo {
    parentJobId: string;
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    totalEmails: number;
    processedEmails: number;
    batchIds: string[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: number;
    results: any[];
}

const BATCH_PREFIX = 'batch:';
const BATCH_TTL = 60 * 60 * 24; // 24 hours

export class BatchManager {
    private redis: Redis | null = null;
    private inMemoryStore: Map<string, BatchInfo> = new Map();

    constructor(redis?: Redis) {
        if (redis) {
            this.redis = redis;
        }
    }

    setRedis(redis: Redis) {
        this.redis = redis;
    }

    /**
     * Create a new batch parent job
     */
    async createBatchJob(
        parentJobId: string,
        totalEmails: number,
        batchIds: string[]
    ): Promise<BatchInfo> {
        const batchInfo: BatchInfo = {
            parentJobId,
            totalBatches: batchIds.length,
            completedBatches: 0,
            failedBatches: 0,
            totalEmails,
            processedEmails: 0,
            batchIds,
            status: 'pending',
            createdAt: Date.now(),
            results: []
        };

        if (this.redis) {
            await this.redis.setex(
                `${BATCH_PREFIX}${parentJobId}`,
                BATCH_TTL,
                JSON.stringify(batchInfo)
            );
        } else {
            this.inMemoryStore.set(parentJobId, batchInfo);
        }

        console.log(`[BatchManager] Created batch job ${parentJobId} with ${batchIds.length} batches for ${totalEmails} emails`);
        return batchInfo;
    }

    /**
     * Get batch job info
     */
    async getBatchJob(parentJobId: string): Promise<BatchInfo | null> {
        if (this.redis) {
            const data = await this.redis.get(`${BATCH_PREFIX}${parentJobId}`);
            return data ? JSON.parse(data) : null;
        }
        return this.inMemoryStore.get(parentJobId) || null;
    }

    /**
     * Update batch progress when a child job completes
     */
    async onBatchComplete(
        parentJobId: string,
        batchId: string,
        processedCount: number,
        results: any[]
    ): Promise<BatchInfo | null> {
        const batchInfo = await this.getBatchJob(parentJobId);
        if (!batchInfo) {
            console.error(`[BatchManager] Batch job ${parentJobId} not found`);
            return null;
        }

        batchInfo.completedBatches++;
        batchInfo.processedEmails += processedCount;
        batchInfo.results.push(...results);

        // Check if all batches completed
        if (batchInfo.completedBatches + batchInfo.failedBatches >= batchInfo.totalBatches) {
            batchInfo.status = batchInfo.failedBatches > 0 ? 'failed' : 'completed';
            console.log(`[BatchManager] Batch job ${parentJobId} ${batchInfo.status}! Processed ${batchInfo.processedEmails}/${batchInfo.totalEmails} emails`);
        } else {
            batchInfo.status = 'processing';
        }

        // Save updated info
        if (this.redis) {
            await this.redis.setex(
                `${BATCH_PREFIX}${parentJobId}`,
                BATCH_TTL,
                JSON.stringify(batchInfo)
            );
        } else {
            this.inMemoryStore.set(parentJobId, batchInfo);
        }

        return batchInfo;
    }

    /**
     * Mark a batch as failed
     */
    async onBatchFailed(parentJobId: string, batchId: string, error: string): Promise<BatchInfo | null> {
        const batchInfo = await this.getBatchJob(parentJobId);
        if (!batchInfo) return null;

        batchInfo.failedBatches++;

        if (batchInfo.completedBatches + batchInfo.failedBatches >= batchInfo.totalBatches) {
            batchInfo.status = 'failed';
        }

        if (this.redis) {
            await this.redis.setex(
                `${BATCH_PREFIX}${parentJobId}`,
                BATCH_TTL,
                JSON.stringify(batchInfo)
            );
        } else {
            this.inMemoryStore.set(parentJobId, batchInfo);
        }

        console.error(`[BatchManager] Batch ${batchId} failed for parent ${parentJobId}: ${error}`);
        return batchInfo;
    }

    /**
     * Get aggregated progress for a batch job
     */
    async getProgress(parentJobId: string): Promise<{
        progress: number;
        status: string;
        completedBatches: number;
        totalBatches: number;
        processedEmails: number;
        totalEmails: number;
    } | null> {
        const batchInfo = await this.getBatchJob(parentJobId);
        if (!batchInfo) return null;

        const progress = batchInfo.totalEmails > 0
            ? Math.round((batchInfo.processedEmails / batchInfo.totalEmails) * 100)
            : 0;

        return {
            progress,
            status: batchInfo.status,
            completedBatches: batchInfo.completedBatches,
            totalBatches: batchInfo.totalBatches,
            processedEmails: batchInfo.processedEmails,
            totalEmails: batchInfo.totalEmails
        };
    }

    /**
     * Get final results when batch is complete
     */
    async getResults(parentJobId: string): Promise<any[] | null> {
        const batchInfo = await this.getBatchJob(parentJobId);
        if (!batchInfo || batchInfo.status !== 'completed') return null;
        return batchInfo.results;
    }
}

// Singleton instance
export const batchManager = new BatchManager();
