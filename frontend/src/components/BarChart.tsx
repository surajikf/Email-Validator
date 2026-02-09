'use client';

import { motion } from 'framer-motion';

interface ChartData {
    date: string;
    sent: number;
}

interface BarChartProps {
    data: ChartData[];
}

export function BarChart({ data }: BarChartProps) {
    const maxVal = Math.max(...data.map(d => d.sent), 10); // Prevent divide by zero

    return (
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 h-[400px] flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-6">Email Campaign Performance</h3>

            <div className="flex-1 flex items-end justify-between space-x-2">
                {data.map((item, index) => {
                    const height = (item.sent / maxVal) * 100;
                    return (
                        <div key={item.date} className="flex flex-col items-center flex-1 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-xs px-2 py-1 rounded border border-slate-700">
                                {item.sent} Emails
                            </div>

                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm hover:from-blue-500 hover:to-blue-300 transition-colors opacity-80 hover:opacity-100"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 rotate-0 truncate w-full text-center">
                                {item.date}
                            </p>
                        </div>
                    );
                })}

                {data.length === 0 && (
                    <div className="flex w-full h-full items-center justify-center text-slate-500">
                        No data available
                    </div>
                )}
            </div>
        </div>
    );
}
