import { EventEmitter } from 'events';

export class InMemoryQueue extends EventEmitter {
    private jobs: Map<string, any>;
    private processor: Function | null;
    private name: string;

    constructor(name: string) {
        super();
        this.name = name;
        this.jobs = new Map();
        this.processor = null;
        console.log(`[InMemoryQueue] Initialized queue: ${name}`);
    }

    async add(name: string, data: any) {
        // Ensure jobId exists
        const id = data.jobId || `job-${Date.now()}`;

        const job = {
            id,
            data,
            progress: 0,
            returnvalue: null,
            state: 'waiting',
            updateProgress: async (value: number) => {
                job.progress = value;
            },
            getState: async () => job.state
        };

        this.jobs.set(id, job);

        // Trigger processing next tick
        setTimeout(() => this.processNext(job), 100);

        return job;
    }

    async getJob(id: string) {
        return this.jobs.get(id) || null;
    }

    process(handler: Function) {
        this.processor = handler;
    }

    private async processNext(job: any) {
        if (!this.processor) return;

        console.log(`[InMemoryQueue] Processing job ${job.id}. Data keys: ${Object.keys(job.data)}`);
        try {
            job.state = 'active';
            const result = await this.processor(job);
            console.log(`[InMemoryQueue] Job ${job.id} produced result length: ${Array.isArray(result) ? result.length : typeof result}`);
            job.state = 'completed';
            job.returnvalue = result;
            this.emit('completed', job);
        } catch (err: any) {
            job.state = 'failed';
            this.emit('failed', job, err);
            console.error(`[InMemoryQueue] Job ${job.id} failed: `, err);
        }
    }

    async getRecentJobs() {
        // Return latest 20 jobs sorted by creation
        return Array.from(this.jobs.values())
            .map(job => ({
                id: job.id,
                date: parseInt(job.id.split('-')[1]) || Date.now(),
                status: job.state,
                total: job.data.emails ? job.data.emails.length : 0,
                // simplified result preview
                validCount: job.returnvalue ? job.returnvalue.filter((r: any) => r.status === 'valid').length : 0
            }))
            .sort((a, b) => b.date - a.date)
            .slice(0, 20);
    }
}
