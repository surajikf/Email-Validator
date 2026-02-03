import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Mail } from "lucide-react";

interface Result {
    email: string;
    status: 'valid' | 'invalid' | 'risky' | 'unknown';
    score: number;
    reason: string;
    suggestion?: string;
    details: {
        mx: boolean;
        smtp: boolean;
        isGmail: boolean;
        isRoleBased: boolean;
        reputation: 'high' | 'medium' | 'low';
    };
}

interface ResultsTableProps {
    results: Result[];
}

type FilterType = 'all' | 'gmail' | 'role' | 'valid' | 'invalid' | 'typos';

export function ResultsTable({ results }: ResultsTableProps) {
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    if (!results || results.length === 0) return null;

    const filteredResults = results.filter(res => {
        if (activeFilter === 'gmail') return res.details.isGmail;
        if (activeFilter === 'role') return res.details.isRoleBased;
        if (activeFilter === 'valid') return res.status === 'valid';
        if (activeFilter === 'invalid') return res.status === 'invalid';
        if (activeFilter === 'typos') return !!res.suggestion;
        return true;
    });

    // Limit display to first 1000 for performance
    const displayResults = filteredResults.slice(0, 1000);

    const FilterBtn = ({ type, label }: { type: FilterType, label: string }) => (
        <button
            onClick={() => setActiveFilter(type)}
            className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                activeFilter === type
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
            )}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">Results Explorer</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Showing {displayResults.length} of {filteredResults.length} matches</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <FilterBtn type="all" label="All" />
                    <FilterBtn type="gmail" label="Gmail" />
                    <FilterBtn type="role" label="Role Based" />
                    <FilterBtn type="typos" label="Typos" />
                    <FilterBtn type="valid" label="Valid" />
                    <FilterBtn type="invalid" label="Invalid" />
                </div>
            </div>

            <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-600">Email</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-center">Flags</th>
                            <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-center">Reputation</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-center">DNS</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-center">Mailbox</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-center">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayResults.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3 font-medium text-slate-700">
                                    <div className="flex flex-col">
                                        <span>{row.email}</span>
                                        {row.suggestion ? (
                                            <span className="text-[10px] text-amber-600 font-bold">Did you mean: {row.suggestion}?</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-normal truncate max-w-[200px]">{row.reason || ''}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex justify-center gap-1.5">
                                        {row.details.isGmail && (
                                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100 uppercase" title="Gmail User">G</span>
                                        )}
                                        {row.details.isRoleBased && (
                                            <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-100 uppercase" title="Role Based Address">R</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <StatusBadge status={row.status} />
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <ReputationBadge reputation={row.details.reputation} />
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {row.details.mx ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {row.details.smtp ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <ScoreBadge score={row.score} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ReputationBadge({ reputation }: { reputation: 'high' | 'medium' | 'low' }) {
    const styles: any = {
        high: "bg-green-100 text-green-700",
        medium: "bg-yellow-100 text-yellow-700",
        low: "bg-red-100 text-red-700"
    };
    return (
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", styles[reputation])}>
            {reputation}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        valid: "bg-green-100 text-green-700",
        invalid: "bg-red-100 text-red-700",
        risky: "bg-yellow-100 text-yellow-700",
        unknown: "bg-slate-100 text-slate-600"
    };

    const icons: any = {
        valid: CheckCircle,
        invalid: XCircle,
        risky: AlertTriangle,
        unknown: AlertTriangle
    };

    const Icon = icons[status] || AlertTriangle;

    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase", styles[status] || styles.unknown)}>
            <Icon className="w-3.5 h-3.5" />
            {status}
        </span>
    );
}

function ScoreBadge({ score }: { score: number }) {
    let color = "text-slate-600 bg-slate-100";
    if (score >= 80) color = "text-green-700 bg-green-100";
    else if (score >= 50) color = "text-yellow-700 bg-yellow-100";
    else if (score > 0) color = "text-red-700 bg-red-100";

    return (
        <span className={cn("px-2 py-0.5 rounded font-bold text-xs", color)}>
            {score || 0}
        </span>
    );
}
