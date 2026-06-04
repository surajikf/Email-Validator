'use client';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    Clock, CheckCircle, XCircle, AlertTriangle, Mail, Download,
    RefreshCw, Search, Filter, ChevronDown, ChevronUp,
    TrendingUp, Zap, BarChart3, Calendar, Hash, Trash2,
    ArrowUpRight, Shield, FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Job {
    id: string;
    date: string;
    status: 'completed' | 'failed' | 'active' | 'waiting';
    total: number;
    validCount: number;
    invalidCount?: number;
    riskyCount?: number;
    duplicatesRemoved?: number;
    processingTime?: number;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, gradient, sub }: {
    label: string; value: string | number; icon: React.ReactNode;
    gradient: string; sub?: string;
}) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg",
            "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
            gradient
        )}>
            <div className="absolute -right-4 -top-4 opacity-20 scale-150">{icon}</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">{label}</p>
            <p className="text-3xl font-black tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
        </div>
    );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 text-right font-semibold text-slate-500">{pct}%</span>
        </div>
    );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
        completed: {
            cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            label: 'Completed'
        },
        failed: {
            cls: 'bg-red-50 text-red-700 border border-red-200',
            icon: <XCircle className="w-3.5 h-3.5" />,
            label: 'Failed'
        },
        active: {
            cls: 'bg-blue-50 text-blue-700 border border-blue-200',
            icon: <Zap className="w-3.5 h-3.5 animate-pulse" />,
            label: 'Processing'
        },
        waiting: {
            cls: 'bg-amber-50 text-amber-700 border border-amber-200',
            icon: <Clock className="w-3.5 h-3.5" />,
            label: 'Waiting'
        },
    };
    const cfg = map[status] ?? map.waiting;
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", cfg.cls)}>
            {cfg.icon}{cfg.label}
        </span>
    );
}

// ─── Job Row ──────────────────────────────────────────────────────────────────
function JobRow({ job, index }: { job: Job; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const validPct = job.total > 0 ? Math.round((job.validCount / job.total) * 100) : 0;
    const invalid = job.invalidCount ?? (job.total - job.validCount - (job.riskyCount ?? 0));
    const risky = job.riskyCount ?? 0;
    const healthColor = validPct >= 80 ? 'text-emerald-600' : validPct >= 50 ? 'text-amber-600' : 'text-red-600';
    const ringColor = validPct >= 80 ? 'ring-emerald-400' : validPct >= 50 ? 'ring-amber-400' : 'ring-red-400';

    return (
        <div
            className={cn(
                "group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
                "transition-all duration-300 hover:shadow-md hover:border-indigo-100",
                "animate-in fade-in slide-in-from-bottom-2"
            )}
            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
        >
            {/* Main Row */}
            <div
                className="flex items-center gap-4 p-5 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Health Ring */}
                <div className={cn(
                    "shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center",
                    "ring-2 ring-offset-2 bg-white font-black text-lg transition-all duration-300",
                    ringColor, healthColor
                )}>
                    {validPct}
                    <span className="text-[8px] font-bold text-slate-400 -mt-1 uppercase">%ok</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-800 text-sm truncate">
                            Job #{job.id?.slice(-6) ?? '——'}
                        </span>
                        <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(job.date), 'MMM dd, yyyy · HH:mm')}
                        </span>
                        <span className="text-slate-200">|</span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(job.date), { addSuffix: true })}
                        </span>
                    </div>
                </div>

                {/* Stats Pills */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                    <StatPill value={job.total} label="Total" color="bg-slate-100 text-slate-700" />
                    <StatPill value={job.validCount} label="Valid" color="bg-emerald-50 text-emerald-700" />
                    <StatPill value={invalid} label="Invalid" color="bg-red-50 text-red-700" />
                    {risky > 0 && <StatPill value={risky} label="Risky" color="bg-amber-50 text-amber-700" />}
                </div>

                {/* Chevron */}
                <div className={cn(
                    "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center",
                    "bg-slate-50 text-slate-400 transition-all duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                )}>
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            {/* Expanded Detail Panel */}
            {expanded && (
                <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/30 px-5 py-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <DetailStat icon={<Mail className="w-4 h-4 text-slate-500" />} label="Total Emails" value={job.total} />
                        <DetailStat icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} label="Valid" value={job.validCount} />
                        <DetailStat icon={<XCircle className="w-4 h-4 text-red-500" />} label="Invalid" value={invalid} />
                        <DetailStat icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="Risky" value={risky} />
                    </div>

                    <div className="space-y-2 mb-5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Distribution</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-14 text-right text-emerald-600 font-semibold">Valid</span>
                            <MiniBar value={job.validCount} total={job.total} color="bg-emerald-400" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-14 text-right text-red-600 font-semibold">Invalid</span>
                            <MiniBar value={invalid} total={job.total} color="bg-red-400" />
                        </div>
                        {risky > 0 && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-14 text-right text-amber-600 font-semibold">Risky</span>
                                <MiniBar value={risky} total={job.total} color="bg-amber-400" />
                            </div>
                        )}
                    </div>

                    {(job.duplicatesRemoved ?? 0) > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/70 rounded-xl px-4 py-2.5 border border-slate-100">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            <span><strong className="text-indigo-600">{job.duplicatesRemoved}</strong> duplicate emails removed before processing</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
    return (
        <div className={cn("flex flex-col items-center px-3 py-1.5 rounded-xl text-center", color)}>
            <span className="text-sm font-black leading-none">{value.toLocaleString()}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
        </div>
    );
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">{icon}</div>
            <div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-lg font-black text-slate-800 leading-none">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function JobSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 rounded-2xl bg-slate-100" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
            <div className="hidden md:flex gap-2">
                {[...Array(3)].map((_, i) => <div key={i} className="w-16 h-10 bg-slate-100 rounded-xl" />)}
            </div>
            <div className="w-8 h-8 bg-slate-100 rounded-xl" />
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-inner">
                    <FileCheck className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-xs font-black">0</span>
                </div>
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">No Validation Runs Yet</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                Upload a CSV or paste email addresses on the <strong>Validate</strong> tab to get started. Your runs will appear here.
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const res = await axios.get('/api/history');
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ── Aggregated Stats ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = jobs.reduce((s, j) => s + (j.total || 0), 0);
        const valid = jobs.reduce((s, j) => s + (j.validCount || 0), 0);
        const runs = jobs.length;
        const completed = jobs.filter(j => j.status === 'completed').length;
        return { total, valid, runs, completed };
    }, [jobs]);

    // ── Filtered Jobs ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return jobs.filter(j => {
            const matchSearch = search === '' || j.id?.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || j.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [jobs, search, statusFilter]);

    // ── Export CSV ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const rows = [
            ['Job ID', 'Date', 'Status', 'Total', 'Valid', 'Invalid'],
            ...jobs.map(j => [
                j.id,
                format(new Date(j.date), 'yyyy-MM-dd HH:mm'),
                j.status,
                j.total,
                j.validCount,
                (j.invalidCount ?? j.total - j.validCount - (j.riskyCount ?? 0))
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Clock className="w-5 h-5 text-white" />
                        </span>
                        Validation History
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 ml-[52px]">
                        {stats.runs} job{stats.runs !== 1 ? 's' : ''} · {stats.total.toLocaleString()} emails processed
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCSV}
                        disabled={jobs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-40 shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        onClick={() => fetchHistory(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Stats Bar ── */}
            {!loading && jobs.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Runs" value={stats.runs}
                        icon={<BarChart3 className="w-12 h-12" />}
                        gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
                        sub={`${stats.completed} completed`}
                    />
                    <StatCard
                        label="Emails Processed" value={stats.total}
                        icon={<Mail className="w-12 h-12" />}
                        gradient="bg-gradient-to-br from-violet-500 to-purple-700"
                    />
                    <StatCard
                        label="Valid Emails" value={stats.valid}
                        icon={<CheckCircle className="w-12 h-12" />}
                        gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                        sub={stats.total > 0 ? `${Math.round((stats.valid / stats.total) * 100)}% clean rate` : undefined}
                    />
                    <StatCard
                        label="Success Rate"
                        value={stats.runs > 0 ? `${Math.round((stats.completed / stats.runs) * 100)}%` : '—'}
                        icon={<TrendingUp className="w-12 h-12" />}
                        gradient="bg-gradient-to-br from-rose-500 to-pink-600"
                        sub={`${stats.completed}/${stats.runs} completed`}
                    />
                </div>
            )}

            {/* ── Search & Filter Bar ── */}
            {!loading && jobs.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by Job ID…"
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 shadow-sm transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="active">Processing</option>
                            <option value="waiting">Waiting</option>
                        </select>
                    </div>
                </div>
            )}

            {/* ── Results Count ── */}
            {!loading && jobs.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                        Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{jobs.length}</strong> jobs
                    </span>
                    {(search || statusFilter !== 'all') && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter('all'); }}
                            className="text-indigo-500 font-semibold hover:text-indigo-700 transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            {/* ── Job List ── */}
            <div className="space-y-3">
                {loading ? (
                    [...Array(5)].map((_, i) => <JobSkeleton key={i} />)
                ) : filtered.length === 0 ? (
                    jobs.length === 0 ? <EmptyState /> : (
                        <div className="text-center py-12 text-slate-400">
                            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                            <p className="font-semibold">No jobs match your filters</p>
                            <p className="text-xs mt-1">Try adjusting your search or status filter</p>
                        </div>
                    )
                ) : (
                    filtered.map((job, i) => <JobRow key={job.id} job={job} index={i} />)
                )}
            </div>

            {/* ── Footer tip ── */}
            {!loading && jobs.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-indigo-700">
                    <ArrowUpRight className="w-4 h-4 mt-0.5 shrink-0 text-indigo-400" />
                    <p>
                        <strong>Tip:</strong> Click any job card to expand detailed stats including distribution breakdown and duplicate removal info.
                        Use <strong>Export CSV</strong> to download your full history.
                    </p>
                </div>
            )}
        </div>
    );
}
