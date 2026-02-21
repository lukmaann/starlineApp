import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Calendar, CheckCircle2, Loader2, X, ArrowRight, Fingerprint, History as LucideHistory, RefreshCw, ChevronDown } from 'lucide-react';
import { Battery, BatteryStatus } from '../types';
import { Database } from '../db';
import { notify } from '../utils/notifications';
import { getLocalDate, formatDate } from '../utils';

interface BatteryInspectionProps {
    battery: Battery;
    onClose: () => void;
    onComplete: () => void;
    onStartExchange?: (reason: string) => void;
    userRole?: string;
}

export const BatteryInspection: React.FC<BatteryInspectionProps> = ({ battery, onClose, onComplete, onStartExchange, userRole }) => {
    const isAdmin = userRole === 'ADMIN';
    const [result, setResult] = useState<'GOOD' | 'FAULTY' | null>(battery.inspectionStatus === 'GOOD' ? 'GOOD' : battery.inspectionStatus === 'FAULTY' ? 'FAULTY' : null);
    const [failureReason, setFailureReason] = useState<string>('DEAD CELL');
    const [returnDate, setReturnDate] = useState(battery.inspectionReturnDate || getLocalDate());
    const [isSaving, setIsSaving] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleStart = async () => {
        setIsStarting(true);
        try {
            await Database.startInspection(battery.id, battery.inspectionNotes || '');
            notify('Inspection started', 'success');
            onComplete();
        } catch (err) {
            console.error('Failed to start:', err);
            notify('Failed to start inspection', 'error');
        } finally {
            setIsStarting(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Are you sure you want to reset this inspection? All current data will be cleared.')) return;

        setIsResetting(true);
        try {
            await Database.resetInspection(battery.id, 'User requested reset');
            notify('Inspection record reset', 'success');
            onComplete();
        } catch (err) {
            console.error('Reset failed:', err);
            notify('Failed to reset inspection', 'error');
        } finally {
            setIsResetting(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;

        setIsSaving(true);
        try {
            await Database.updateInspection(
                battery.id,
                result,
                result === 'GOOD' ? returnDate : undefined,
                battery.inspectionNotes || ''
            );

            notify(`Inspection completed: Battery is ${result}`, 'success');
            onComplete();
        } catch (err: any) {
            console.error('Inspection failed:', err);
            notify(`Failed to save results: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndStartExchange = async () => {
        if (!result || result !== 'FAULTY') return;

        setIsSaving(true);
        try {
            await Database.updateInspection(
                battery.id,
                'FAULTY',
                undefined,
                battery.inspectionNotes || '',
                failureReason
            );

            notify(`Results saved. Starting exchange...`, 'success');
            if (onStartExchange) onStartExchange(failureReason);
        } catch (err: any) {
            console.error('Save failed:', err);
            notify(`Failed to save results: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const isPending = !battery.inspectionStatus || battery.inspectionStatus === 'PENDING';
    const isInProgress = battery.inspectionStatus === 'IN_PROGRESS';
    const isCompleted = battery.inspectionStatus === 'GOOD' || battery.inspectionStatus === 'FAULTY';

    return (
        <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-300 space-y-5 relative overflow-hidden w-full">
            <div className="flex justify-between items-center opacity-80">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Technical Assessment</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider">Serial: {battery.id}</p>
                            {battery.inspectionStartDate && (
                                <p className="text-slate-400 text-[9px] font-medium uppercase tracking-wider border-l border-slate-200 pl-2">
                                    Started: {formatDate(battery.inspectionStartDate)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isCompleted && (
                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-all active:scale-95"
                            title="Reset Assessment"
                        >
                            {isResetting ? <Loader2 size={16} className="animate-spin" /> : <LucideHistory size={16} />}
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all active:scale-95">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {isPending ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-300">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <LucideHistory size={40} className="animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-900 leading-tight">Prepare Inspection</h4>
                        <p className="text-xs text-slate-500 max-w-[280px]">Start the technical verification process to record the unit's entry date into the lab.</p>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={isStarting}
                        className="mt-2 w-full max-w-[240px] px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isStarting ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                Start Inspection
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                    <button onClick={onClose} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                        Postpone Assessment
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        {isAdmin && (
                            <button
                                onClick={() => setResult('FAULTY')}
                                className={`group p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 relative overflow-hidden ${result === 'FAULTY'
                                    ? 'bg-rose-50 border-rose-500 shadow-lg shadow-rose-200/50'
                                    : 'bg-white border-slate-100 hover:border-rose-200 text-slate-400'
                                    }`}
                            >
                                {result === 'FAULTY' && <div className="absolute top-0 right-0 p-2 text-rose-500"><CheckCircle2 size={18} /></div>}
                                <div className={`p-4 rounded-2xl transition-all duration-300 ${result === 'FAULTY' ? 'bg-rose-500 text-white scale-105' : 'bg-slate-50 text-slate-300 group-hover:bg-rose-100 group-hover:text-rose-400'}`}>
                                    <ShieldAlert size={32} />
                                </div>
                                <div className="text-center">
                                    <span className={`block font-bold text-base ${result === 'FAULTY' ? 'text-rose-700' : 'text-slate-500'}`}>Faulty</span>
                                    <p className="text-[10px] font-medium opacity-60 tracking-wide mt-0.5">Defective Unit</p>
                                </div>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (!isAdmin) {
                                    notify('Only Admin can finalize assessment', 'error');
                                    return;
                                }
                                setResult('GOOD');
                            }}
                            className={`group p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 relative overflow-hidden ${result === 'GOOD'
                                ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-200/50'
                                : 'bg-white border-slate-100 hover:border-emerald-200 text-slate-400'
                                } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {result === 'GOOD' && <div className="absolute top-0 right-0 p-2 text-emerald-500"><CheckCircle2 size={18} /></div>}
                            <div className={`p-4 rounded-2xl transition-all duration-300 ${result === 'GOOD' ? 'bg-emerald-500 text-white scale-105' : 'bg-slate-50 text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-400'}`}>
                                <ShieldCheck size={32} />
                            </div>
                            <div className="text-center">
                                <span className={`block font-bold text-base ${result === 'GOOD' ? 'text-emerald-700' : 'text-slate-500'}`}>Healthy</span>
                                <p className="text-[10px] font-medium opacity-60 tracking-wide mt-0.5">Good to go</p>
                            </div>
                        </button>
                    </div>

                    <div className="flex flex-col bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-sm space-y-4">
                        {!result ? (
                            <div className="flex items-center justify-center py-4 border-t border-slate-50">
                                <div className="text-center space-y-2">
                                    <Fingerprint size={24} className="mx-auto text-slate-300" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting assessment</p>
                                </div>
                            </div>
                        ) : result === 'GOOD' ? (
                            <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-slate-50">
                                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Target Return Date</label>
                                        <input
                                            type="date"
                                            className="bg-transparent border-none outline-none font-black text-base text-emerald-900 mono p-0"
                                            value={returnDate}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                        />
                                    </div>
                                    <Calendar className="text-emerald-400" size={24} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-full p-4 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="bg-rose-500 text-white p-2.5 rounded-lg shadow-md shadow-rose-200">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-rose-900 uppercase tracking-tight">Faulty Confirmed</p>
                                        <p className="text-[10px] font-bold text-rose-600/70 mt-0.5 uppercase tracking-wide">Verification protocol passed. Exchange eligible.</p>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Detected Failure Mode</label>
                                    <div className="relative group">
                                        <select
                                            value={failureReason}
                                            onChange={(e) => setFailureReason(e.target.value)}
                                            className="w-full pl-5 pr-12 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm uppercase outline-none focus:border-rose-500 transition-all cursor-pointer appearance-none text-slate-700 shadow-sm"
                                        >
                                            <option value="DEAD CELL">Dead Cell</option>
                                            <option value="INTERNAL SHORT">Internal Short</option>
                                            <option value="BULGE">Casing Bulge</option>
                                            <option value="LOW GRAVITY">Low Gravity</option>
                                            <option value="LEAKAGE">Leakage</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-rose-500 transition-colors">
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 font-bold rounded-xl transition-all text-sm text-slate-400 hover:bg-white hover:text-slate-600 border border-slate-200"
                        >
                            Dismiss
                        </button>
                        {result === 'FAULTY' ? (
                            isAdmin && (
                                <button
                                    onClick={handleSaveAndStartExchange}
                                    disabled={isSaving}
                                    className="flex-1 font-black py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transform active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            Start Warranty Exchange
                                            <RefreshCw size={18} />
                                        </>
                                    )}
                                </button>
                            )
                        ) : (
                            isAdmin && (
                                <button
                                    onClick={handleSave}
                                    disabled={!result || isSaving}
                                    className="flex-1 font-black py-4 rounded-xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transform active:scale-[0.98] disabled:opacity-30 disabled:grayscale bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                                        <>
                                            {isCompleted ? 'Update Verdict' : 'Send Back to Dealer'}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            )
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
