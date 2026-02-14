import React, { useState } from 'react';
import { ShieldCheck, HardDrive, AlertTriangle, CheckCircle2, FolderOpen, ArrowRight } from 'lucide-react';
import { Database } from '../db';
import { toast } from 'sonner';

const Backup: React.FC = () => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('lastBackupDate'));

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const folder = await Database.selectBackupFolder();

            if (!folder) {
                setIsBackingUp(false);
                return; // User cancelled
            }

            toast.loading('Securing Data...', { id: 'backup-process' });

            // The backend validation logic in main.js will throw if folder name is not 'starline'
            const res = await Database.backupCustom(folder);

            if (res.success) {
                toast.success(`Backup Secured Successfully!`, {
                    id: 'backup-process',
                    description: `Saved to: ${res.path}`
                });
                const now = new Date().toISOString();
                localStorage.setItem('lastBackupDate', now);
                setLastBackup(now);
            } else {
                // Handle specific security error
                if (res.error?.includes('Security Restriction')) {
                    toast.error('Security Violation', {
                        id: 'backup-process',
                        description: "You must select a folder named 'starline'. Access to other locations is restricted."
                    });
                } else {
                    toast.error('Backup Failed', {
                        id: 'backup-process',
                        description: res.error
                    });
                }
            }
        } catch (error: any) {
            toast.error('Backup Error', {
                id: 'backup-process',
                description: error.message || 'An unexpected error occurred'
            });
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">

            <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left Column: Visual Instructions */}
                <div className="space-y-8">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Secure Backup</h1>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            Your business data is valuable. We enforce strict security protocols to ensure your backups are stored safely and consistently.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <HardDrive size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">1. Connect External Drive</h3>
                                <p className="text-sm text-slate-500 mt-1">Plug in your SSD or secure external storage device.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <FolderOpen size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">2. Create 'starline' Folder</h3>
                                <p className="text-sm text-slate-500 mt-1">Create a folder named exactly <code className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">starline</code> in the drive.</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">3. Select & Secure</h3>
                                <p className="text-sm text-slate-500 mt-1">Click the button, select the <code className="text-xs">starline</code> folder, and we'll handle the rest.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Action Card */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />

                    <div className="relative bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-8">

                        <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isBackingUp ? 'bg-blue-50 scale-110' : 'bg-slate-50'}`}>
                            <ShieldCheck
                                size={48}
                                className={`transition-colors duration-500 ${isBackingUp ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`}
                                strokeWidth={1.5}
                            />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-900">Ready to Secure</h2>
                            {lastBackup ? (
                                <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    Last Backup: {new Date(lastBackup).toLocaleString()}
                                </p>
                            ) : (
                                <p className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    No Backup Found
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none transition-all flex items-center justify-center space-x-2 group/btn"
                        >
                            <span>{isBackingUp ? 'Securing Data...' : 'Start Secure Backup'}</span>
                            {!isBackingUp && <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />}
                        </button>

                        <div className="text-xs text-slate-400 font-medium px-8">
                            By clicking start, you explicitly authorize the system to write data to the designated secure folder.
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Backup;
