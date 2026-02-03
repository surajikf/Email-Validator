'use client';
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const [strictMode, setStrictMode] = useState(false);
    const [autoDownload, setAutoDownload] = useState(false);

    useEffect(() => {
        const savedStrict = localStorage.getItem('validator_strict_mode');
        const savedAuto = localStorage.getItem('validator_auto_download');
        if (savedStrict) setStrictMode(JSON.parse(savedStrict));
        if (savedAuto) setAutoDownload(JSON.parse(savedAuto));
    }, []);

    const handleSave = () => {
        localStorage.setItem('validator_strict_mode', JSON.stringify(strictMode));
        localStorage.setItem('validator_auto_download', JSON.stringify(autoDownload));
        toast.success("Settings saved successfully!");
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-indigo-600" /> Settings
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">

                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-900 text-lg">Strict Validation Mode</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Treat "Risky" results (like catch-all domains) as <strong>Invalid</strong>.
                        </p>
                    </div>
                    <Switch checked={strictMode} onCheckedChange={setStrictMode} />
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-900 text-lg">Auto-Download Report</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            Automatically download the CSV report when validation completes.
                        </p>
                    </div>
                    <Switch checked={autoDownload} onCheckedChange={setAutoDownload} />
                </div>

                <div className="h-px bg-slate-100" />

                <div>
                    <h3 className="font-semibold text-slate-900 text-lg">Automatic Re-validation</h3>
                    <p className="text-slate-500 text-sm mt-1 mb-4">
                        Schedule automatic re-validation for invalid emails to check if they become active again.
                    </p>
                    <div className="flex gap-4">
                        {(['Off', 'Daily', 'Weekly'] as const).map((option) => (
                            <button
                                key={option}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer",
                                    option === 'Daily' // Defaulting to Daily for display
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    <p className="text-slate-400 text-[10px] mt-2 italic">
                        * Background re-validation is active on the server.
                    </p>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} className="w-full sm:w-auto">
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                </div>

            </div>
        </div>
    );
}
