'use client';
import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { PasteInput } from '@/components/PasteInput';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { ResultsTable } from '@/components/ResultsTable';
import { Steps } from '@/components/Steps';
import { Download, CheckCircle, XCircle, AlertTriangle, Loader2, Play, ChevronLeft, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const WIZARD_STEPS = ['Input Data', 'Processing', 'Results'];

interface ValidationStats {
    total: number;
    processed: number;
    valid: number;
    invalid: number;
    risky: number;
}

import { useValidation } from '@/context/ValidationContext';

export default function Dashboard() {
    const {
        currentStep, setCurrentStep,
        activeInputTab, setActiveInputTab,
        jobId, status, stats, duplicatesRemoved, results,
        handleStart, handleReset, downloadReport
    } = useValidation();

    const progress = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

    return (
        <div className="w-full max-w-[1400px] mx-auto py-8 px-4 sm:px-6">
            <Steps steps={WIZARD_STEPS} currentStep={currentStep} />

            <AnimatePresence mode='wait'>
                {/* STEP 1: INPUT */}
                {currentStep === 0 && (
                    <motion.div
                        key="step-input"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                    >
                        <div className="flex border-b border-slate-200">
                            <button onClick={() => setActiveInputTab('upload')} className={cn("flex-1 py-4 text-sm font-medium transition-colors cursor-pointer", activeInputTab === 'upload' ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" : "text-slate-500 hover:bg-slate-50")}>
                                Upload File
                            </button>
                            <button onClick={() => setActiveInputTab('paste')} className={cn("flex-1 py-4 text-sm font-medium transition-colors cursor-pointer", activeInputTab === 'paste' ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50" : "text-slate-500 hover:bg-slate-50")}>
                                Paste Text
                            </button>
                        </div>
                        <div className="p-10">
                            <h2 className="text-2xl font-bold text-center mb-2 text-slate-800">Add Your Emails</h2>
                            <p className="text-center text-slate-500 mb-8">We'll clean your list in seconds.</p>
                            {activeInputTab === 'upload' ? (
                                <FileUpload onUploadStart={handleStart} onError={msg => toast.error(msg)} />
                            ) : (
                                <PasteInput onUploadStart={handleStart} onError={msg => toast.error(msg)} />
                            )}
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: PROCESSING */}
                {currentStep === 1 && (
                    <motion.div
                        key="step-process"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-10 text-center"
                    >
                        <div className="mb-8">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Validating {stats.total} Emails</h2>
                            <p className="text-slate-500 mt-2">Checking syntax, domains, and mailboxes...</p>
                        </div>

                        <ProgressBar progress={progress} />

                        <div className="grid grid-cols-4 gap-4 mt-10 max-w-2xl mx-auto">
                            <StatBox label="Valid" value={stats.valid} className="bg-green-50 text-green-700" />
                            <StatBox label="Invalid" value={stats.invalid} className="bg-red-50 text-red-700" />
                            <StatBox label="Risky" value={stats.risky} className="bg-yellow-50 text-yellow-700" />
                            <StatBox label="Remaining" value={stats.total - stats.processed} className="bg-slate-50 text-slate-600" />
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: RESULTS */}
                {currentStep === 2 && (
                    <motion.div
                        key="step-results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {duplicatesRemoved > 0 && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-indigo-700 text-sm">
                                <CheckCircle className="w-5 h-5 text-indigo-500" />
                                <span>We found and removed <strong>{duplicatesRemoved} duplicate</strong> email addresses from your list automatically.</span>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 leading-tight">Validation Complete!</h2>
                                    <p className="text-xs text-slate-500">Here's the breakdown of your list.</p>
                                </div>
                                <Button variant="outline" size="sm" className="ml-auto cursor-pointer" onClick={handleReset}>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Start Over
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <ResultCard title="Valid Emails" count={stats.valid} color="green" percent={stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : "0.0"} />
                                <ResultCard title="Invalid Emails" count={stats.invalid} color="red" percent={stats.total > 0 ? ((stats.invalid / stats.total) * 100).toFixed(1) : "0.0"} />
                                <ResultCard title="Risky/Unknown" count={stats.risky} color="yellow" percent={stats.total > 0 ? ((stats.risky / stats.total) * 100).toFixed(1) : "0.0"} />
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Download Reports</div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => downloadReport('valid')} className="bg-green-600 hover:bg-green-700 text-white cursor-pointer px-4">
                                        <Download className="w-3.5 h-3.5 mr-1.5" /> Valid Only
                                    </Button>
                                    <Button size="sm" onClick={() => downloadReport('invalid')} variant="destructive" className="bg-red-500 hover:bg-red-600 cursor-pointer px-4">
                                        Invalid Only
                                    </Button>
                                    <Button size="sm" onClick={() => downloadReport('verified_domain')} variant="outline" className="cursor-pointer px-4">
                                        Verified + Domain
                                    </Button>
                                    <Button size="sm" variant="outline" className="cursor-pointer px-4" onClick={() => downloadReport('full')}>
                                        Full CSV
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <ResultsTable results={results} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

function StatBox({ label, value, className }: any) {
    return (
        <div className={cn("p-4 rounded-xl text-center", className)}>
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs uppercase font-semibold opacity-70">{label}</div>
        </div>
    )
}

function ResultCard({ title, count, color, percent }: any) {
    const colors: any = {
        green: "bg-green-50 text-green-700 border-green-100",
        red: "bg-red-50 text-red-700 border-red-100",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-100"
    };

    return (
        <div className={cn("p-4 rounded-xl border flex flex-col", colors[color])}>
            <div className="text-xs font-bold opacity-80 mb-1 uppercase tracking-tight">{title}</div>
            <div className="text-3xl font-bold mb-1">{count}</div>
            <div className="text-[11px] font-semibold bg-white/60 w-fit px-1.5 py-0.5 rounded">
                {percent}% of total
            </div>
        </div>
    )
}
