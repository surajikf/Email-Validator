import { StatsCard } from '@/components/StatsCard';
import { Mail, CheckCircle, Send, Clock } from 'lucide-react';

interface SummaryStats {
    total_validated: number;
    total_valid: number;
    total_sent: number;
    total_pending: number;
}

interface StatsGridProps {
    stats: SummaryStats | null;
}

export function StatsGrid({ stats }: StatsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
                title="Total Validated"
                value={stats?.total_validated || 0}
                icon={Mail}
                description="All time processed"
                color="blue"
            />
            <StatsCard
                title="Valid Emails"
                value={stats?.total_valid || 0}
                icon={CheckCircle}
                description="Ready for outreach"
                color="green"
            />
            <StatsCard
                title="Sent"
                value={stats?.total_sent || 0}
                icon={Send}
                description="Successfully dispatched"
                color="purple"
            />
            <StatsCard
                title="Pending"
                value={stats?.total_pending || 0}
                icon={Clock}
                description="Waiting in queue"
                color="orange"
            />
        </div>
    );
}
