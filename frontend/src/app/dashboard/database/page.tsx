'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Database,
    Search,
    Filter,
    Download,
    Mail,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    ArrowUpDown,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton, TableRowSkeleton } from '@/components/ui/skeleton';

interface DBRecord {
    // Removed as DB uses email as PK
    email: string;
    status: 'valid' | 'invalid' | 'risky' | 'unknown';
    score: number;
    reason: string;
    validated_at: string;
    is_reactivated?: boolean;
    last_revalidated_at?: string;
}

export default function DatabasePage() {
    const [records, setRecords] = useState<DBRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'risky'>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        fetchData();
    }, [currentPage, statusFilter, debouncedSearch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3001/api/dashboard/database', {
                params: {
                    page: currentPage,
                    limit: PAGE_SIZE,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: debouncedSearch || undefined
                }
            });
            setRecords(res.data.records);
            setTotalCount(res.data.totalCount);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const revalidateAllInvalid = async () => {
        if (!confirm('This will queue all current invalid emails for re-validation. Proceed?')) return;
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/revalidate-invalid');
            alert(res.data.message || 'Re-validation started');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to start re-validation');
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const exportToCSV = () => {
        if (!records.length) return;
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Email,Status,Score,Reason,Validated At\n"
            + records.map(r => `${r.email},${r.status},${r.score},${r.reason || ''},${r.validated_at}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `email_database_page_${currentPage}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Database className="w-8 h-8 text-indigo-600" />
                        Email Database
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {debouncedSearch ? 'Search results for' : 'Viewing'} {totalCount > 0 ? `${(currentPage - 1) * PAGE_SIZE + 1} - ${Math.min(currentPage * PAGE_SIZE, totalCount)} of` : ''} {totalCount} validated emails.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => { setCurrentPage(1); fetchData(); }} disabled={loading} className="gap-2 cursor-pointer border-slate-200">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={revalidateAllInvalid} disabled={loading} className="gap-2 cursor-pointer border-amber-200 text-amber-700 hover:bg-amber-50">
                        <RefreshCw className="w-4 h-4" />
                        Re-validate Invalid
                    </Button>
                    <Button onClick={exportToCSV} disabled={loading || !records.length} className="gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700">
                        <Download className="w-4 h-4" />
                        Export Current Page
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Global search in database..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 mr-2" />
                    {(['all', 'valid', 'invalid', 'risky'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all cursor-pointer",
                                statusFilter === f
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Score</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Validated At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRowSkeleton key={i} cols={5} />
                                ))
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                                                <Database className="w-10 h-10 text-slate-300" />
                                            </div>
                                            <p className="text-xl font-bold text-slate-800">No records found</p>
                                            <p className="text-sm text-slate-500 mt-1 max-w-[250px] mx-auto">
                                                Your search didn't match any validated emails in our database.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.email} className="hover:bg-slate-50/50 transition-colors group text-sm">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                    {r.email.substring(0, 1)}
                                                </div>
                                                {r.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <StatusBadge status={r.status} />
                                                {r.is_reactivated && (
                                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-0.5">
                                                        <CheckCircle className="w-3 h-3" />
                                                        REACTIVATED
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "font-bold",
                                                r.score >= 80 ? "text-green-600" : r.score >= 50 ? "text-amber-500" : "text-red-500"
                                            )}>
                                                {r.score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{r.reason || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                            {format(new Date(r.validated_at), 'MMM dd, yyyy HH:mm')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Page <span className="font-medium text-slate-900">{currentPage}</span> of <span className="font-medium text-slate-900">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1 || loading}
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                className="cursor-pointer"
                            >
                                Previous
                            </Button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    // Simple logic to show pages around current
                                    let pageNum = currentPage;
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    if (pageNum < 1 || pageNum > totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8 rounded-md text-sm font-medium transition-all cursor-pointer",
                                                currentPage === pageNum
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === totalPages || loading}
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                className="cursor-pointer"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: DBRecord['status'] }) {
    const config = {
        valid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
        invalid: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
        risky: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
        unknown: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Mail }
    };

    const { bg, text, icon: Icon } = config[status];

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
            bg, text
        )}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}
