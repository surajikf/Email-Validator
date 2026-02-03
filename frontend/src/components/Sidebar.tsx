'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Settings, Shield, LogOut, Database, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', label: 'Validate', icon: LayoutDashboard },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/history', label: 'History', icon: History },
    { href: '/dashboard/database', label: 'Email Database', icon: Database },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r border-slate-200 bg-white transition-transform sm:translate-x-0">
            <div className="flex h-full flex-col">
                <div className="flex bg-slate-50 h-16 items-center border-b px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-slate-800">
                        <Shield className="h-6 w-6 text-indigo-600" />
                        <span>EmailValidator</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-slate-400")} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t p-4">
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer">
                        <LogOut className="h-5 w-5 text-slate-400" />
                        Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
