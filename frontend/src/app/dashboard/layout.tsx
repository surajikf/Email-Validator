import { Sidebar } from '@/components/Sidebar';
import { Toaster } from 'sonner';
import { ValidationProvider } from '@/context/ValidationContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ValidationProvider>
            <div className="min-h-screen bg-slate-50">
                <Sidebar />
                <div className="sm:ml-64">
                    {/* Header could go here */}
                    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur-md">
                        <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200" />
                    </header>
                    <main className="p-6">
                        {children}
                    </main>
                </div>
                <Toaster position="top-right" />
            </div>
        </ValidationProvider>
    );
}
