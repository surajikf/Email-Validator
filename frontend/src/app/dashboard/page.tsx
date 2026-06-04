'use client';
import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { PasteInput } from '@/components/PasteInput';
import { ProgressBar } from '@/components/ProgressBar';
import { Button } from '@/components/ui/button';
import { ResultsTable } from '@/components/ResultsTable';
import { Steps } from '@/components/Steps';
import { Download, CheckCircle, XCircle, AlertTriangle, Loader2, Play, ChevronLeft, RefreshCw, Upload, FileType, Sparkles } from 'lucide-react';
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
        <div className="w-full max-w-[1200px] mx-auto py-10 px-4 sm:px-6">
            <div className="mb-12">
                <Steps steps={WIZARD_STEPS} currentStep={currentStep} />
            </div>

            <AnimatePresence mode='wait'>
                {/* STEP 1: INPUT */}
                {currentStep === 0 && (
                    <motion.div
                        key="step-input"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="relative max-w-3xl mx-auto"
                    >
                        {/* Decorative Background Glows */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[600px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl -z-10 rounded-full animate-pulse" style={{ animationDuration: '4s' }} />

                        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-indigo-500/10 border border-white overflow-hidden ring-1 ring-slate-900/5">
                            
                            {/* Header Section */}
                            <div className="pt-12 pb-8 px-10 text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-6 shadow-inner">
                                    <Sparkles className="w-8 h-8 text-indigo-600" />
                                </div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
                                    Clean Your Email List
                                </h2>
                                <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                                    Upload a CSV or paste your emails below. We'll automatically remove duplicates, check syntax, and verify delivery.
                                </p>
                            </div>

                            {/* Tab Switcher */}
                            <div className="px-10 pb-6">
                                <div className="flex p-1.5 bg-slate-100/80 rounded-2xl backdrop-blur-sm">
                                    <button 
                                        onClick={() => setActiveInputTab('upload')} 
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold transition-all duration-300",
                                            activeInputTab === 'upload' 
                                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        )}
                                    >
                                        <Upload className="w-4 h-4" /> Upload File
                                    </button>
                                    <button 
                                        onClick={() => setActiveInputTab('paste')} 
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold transition-all duration-300",
                                            activeInputTab === 'paste' 
                                                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" 
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        )}
                                    >
                                        <FileType className="w-4 h-4" /> Paste Text
                                    </button>
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="px-10 pb-12">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeInputTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeInputTab === 'upload' ? (
                                            <FileUpload onUploadStart={handleStart} onError={msg => toast.error(msg)} />
                                        ) : (
                                            <PasteInput onUploadStart={handleStart} onError={msg => toast.error(msg)} />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
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
                        className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-indigo-100/50 p-12 text-center max-w-3xl mx-auto"
                    >
                        <div className="mb-10">
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                <div className="absolute inset-2 bg-indigo-100 rounded-full flex items-center justify-center shadow-inner">
                                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                </div>
                                <div className="absolute inset-0 rounded-full border-[6px] border-indigo-50 border-t-indigo-500 animate-spin" style={{ animationDuration: '1.5s' }} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Validating {stats.total.toLocaleString()} Emails</h2>
                            <p className="text-lg text-slate-500 mt-3 max-w-md mx-auto">Running deep syntax checks, verifying domains, and pinging mailboxes...</p>
                        </div>

                        <div className="mb-12 max-w-xl mx-auto">
                            <ProgressBar progress={progress} />
                            <p className="text-sm font-bold text-indigo-600 mt-3">{progress}% Complete</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                            <StatBox label="Valid" value={stats.valid} className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50" />
                            <StatBox label="Invalid" value={stats.invalid} className="bg-rose-50 text-rose-700 ring-1 ring-rose-200/50" />
                            <StatBox label="Risky" value={stats.risky} className="bg-amber-50 text-amber-700 ring-1 ring-amber-200/50" />
                            <StatBox label="Remaining" value={stats.total - stats.processed} className="bg-slate-50 text-slate-600 ring-1 ring-slate-200/50" />
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: RESULTS */}
                {currentStep === 2 && (
                    <motion.div
                        key="step-results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 max-w-5xl mx-auto"
                    >
                        {duplicatesRemoved > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-4 text-indigo-800 shadow-sm"
                            >
                                <div className="p-2 bg-indigo-100 rounded-full">
                                    <CheckCircle className="w-6 h-6 text-indigo-600" />
                                </div>
                                <span className="text-lg">We found and removed <strong className="font-black">{duplicatesRemoved} duplicate</strong> email addresses from your list automatically.</span>
                            </motion.div>
                        )}

                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Validation Complete!</h2>
                                        <p className="text-slate-500 mt-1 font-medium">Here's the detailed breakdown of your list.</p>
                                    </div>
                                </div>
                                <Button size="lg" className="shrink-0 rounded-xl font-bold px-6 shadow-md cursor-pointer" onClick={handleReset}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Start Over
                                </Button>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <ResultCard title="Valid Emails" count={stats.valid} color="green" percent={stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : "0.0"} />
                                    <ResultCard title="Invalid Emails" count={stats.invalid} color="red" percent={stats.total > 0 ? ((stats.invalid / stats.total) * 100).toFixed(1) : "0.0"} />
                                    <ResultCard title="Risky/Unknown" count={stats.risky} color="yellow" percent={stats.total > 0 ? ((stats.risky / stats.total) * 100).toFixed(1) : "0.0"} />
                                </div>

                                <div className="bg-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-slate-300 font-bold tracking-wide flex items-center gap-2">
                                        <Download className="w-5 h-5 text-indigo-400" /> Download Reports
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Button onClick={() => downloadReport('valid')} className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer rounded-xl font-semibold shadow-lg shadow-emerald-500/20">
                                            Valid Only
                                        </Button>
                                        <Button onClick={() => downloadReport('invalid')} variant="destructive" className="bg-rose-500 hover:bg-rose-600 cursor-pointer rounded-xl font-semibold shadow-lg shadow-rose-500/20">
                                            Invalid Only
                                        </Button>
                                        <Button onClick={() => downloadReport('verified_domain')} className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer rounded-xl font-semibold">
                                            Verified + Domain
                                        </Button>
                                        <Button className="bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer rounded-xl font-semibold" onClick={() => downloadReport('full')}>
                                            Full CSV
                                        </Button>
                                    </div>
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
        <div className={cn("p-6 rounded-2xl text-center shadow-sm transition-transform hover:-translate-y-1 duration-300", className)}>
            <div className="text-4xl font-black mb-2 tracking-tight">{value.toLocaleString()}</div>
            <div className="text-xs uppercase font-bold tracking-widest opacity-80">{label}</div>
        </div>
    )
}

function ResultCard({ title, count, color, percent }: any) {
    const styles: any = {
        green: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-900 shadow-emerald-100",
        red: "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200 text-rose-900 shadow-rose-100",
        yellow: "bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 text-amber-900 shadow-amber-100"
    };

    const textColors: any = {
        green: "text-emerald-600",
        red: "text-rose-600",
        yellow: "text-amber-600"
    }

    return (
        <div className={cn("p-6 rounded-3xl border shadow-lg flex flex-col relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", styles[color])}>
            <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                {color === 'green' ? <CheckCircle className="w-32 h-32" /> : color === 'red' ? <XCircle className="w-32 h-32" /> : <AlertTriangle className="w-32 h-32" />}
            </div>
            
            <div className={cn("text-xs font-black uppercase tracking-widest mb-2 relative z-10", textColors[color])}>{title}</div>
            <div className="text-5xl font-black tracking-tighter mb-4 relative z-10">{count.toLocaleString()}</div>
            
            <div className="mt-auto relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                    <div className={cn("w-2 h-2 rounded-full", color === 'green' ? "bg-emerald-500" : color === 'red' ? "bg-rose-500" : "bg-amber-500")} />
                    {percent}% of total
                </div>
            </div>
        </div>
    )
}
