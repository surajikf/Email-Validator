'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface ValidationStats {
    total: number;
    processed: number;
    valid: number;
    invalid: number;
    risky: number;
}

interface ValidationContextType {
    jobId: string | null;
    status: string;
    stats: ValidationStats;
    duplicatesRemoved: number;
    results: any[];
    currentStep: number;
    activeInputTab: 'upload' | 'paste';
    setJobId: (id: string | null) => void;
    setStatus: (status: string) => void;
    setStats: (stats: ValidationStats) => void;
    setResults: (results: any[]) => void;
    setCurrentStep: (step: number) => void;
    setActiveInputTab: (tab: 'upload' | 'paste') => void;
    handleStart: (id: string, total: number) => void;
    handleReset: () => void;
    downloadReport: (type: 'valid' | 'invalid' | 'full') => void;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export function ValidationProvider({ children }: { children: ReactNode }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
    const [jobId, setJobId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [stats, setStats] = useState<ValidationStats>({ total: 0, processed: 0, valid: 0, invalid: 0, risky: 0 });
    const [duplicatesRemoved, setDuplicatesRemoved] = useState<number>(0);
    const [results, setResults] = useState<any[]>([]);

    // Polling Effect - Now global in provider
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (jobId && status !== 'completed' && status !== 'failed') {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`http://127.0.0.1:3001/api/status/${jobId}`);
                    const data = res.data;
                    const newStatus = data.state;

                    if (data.duplicatesRemoved) {
                        setDuplicatesRemoved(data.duplicatesRemoved);
                    }

                    if (newStatus === 'completed' && status !== 'completed') {
                        toast.success("Validation completed!");
                        setStatus('completed');
                        setCurrentStep(2);
                    } else if (newStatus === 'failed') {
                        toast.error("Validation failed.");
                        setStatus('failed');
                    } else {
                        setStatus(newStatus);
                    }

                    if (data.result) {
                        const resList = data.result;
                        const valid = resList.filter((r: any) => r.status === 'valid').length;
                        const invalid = resList.filter((r: any) => r.status === 'invalid').length;
                        const risky = resList.filter((r: any) => r.status === 'risky').length;
                        setStats({ total: resList.length, processed: resList.length, valid, invalid, risky });
                        setResults(resList);
                    } else {
                        setStats(prev => ({
                            ...prev,
                            processed: Math.floor((data.progress / 100) * prev.total)
                        }));
                    }
                } catch (err) {
                    console.error("Polling Error:", err);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [jobId, status]);

    const handleStart = (id: string, total: number) => {
        setJobId(id);
        setStats({ total, processed: 0, valid: 0, invalid: 0, risky: 0 });
        setStatus('active');
        setCurrentStep(1);
        toast.info("Started validation job...");
    };

    const handleReset = () => {
        setJobId(null);
        setStatus('idle');
        setResults([]);
        setCurrentStep(0);
        setStats({ total: 0, processed: 0, valid: 0, invalid: 0, risky: 0 });
        setDuplicatesRemoved(0);
    };

    const downloadReport = (type: 'valid' | 'invalid' | 'full') => {
        if (!results.length) return;
        let data = results;
        if (type === 'valid') data = results.filter(r => r.status === 'valid');
        if (type === 'invalid') data = results.filter(r => r.status === 'invalid');

        const csvContent = "data:text/csv;charset=utf-8,"
            + "Email,Status,Reason\n"
            + data.map(e => `${e.email},${e.status},${e.reason || ''}`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `email_report_${type}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <ValidationContext.Provider value={{
            jobId, status, stats, duplicatesRemoved, results, currentStep, activeInputTab,
            setJobId, setStatus, setStats, setResults, setCurrentStep, setActiveInputTab,
            handleStart, handleReset, downloadReport
        }}>
            {children}
        </ValidationContext.Provider>
    );
}

export function useValidation() {
    const context = useContext(ValidationContext);
    if (!context) {
        throw new Error('useValidation must be used within a ValidationProvider');
    }
    return context;
}
