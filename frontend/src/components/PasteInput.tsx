'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea'; // We need to create this or use standard textarea
import { ArrowRight, Type } from 'lucide-react';
import axios from 'axios';

interface PasteInputProps {
    onUploadStart: (jobId: string, count: number) => void;
    onError: (msg: string) => void;
}

export function PasteInput({ onUploadStart, onError }: PasteInputProps) {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const res = await axios.post('/api/paste', { emails: text });
            onUploadStart(res.data.jobId, res.data.totalEmails);
            setText('');
        } catch (err: any) {
            onError(err.response?.data?.error || "Processing failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full mx-auto mb-10">
            <div className="relative group">
                <textarea
                    className="w-full h-64 p-6 rounded-[2rem] border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none resize-none transition-all duration-300 font-mono text-sm shadow-inner bg-white/50 backdrop-blur-sm group-hover:border-indigo-300"
                    placeholder="paste@emails.here, another@example.com..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="absolute bottom-6 right-6">
                    <Button onClick={handleSubmit} disabled={!text || loading} size="lg" className="rounded-xl shadow-lg cursor-pointer">
                        {loading ? 'Processing...' : 'Validate Emails'}
                    </Button>
                </div>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-400 text-center">
                Separate emails by commas or new lines.
            </p>
        </div>
    );
}
