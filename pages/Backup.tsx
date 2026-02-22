import React, { useState } from 'react';
import { ShieldCheck, HardDrive, AlertTriangle, CheckCircle2, FolderOpen, ArrowRight, Loader2, RotateCcw, Zap } from 'lucide-react';
import { Database } from '../db';
import { toast } from 'sonner';

const Backup: React.FC = () => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [lastBackup, setLastBackup] = useState<string | null>(localStorage.getItem('lastBackupDate'));

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const folder = await Database.selectBackupFolder();
            if (!folder) { setIsBackingUp(false); return; }

            toast.loading('Securing Data...', { id: 'backup-process' });
            const res = await Database.backupCustom(folder);

            if (res.success) {
                toast.success('Backup Secured Successfully!', {
                    id: 'backup-process',
                    description: `Saved to: ${res.path}`
                });
                const now = new Date().toISOString();
                localStorage.setItem('lastBackupDate', now);
                await Database.setConfig('last_backup_date', now);
                setLastBackup(now);
            } else {
                toast.error('Backup Failed', { id: 'backup-process', description: res.error });
            }
        } catch (error: any) {
            toast.error('Backup Error', { id: 'backup-process', description: error.message || 'An unexpected error occurred' });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleOptimize = async () => {
        const confirmOptimize = window.confirm(
            "Note: Database optimization may take a few seconds during which the app will be paused.\n\nContinue?"
        );
        if (!confirmOptimize) return;

        setIsOptimizing(true);
        toast.loading('Rebuilding Registry...', { id: 'optimize-process' });

        try {
            const res = await Database.optimizeDatabase();
            if (res.success) {
                toast.success('Optimization Complete!', { id: 'optimize-process', description: 'Database performance maximum.' });
                await Database.setConfig('last_optimize_date', new Date().toISOString());
            } else {
                toast.error('Optimization Failed', { id: 'optimize-process', description: res.error });
            }
        } catch (error: any) {
            toast.error('Optimization Error', { id: 'optimize-process', description: error.message || 'An unexpected error occurred' });
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleRestore = async () => {
        const confirmRestore = window.confirm(
            "WARNING: Restoring a database will OVERWRITE all current data.\n\nThe application will restart after restoration.\n\nAre you absolutely sure you want to proceed?"
        );

        if (!confirmRestore) return;

        setIsRestoring(true);
        try {
            const file = await Database.selectRestoreFile();
            if (!file) { setIsRestoring(false); return; }

            toast.loading('Restoring Database...', { id: 'restore-process' });
            const res = await Database.restoreDatabase(file);

            if (res.success) {
                toast.success('Database Restored Successfully!', { id: 'restore-process' });
                // App usually reloads automatically via main process after successful restore
            } else {
                toast.error('Restore Failed', { id: 'restore-process', description: res.error });
                setIsRestoring(false);
            }
        } catch (error: any) {
            toast.error('Restore Error', { id: 'restore-process', description: error.message || 'An unexpected error occurred' });
            setIsRestoring(false);
        }
    };

    const steps = [
        { icon: <HardDrive size={16} />, label: '1. Connect Drive', desc: 'Plug in your SSD or external storage', color: 'text-blue-500 bg-blue-50' },
        { icon: <FolderOpen size={16} />, label: '2. Choose Folder', desc: 'Pick any folder on the drive', color: 'text-purple-500 bg-purple-50' },
        { icon: <ShieldCheck size={16} />, label: '3. Start Backup', desc: "We'll save a timestamped copy", color: 'text-emerald-500 bg-emerald-50' },
    ];

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center mb-8 max-w-md">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Secure Backup & Restore</h1>
                <p className="text-sm text-slate-500 mt-2 font-medium">Protect or recover your database</p>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Backup Card */}
                <div
                    className="bg-white rounded-2xl p-6 h-full flex flex-col"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)' }}
                >
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <ShieldCheck size={20} className="text-blue-600" /> Save Backup
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">Export a copy of your current data</p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 flex-1">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                                    {step.icon}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 tracking-tight">{step.label}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Last backup status */}
                    <div className="my-5 flex justify-center">
                        {lastBackup ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                                <CheckCircle2 size={12} />
                                Last: {new Date(lastBackup).toLocaleString()}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                                <AlertTriangle size={12} />
                                No backup on record
                            </span>
                        )}
                    </div>

                    {/* Action button */}
                    <button
                        onClick={handleBackup}
                        disabled={isBackingUp || isRestoring}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group mt-auto"
                        style={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)',
                            boxShadow: '0 4px 14px rgba(15,23,42,0.25)',
                        }}
                    >
                        {isBackingUp ? (
                            <><Loader2 size={15} className="animate-spin" /> Securing Data...</>
                        ) : (
                            <><span>Start Secure Backup</span><ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
                        )}
                    </button>
                </div>

                {/* Restore Card */}
                <div
                    className="bg-white rounded-2xl p-6 h-full flex flex-col border border-rose-50"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)' }}
                >
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-rose-800 tracking-tight flex items-center gap-2">
                            <RotateCcw size={20} className="text-rose-600" /> Restore Database
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">Override current system with it</p>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex gap-3 text-orange-900 mb-6">
                            <AlertTriangle size={24} className="shrink-0 text-orange-600" />
                            <div className="space-y-2 text-sm leading-relaxed">
                                <p className="font-bold">Dangerous Action</p>
                                <p className="opacity-90">Restoring from a backup will permanently overwrite your current database.</p>
                                <p className="opacity-90">All data recorded after the selected backup date will be lost.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 text-rose-500">
                                    <HardDrive size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 tracking-tight">1. Prepare Drive</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Ensure the external drive with your `.db` file is connected</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-rose-50 text-rose-500">
                                    <FolderOpen size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-800 tracking-tight">2. Select File</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Pick the correct `starline_master.db` backup file</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleRestore}
                        disabled={isBackingUp || isRestoring || isOptimizing}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6 shadow-lg shadow-rose-200"
                    >
                        {isRestoring ? (
                            <><Loader2 size={15} className="animate-spin" /> Restoring...</>
                        ) : (
                            <><span>Select Backup & Overwrite Data</span></>
                        )}
                    </button>
                </div>
            </div>

            {/* Maintenance Section */}
            <div className="w-full max-w-4xl mt-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200" style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">Database Maintenance</h2>
                                <p className="text-xs text-slate-500 font-medium mt-1 max-w-lg">
                                    Optimize the database to reduce file size and improve query performance. This safely packs gaps left behind from deleted or updated records.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleOptimize}
                            disabled={isBackingUp || isRestoring || isOptimizing}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            {isOptimizing ? (
                                <><Loader2 size={15} className="animate-spin" /> Optimizing Data...</>
                            ) : (
                                <><Zap size={15} /> Run Optimization</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Backup;
