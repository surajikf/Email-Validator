'use client';

import { useState } from 'react';
import { Send, Check, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function TestEmailCard() {
    const [testResult, setTestResult] = useState<{ messageId: string; email: string } | null>(null);

    const handleSendTest = async () => {
        const emailInput = document.getElementById('test-email-target') as HTMLInputElement;
        const companyInput = document.getElementById('test-email-company') as HTMLInputElement;

        if (!emailInput.value || !companyInput.value) {
            toast.error("Please fill in both fields");
            return;
        }

        const btn = document.getElementById('btn-send-test') as HTMLButtonElement;
        const originalText = btn.innerText;
        btn.innerText = "Sending...";
        btn.disabled = true;

        try {
            const res = await api.post('/api/send-test', {
                to: emailInput.value,
                companyName: companyInput.value
            });

            setTestResult({
                messageId: res.data.messageId,
                email: res.data.to || emailInput.value
            });
        } catch (e) {
            console.error(e);
            toast.error("Failed to send test email");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <Send className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Test Email Configuration</h3>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                    Send a test email to verify your template and Brevo integration.
                    This will send a real email with the parameters below.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Target Email</label>
                        <input
                            type="email"
                            placeholder="your.email@example.com"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                            id="test-email-target"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mock Company Name</label>
                        <input
                            type="text"
                            placeholder="Acme Corp"
                            defaultValue="Acme Corp"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                            id="test-email-company"
                        />
                    </div>
                    <Button
                        id="btn-send-test"
                        type="button"
                        onClick={handleSendTest}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                    >
                        Send Test Email
                    </Button>
                </div>
            </div>

            {/* Success Popup Modal */}
            {testResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-100 transform transition-all scale-100 opacity-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <Check className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Email Sent!</h3>
                            </div>
                            <button
                                onClick={() => setTestResult(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-slate-600">
                                Your test email has been successfully dispatched via Brevo.
                            </p>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recipient</span>
                                    <p className="font-medium text-slate-900">{testResult.email}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Message ID</span>
                                    <div className="flex items-center justify-between gap-2 mt-1">
                                        <code className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700 font-mono break-all">
                                            {testResult.messageId}
                                        </code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(testResult.messageId);
                                                toast.success('Copied!');
                                            }}
                                            className="text-slate-400 hover:text-indigo-600"
                                            title="Copy ID"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setTestResult(null)}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
