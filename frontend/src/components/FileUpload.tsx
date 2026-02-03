import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { UploadCloud, FileText, CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

interface FileUploadProps {
    onUploadStart: (jobId: string, count: number) => void;
    onError: (msg: string) => void;
}

export function FileUpload({ onUploadStart, onError }: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndAddFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            validateAndAddFiles(Array.from(e.target.files));
        }
    };

    const validateAndAddFiles = (newFiles: File[]) => {
        const validFiles: File[] = [];
        newFiles.forEach(f => {
            if (f.name.endsWith('.csv') || f.name.endsWith('.xlsx')) {
                validFiles.push(f);
            } else {
                onError(`File ${f.name} is not a CSV or Excel file.`);
            }
        });

        if (validFiles.length > 0) {
            setFiles(prev => {
                // Remove duplicates by name
                const combined = [...prev, ...validFiles];
                const unique = combined.filter((f, index, self) =>
                    index === self.findIndex((t) => t.name === f.name)
                );
                return unique;
            });
        }
    };

    const removeFile = (name: string) => {
        setFiles(prev => prev.filter(f => f.name !== name));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        const formData = new FormData();
        files.forEach(f => {
            formData.append('files', f); // Backend uses upload.array('files')
        });

        try {
            const res = await axios.post('http://127.0.0.1:3001/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadStart(res.data.jobId, res.data.totalEmails);
            setFiles([]);
        } catch (err: any) {
            console.error(err);
            onError(err.response?.data?.error || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-6">
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 transition-all text-center cursor-pointer",
                    dragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-300 hover:border-primary/50",
                    files.length > 0 ? "bg-indigo-50/20 border-indigo-200" : "bg-white"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    className="hidden"
                    type="file"
                    accept=".csv, .xlsx"
                    multiple
                    onChange={handleChange}
                />

                <div className="flex flex-col items-center gap-3 text-slate-600">
                    <UploadCloud className="w-12 h-12 text-primary/70" />
                    <div>
                        <span className="font-semibold text-primary">Click to select files</span> or drag and drop
                    </div>
                    <div className="text-xs text-slate-400">
                        Select multiple CSV or Excel files
                    </div>
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                        <span>Selected Files ({files.length})</span>
                        <button onClick={() => setFiles([])} className="text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Clear All
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {files.map(f => (
                            <div key={f.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 group">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                    <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                                    <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={handleUpload}
                        className="w-full mt-2 cursor-pointer"
                        disabled={uploading}
                    >
                        {uploading ? (
                            <div className="flex items-center gap-2 text-white">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Uploading Batch...</span>
                            </div>
                        ) : `Validate All Files`}
                    </Button>
                </div>
            )}
        </div>
    );
}
