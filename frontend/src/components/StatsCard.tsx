import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    trend?: string;
    description?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange';
}

export function StatsCard({ title, value, icon: Icon, trend, description, color = 'blue' }: StatsCardProps) {
    const colorStyles = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        green: 'bg-green-500/10 text-green-500 border-green-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };

    return (
        <div className={cn(
            "bg-white border rounded-xl p-6 transition-all duration-300 hover:shadow-md",
            "border-slate-200"
        )}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900">{value}</h3>
                </div>
                <div className={cn("p-3 rounded-lg border", colorStyles[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {(trend || description) && (
                <div className="mt-4 flex items-center text-xs">
                    {trend && <span className="text-green-400 font-medium mr-2">{trend}</span>}
                    {description && <span className="text-slate-500">{description}</span>}
                </div>
            )}
        </div>
    );
}
