'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, FileText, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function HistoryPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:3001/api/history');
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" /> Validation History
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Loading history...</div>
                ) : jobs.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No validation history found.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-600">Date/Time</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Total Emails</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Valid Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-600">
                                        {format(new Date(job.date), 'MMM dd, yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={job.status} />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {job.total}
                                    </td>
                                    <td className="px-6 py-4 text-green-600 font-medium">
                                        {job.validCount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === 'completed';
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
            isCompleted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
            {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {status}
        </span>
    );
}
