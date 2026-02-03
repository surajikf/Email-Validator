'use client';
import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn("animate-pulse rounded-md bg-slate-200/60", className)} />
    );
}

export function TableRowSkeleton({ cols }: { cols: number }) {
    return (
        <tr className="border-b border-slate-50 last:border-0">
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-6 py-5">
                    <Skeleton className={cn("h-4", i === 0 ? "w-48" : "w-24 mx-auto")} />
                </td>
            ))}
        </tr>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-32 h-3" />
            <Skeleton className="w-20 h-8" />
        </div>
    );
}
