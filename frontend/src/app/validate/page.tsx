'use client';

import { FileUpload } from '@/components/FileUpload';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronDown, FileJson, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface ValidationResult {
    email: string;
    status: 'valid' | 'invalid' | 'risky' | 'unknown';
    score: number;
    reason?: string;
    first_name?: string;
    company_name?: string;
    details: {
        isDisposable: boolean;
        isCatchAll: boolean;
        isRoleBased: boolean;
        first_name?: string;
        company_name?: string;
    };
}

export default function ValidatePage() {
    const router = useRouter();
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ValidationResult[]>([]);
    const [duplicatesCount, setDuplicatesCount] = useState(0);

    useEffect(() => {
        if (!jobId || status === 'completed' || status === 'failed') return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`http://localhost:3001/api/dashboard/status/${jobId}`);
                const { state, progress: jobProgress, result, duplicatesRemoved } = res.data;

                setProgress(jobProgress || 0);
                if (duplicatesRemoved) setDuplicatesCount(duplicatesRemoved);

                if (state === 'completed') {
                    setStatus('completed');
                    setResults(result || []);
                    toast.success('Validation completed!');
                    clearInterval(interval);
                } else if (state === 'failed') {
                    setStatus('failed');
                    toast.error('Validation job failed.');
                    clearInterval(interval);
                }
            } catch (err) {
                console.error('Polling error', err);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [jobId, status]);

    const handleUploadStart = (id: string, count: number, duplicatesRemoved?: number) => {
        setJobId(id);
        setStatus('processing');
        setProgress(0);
        setDuplicatesCount(duplicatesRemoved || 0);
        toast.info(`Processing...`);
    };

    const handleError = (msg: string) => {
        toast.error(msg);
    };

    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        const closeMenu = () => setShowExportMenu(false);
        if (showExportMenu) window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [showExportMenu]);

    const downloadResults = (format: 'csv' | 'xlsx') => {
        const validEmails = results.filter(r => r.status === 'valid');
        if (validEmails.length === 0) {
            toast.error('No valid emails to download.');
            return;
        }

        const data = validEmails.map(r => ({
            Email: r.email,
            'First Name': r.first_name || '',
            'Company Name': r.company_name || '',
            Score: r.score || '',
            Status: r.status
        }));

        const filename = `valid_emails_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') {
            const csvContent = [
                Object.keys(data[0]).join(','),
                ...data.map(row => Object.values(row).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Valid Emails");
            XLSX.writeFile(workbook, `${filename}.xlsx`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Toaster position="top-right" />

            <header className="px-6 py-4 flex items-center bg-white border-b border-slate-200 justify-between">
                <Link href="/">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Button>
                </Link>
                {status === 'completed' && (
                    <div className="flex gap-2 items-center">
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <Button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="bg-green-600 hover:bg-green-700 gap-2"
                                disabled={results.filter(r => r.status === 'valid').length === 0}
                            >
                                Download Valid Emails <ChevronDown className="w-4 h-4" />
                            </Button>

                            {showExportMenu && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <button
                                        onClick={() => downloadResults('csv')}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <FileJson className="w-4 h-4 text-green-600" /> Download as CSV
                                    </button>
                                    <button
                                        onClick={() => downloadResults('xlsx')}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" /> Download as Excel
                                    </button>
                                </div>
                            )}
                        </div>

                        <Link href="/dashboard">
                            <Button variant="outline">Go to Dashboard</Button>
                        </Link>
                    </div>
                )}
            </header>

            <main className="flex-1 flex flex-col items-center p-6">

                {status === 'idle' && (
                    <>
                        <div className="max-w-xl w-full text-center mb-8 mt-10">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload Your List</h1>
                            <p className="text-slate-500">Supported formats: CSV, Excel (.xlsx)</p>
                        </div>
                        <FileUpload onUploadStart={handleUploadStart} onError={handleError} />
                    </>
                )}

                {status === 'processing' && (
                    <div className="text-center mt-20">
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800">Validating Emails...</h2>
                        <p className="text-slate-500 mt-2">{progress}% Completed</p>
                        <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 mx-auto overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {status === 'completed' && (
                    <div className="w-full max-w-5xl space-y-8">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Processed</div>
                                <div className="text-2xl font-bold text-slate-900">{results.length + duplicatesCount}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Valid Emails</div>
                                <div className="text-2xl font-bold text-slate-900">{results.filter(r => r.status === 'valid').length}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Invalid / Risky</div>
                                <div className="text-2xl font-bold text-slate-900">{results.filter(r => r.status !== 'valid').length}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-amber-100 bg-amber-50">
                                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Duplicates Removed</div>
                                <div className="text-2xl font-bold text-slate-900">{duplicatesCount}</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800">Results</h2>
                            <Button onClick={() => window.location.reload()}>Validate Another File</Button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Score</th>
                                        <th className="px-6 py-3">Metadata</th>
                                        <th className="px-6 py-3">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.map((r, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-3 font-medium text-slate-700">{r.email}</td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${r.status === 'valid' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    r.status === 'invalid' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    }`}>
                                                    {r.status === 'valid' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                    {r.status === 'invalid' && <XCircle className="w-3 h-3 mr-1" />}
                                                    {r.status === 'risky' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                    {r.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600">{r.score?.toFixed(1) || '0.0'}</td>
                                            <td className="px-6 py-3 text-slate-500 text-xs">
                                                {r.first_name && <div>FN: {r.first_name}</div>}
                                                {r.company_name && <div>CN: {r.company_name}</div>}
                                            </td>
                                            <td className="px-6 py-3 text-xs text-slate-400">
                                                {r.details.isDisposable && <span className="text-red-500 mr-2">Disposable</span>}
                                                {r.details.isRoleBased && <span className="text-orange-500 mr-2">Role</span>}
                                                {r.details.isCatchAll && <span className="text-yellow-500">Catch-all</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {results.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">All Done!</h3>
                                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                                        No new emails were found to validate. {duplicatesCount > 0 ? `${duplicatesCount} duplicate emails were identified and skipped.` : 'Your list appears empty.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
