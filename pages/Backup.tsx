import React, { useState } from 'react';
import { ShieldCheck, HardDrive, AlertTriangle, CheckCircle2, FolderOpen, ArrowRight, Loader2 } from 'lucide-react';
import { Database } from '../db';
import { toast } from 'sonner';

const Backup: React.FC = () => {
    const [isBackingUp, setIsBackingUp] = useState(false);
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

    const steps = [
        { icon: <HardDrive size={16} />, label: '1. Connect Drive', desc: 'Plug in your SSD or external storage', color: 'text-blue-500 bg-blue-50' },
        { icon: <FolderOpen size={16} />, label: '2. Choose Folder', desc: 'Pick any folder on the drive', color: 'text-purple-500 bg-purple-50' },
        { icon: <ShieldCheck size={16} />, label: '3. Start Backup', desc: "We'll save a timestamped copy", color: 'text-emerald-500 bg-emerald-50' },
    ];

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center mb-8 max-w-md">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Secure Backup</h1>
                <p className="text-sm text-slate-500 mt-2 font-medium">Save a timestamped copy of your database to an external drive</p>
            </div>

            {/* Card */}
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md"
                style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)' }}
            >
                {/* Steps */}
                <div className="space-y-3 mb-6">
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
                <div className="mb-5 flex justify-center">
                    {lastBackup ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                            <CheckCircle2 size={12} />
                            Last backup: {new Date(lastBackup).toLocaleString()}
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
                    disabled={isBackingUp}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
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
        </div>
    );
};

export default Backup;
