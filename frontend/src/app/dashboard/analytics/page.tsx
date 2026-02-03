'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    BarChart3,
    PieChart as PieIcon,
    TrendingUp,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b']; // Valid, Invalid, Risky

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:3001/api/analytics');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <CardSkeleton /> <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </div>
        );
    }

    const totals = data?.totals || { valid: 0, invalid: 0, risky: 0, total: 0 };
    const pieData = [
        { name: 'Valid', value: totals.valid },
        { name: 'Invalid', value: totals.invalid },
        { name: 'Risky', value: totals.risky },
    ];

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-indigo-600" />
                        Platform Analytics
                    </h1>
                    <p className="text-slate-500 mt-1">Global insights into your email validation patterns.</p>
                </div>
                <Button variant="outline" onClick={fetchAnalytics} disabled={loading} className="gap-2 cursor-pointer shadow-sm">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    Update Stats
                </Button>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnalyticCard title="Total Cleaned" value={totals.total} icon={<TrendingUp className="text-indigo-600" />} color="indigo" />
                <AnalyticCard title="Valid Base" value={totals.valid} icon={<CheckCircle className="text-green-600" />} color="green" />
                <AnalyticCard title="Bounces Prevented" value={totals.invalid} icon={<XCircle className="text-red-600" />} color="red" />
                <AnalyticCard title="Risky Captures" value={totals.risky} icon={<AlertTriangle className="text-amber-600" />} color="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Validation Trends</h2>
                            <p className="text-sm text-slate-500">Daily breakdown of scanning activity (last 7 days)</p>
                        </div>
                        <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Valid</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Invalid</div>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.trend || []}>
                                <defs>
                                    <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="valid" stroke="#22c55e" fillOpacity={1} fill="url(#colorValid)" strokeWidth={3} />
                                <Area type="monotone" dataKey="invalid" stroke="#ef4444" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Status Distribution</h2>
                    <p className="text-sm text-slate-500 mb-8">Composition of your global database</p>
                    <div className="h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-900">{Math.round((totals.valid / totals.total) * 100) || 0}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Health</span>
                        </div>
                    </div>
                    <div className="space-y-3 mt-4">
                        {pieData.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    <span className="text-slate-600 font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-900">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pro Tip Alert */}
            <div className="bg-indigo-600 rounded-2xl p-6 text-white flex items-center gap-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-indigo-200" />
                        <span className="font-bold uppercase tracking-wider text-xs text-indigo-200">Pro Insight</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">Optimize Your Bounce Rate</h3>
                    <p className="text-indigo-100/80 max-w-2xl text-sm leading-relaxed">
                        Based on your trends, scanning during peak business hours (Tuesday–Thursday) provides the most accurate SMTP handshake results. High "Risky" counts often indicate grey-listed servers.
                    </p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 duration-500">
                    <BarChart3 className="w-48 h-48" />
                </div>
            </div>
        </div>
    );
}

function AnalyticCard({ title, value, icon, color }: any) {
    const bgColor = {
        indigo: 'bg-indigo-50',
        green: 'bg-green-50',
        red: 'bg-red-50',
        amber: 'bg-amber-50'
    }[color as 'indigo' | 'green' | 'red' | 'amber'];

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-inner", bgColor)}>
                {icon}
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{value.toLocaleString()}</div>
        </div>
    );
}
