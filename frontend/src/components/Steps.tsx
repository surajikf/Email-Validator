'use client';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepsProps {
    steps: string[];
    currentStep: number;
}

export function Steps({ steps, currentStep }: StepsProps) {
    return (
        <div className="w-full mb-12">
            <div className="relative flex justify-between">
                {/* Progress Line */}
                <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 px-2 z-0">
                    <div className="h-1 w-full bg-slate-100 rounded-full">
                        <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                        />
                    </div>
                </div>

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 font-bold text-sm",
                                isCompleted ? "bg-indigo-600 border-indigo-600 text-white" :
                                    isCurrent ? "bg-white border-indigo-600 text-indigo-600 shadow-md scale-110" :
                                        "bg-white border-slate-200 text-slate-400"
                            )}>
                                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                            </div>
                            <span className={cn(
                                "text-xs font-semibold uppercase tracking-wider transition-colors",
                                isCurrent ? "text-indigo-600" : "text-slate-400"
                            )}>{step}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
