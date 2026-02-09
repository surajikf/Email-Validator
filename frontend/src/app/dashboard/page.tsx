'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
// import axios from 'axios'; // Removed
import { toast } from 'sonner';

import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { TestEmailCard } from '@/components/dashboard/TestEmailCard';
import { SchedulerSettings } from '@/components/dashboard/SchedulerSettings';

import { SummaryStats, DailyStat } from '@/types/dashboard';
import { api } from '@/lib/api';

export default function DashboardPage() {
    const [stats, setStats] = useState<SummaryStats | null>(null);
    const [trend, setTrend] = useState<DailyStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [summaryRes, dailyRes] = await Promise.all([
                api.get('/api/dashboard/summary'),
                api.get('/api/dashboard/daily')
            ]);
            setStats(summaryRes.data);
            setTrend(dailyRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            Cold Outreach Command Center
                        </h1>
                        <p className="text-slate-500 mt-1">Real-time monitoring of your email campaigns.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchData}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                            <RefreshCcw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <StatsGrid stats={stats} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Daily Stats Chart */}
                    <ActivityChart data={trend} />
                </div>

                {/* Scheduler Configuration */}
                <SchedulerSettings />

                {/* Test Email Configuration */}
                <TestEmailCard />
            </div>
        </div>
    );
}
