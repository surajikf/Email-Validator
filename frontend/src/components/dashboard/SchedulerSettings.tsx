import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, Calendar, CheckCircle, AlertTriangle, Save, Power } from 'lucide-react';

interface SchedulerSettings {
    frequency: 'daily' | 'hourly' | 'weekly';
    time: string;
    batch_size: number;
    is_active: boolean;
    day_of_week: number;
}

export function SchedulerSettings() {
    const [settings, setSettings] = useState<SchedulerSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/scheduler/settings');
            setSettings(res.data);
        } catch (error) {
            console.error('Failed to fetch scheduler settings', error);
            // toast.error('Failed to load scheduler settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await api.post('/api/scheduler/settings', settings);
            toast.success('Scheduler settings updated successfully!');
        } catch (error) {
            console.error('Failed to save settings', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-xl"></div>;
    if (!settings) return null; // Or error state

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900">Email Scheduler Settings</h3>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${settings.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {settings.is_active ? <CheckCircle className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                    {settings.is_active ? 'Active' : 'Disabled'}
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Controls */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
                        <select
                            value={settings.frequency}
                            onChange={e => setSettings({ ...settings, frequency: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                        >
                            <option value="daily">Daily</option>
                            <option value="hourly">Hourly</option>
                            <option value="weekly">Weekly</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {settings.frequency === 'daily' && 'Runs once every day at the specified time.'}
                            {settings.frequency === 'hourly' && 'Runs at the beginning of every hour.'}
                            {settings.frequency === 'weekly' && 'Runs once a week on the specified day and time.'}
                        </p>
                    </div>

                    {settings.frequency !== 'hourly' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Time (IST)</label>
                                <input
                                    type="time"
                                    value={settings.time}
                                    onChange={e => setSettings({ ...settings, time: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                />
                            </div>
                            {settings.frequency === 'weekly' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Day of Week</label>
                                    <select
                                        value={settings.day_of_week}
                                        onChange={e => setSettings({ ...settings, day_of_week: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    >
                                        <option value="0">Sunday</option>
                                        <option value="1">Monday</option>
                                        <option value="2">Tuesday</option>
                                        <option value="3">Wednesday</option>
                                        <option value="4">Thursday</option>
                                        <option value="5">Friday</option>
                                        <option value="6">Saturday</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Batch Size (Emails per Run)</label>
                        <input
                            type="number"
                            min="1"
                            max="500"
                            value={settings.batch_size}
                            onChange={e => setSettings({ ...settings, batch_size: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-1">Number of validated emails to send in each scheduled run.</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.is_active}
                                    onChange={e => setSettings({ ...settings, is_active: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                            <span className="text-sm font-medium text-slate-700">Enable Scheduler</span>
                        </label>

                        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                        </Button>
                    </div>
                </div>

                {/* Right Column: Preview / Info */}
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 flex flex-col justify-center">
                    <h4 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" /> Schedule Preview
                    </h4>

                    <div className="space-y-4 text-sm text-slate-600">
                        <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Next Run Window:</span>
                            <span className="font-medium text-slate-900">
                                {settings.frequency === 'hourly' ? 'Top of next hour' : `${settings.time} ${settings.frequency === 'weekly' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][settings.day_of_week] : 'Daily'}`}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span>Email Volume:</span>
                            <span className="font-medium text-slate-900">{settings.batch_size} emails / run</span>
                        </div>
                        <div className="flex justify-between pb-2">
                            <span>Status:</span>
                            <span className={`font-medium ${settings.is_active ? 'text-green-600' : 'text-slate-400'}`}>
                                {settings.is_active ? 'Active & Scheduled' : 'Paused'}
                            </span>
                        </div>

                        {!settings.is_active && (
                            <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-xs flex items-start gap-2 border border-amber-100">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>The scheduler is currently paused. No automated emails will be sent until enabled.</span>
                            </div>
                        )}
                        {settings.is_active && (
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs flex items-start gap-2 border border-blue-100">
                                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Emails will be sent automatically according to this schedule. Ensure you have enough validated credits/emails.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
