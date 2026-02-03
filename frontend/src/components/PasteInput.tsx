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
            const res = await axios.post('http://127.0.0.1:3001/api/paste', { emails: text });
            onUploadStart(res.data.jobId, res.data.totalEmails);
            setText('');
        } catch (err: any) {
            onError(err.response?.data?.error || "Processing failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto mb-10">
            <div className="relative">
                <textarea
                    className="w-full h-48 p-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none transition-all font-mono text-sm"
                    placeholder="paste@emails.here, another@example.com..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className="absolute bottom-4 right-4">
                    <Button onClick={handleSubmit} disabled={!text || loading}>
                        {loading ? 'Processing...' : 'Validate Emails'}
                    </Button>
                </div>
            </div>
            <p className="mt-2 text-xs text-slate-400 text-center">
                Separate emails by commas or new lines.
            </p>
        </div>
    );
}
