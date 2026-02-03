'use client';
import { motion } from 'framer-motion';

interface ProgressBarProps {
    progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
    return (
        <div className="w-full max-w-xl mx-auto my-6">
            <div className="flex justify-between text-sm font-medium mb-2 text-slate-600">
                <span>Validation Progress</span>
                <span>{progress}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                />
            </div>
        </div>
    );
}
