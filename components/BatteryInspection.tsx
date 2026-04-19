import React, { useEffect, useMemo, useState } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    Calendar,
    CheckCircle2,
    Loader2,
    X,
    ArrowRight,
    RefreshCw,
    ChevronDown,
    TimerReset,
} from 'lucide-react';
import { Battery } from '../types';
import { Database } from '../db';
import { notify } from '../utils/notifications';
import { getLocalDate, formatDate } from '../utils';

interface BatteryInspectionProps {
    battery: Battery;
    onClose: () => void;
    onComplete: () => void;
    onRefresh?: () => void;
    onStartExchange?: (reason: string) => void;
    userRole?: string;
}

type InspectionPhase = 'START' | 'VERDICT';

export const BatteryInspection: React.FC<BatteryInspectionProps> = ({
    battery,
    onClose,
    onComplete,
    onRefresh,
    onStartExchange,
    userRole,
}) => {
    const isAdmin = userRole === 'ADMIN';
    const initialPhase: InspectionPhase =
        !battery.inspectionStatus || battery.inspectionStatus === 'PENDING'
            ? 'START'
            : 'VERDICT';

    const [phase, setPhase] = useState<InspectionPhase>(initialPhase);
    const [inspectionStatus, setInspectionStatus] = useState<string>(battery.inspectionStatus || 'PENDING');
    const [inspectionStartDate, setInspectionStartDate] = useState<string | undefined>(battery.inspectionStartDate);
    const [result, setResult] = useState<'GOOD' | 'FAULTY' | null>(
        battery.inspectionStatus === 'GOOD' ? 'GOOD' : battery.inspectionStatus === 'FAULTY' ? 'FAULTY' : null
    );
    const [failureReason, setFailureReason] = useState<string>(battery.inspectionReason || 'DEAD CELL');
    const [returnDate, setReturnDate] = useState(battery.inspectionReturnDate || getLocalDate());
    const [isSaving, setIsSaving] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const failureReasons = useMemo(
        () => ['DEAD CELL', 'INTERNAL SHORT', 'BULGE', 'LOW GRAVITY', 'LEAKAGE'],
        []
    );

    const isCompleted = inspectionStatus === 'GOOD' || inspectionStatus === 'FAULTY';
    const statusTone =
        inspectionStatus === 'FAULTY'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : inspectionStatus === 'GOOD'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : inspectionStatus === 'IN_PROGRESS'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700';
    const statusLabel =
        inspectionStatus === 'FAULTY'
            ? 'Fault verified'
            : inspectionStatus === 'GOOD'
                ? 'Healthy'
                : inspectionStatus === 'IN_PROGRESS'
                    ? 'Session active'
                    : 'Pending';

    useEffect(() => {
        const nextPhase: InspectionPhase =
            !battery.inspectionStatus || battery.inspectionStatus === 'PENDING' ? 'START' : 'VERDICT';

        setPhase(nextPhase);
        setInspectionStatus(battery.inspectionStatus || 'PENDING');
        setInspectionStartDate(battery.inspectionStartDate);
        setResult(
            battery.inspectionStatus === 'GOOD' ? 'GOOD' : battery.inspectionStatus === 'FAULTY' ? 'FAULTY' : null
        );
        setFailureReason(battery.inspectionReason || 'DEAD CELL');
        setReturnDate(battery.inspectionReturnDate || getLocalDate());
    }, [
        battery.id,
        battery.inspectionStatus,
        battery.inspectionStartDate,
        battery.inspectionReturnDate,
        battery.inspectionReason
    ]);

    const handleStart = async () => {
        setIsStarting(true);
        try {
            await Database.startInspection(battery.id, battery.inspectionNotes || '');
            const startedAt = getLocalDate();
            setInspectionStatus('IN_PROGRESS');
            setInspectionStartDate(startedAt);
            setPhase('VERDICT');
            onRefresh?.();
            notify('Inspection started', 'success');
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
            setInspectionStatus('PENDING');
            setInspectionStartDate(undefined);
            setResult(null);
            setPhase('START');
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
            setInspectionStatus(result);
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

            notify('Results saved. Starting exchange...', 'success');
            setInspectionStatus('FAULTY');
            onStartExchange?.(failureReason);
        } catch (err: any) {
            console.error('Save failed:', err);
            notify(`Failed to save results: ${err.message || 'Unknown error'}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.3)] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-5 py-5 md:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Technical Inspection</h3>
                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${statusTone}`}>
                                    {statusLabel}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Review the unit, record the verdict, and complete the inspection log.
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Serial</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{battery.id}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Model</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{battery.model}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Started</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">
                                        {inspectionStartDate ? formatDate(inspectionStartDate) : 'Not started'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <button
                                onClick={handleReset}
                                disabled={isResetting}
                                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700 hover:bg-amber-100 transition-all"
                            >
                                {isResetting ? <Loader2 size={14} className="animate-spin" /> : <TimerReset size={14} />}
                                Reset
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-95">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-5 md:p-6 bg-slate-50/70">
                <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <div className={`rounded-2xl border px-4 py-4 ${phase === 'START' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Step 1</p>
                        <p className="mt-2 text-sm font-black text-slate-900">Open inspection</p>
                        <p className="mt-1 text-xs text-slate-500">Create or resume the current inspection session.</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-4 ${phase !== 'START' && !result ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Step 2</p>
                        <p className="mt-2 text-sm font-black text-slate-900">Record verdict</p>
                        <p className="mt-1 text-xs text-slate-500">Mark the battery as healthy or faulty.</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-4 ${result ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Step 3</p>
                        <p className="mt-2 text-sm font-black text-slate-900">Finalize action</p>
                        <p className="mt-1 text-xs text-slate-500">Return the battery or move it into exchange.</p>
                    </div>
                </div>

                {phase === 'START' && (
                    <div className="rounded-[24px] border border-slate-200 bg-white p-7 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <ShieldCheck size={28} />
                        </div>
                        <h4 className="mt-4 text-xl font-black text-slate-900">Ready to start inspection</h4>
                        <p className="mt-2 max-w-md mx-auto text-sm text-slate-500">
                            Open a formal inspection session for this battery, then continue to the final assessment stage.
                        </p>

                        {isAdmin ? (
                            <button
                                onClick={handleStart}
                                disabled={isStarting}
                                className="mt-6 w-full max-w-[260px] px-8 py-3.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/15 active:scale-95 transition-all inline-flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isStarting ? <Loader2 size={18} className="animate-spin" /> : (
                                    <>
                                        Start Inspection
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                                Only admin can start inspection
                            </div>
                        )}
                    </div>
                )}

                {phase === 'VERDICT' && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-5">
                            <div>
                                <h4 className="text-base font-black tracking-tight text-slate-900">Final assessment</h4>
                                <p className="mt-1 text-sm text-slate-500">Choose the inspection result and then complete the matching next step.</p>
                            </div>

                            {inspectionStatus === 'IN_PROGRESS' && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Session active</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                        Inspection was already started on {inspectionStartDate ? formatDate(inspectionStartDate) : formatDate(getLocalDate())}.
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                        Record the final verdict below to complete this session.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isAdmin && (
                                    <button
                                        onClick={() => setResult('FAULTY')}
                                        className={`p-5 rounded-2xl border-2 transition-all text-left ${result === 'FAULTY'
                                            ? 'bg-rose-50 border-rose-500 shadow-lg shadow-rose-200/50'
                                            : 'bg-white border-slate-200 hover:border-rose-200'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${result === 'FAULTY' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <ShieldAlert size={24} />
                                        </div>
                                        <p className={`mt-4 text-base font-black ${result === 'FAULTY' ? 'text-rose-700' : 'text-slate-900'}`}>Faulty battery</p>
                                        <p className="mt-1 text-[11px] font-medium text-slate-500">Use this when the unit fails inspection and must move into exchange handling.</p>
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
                                    className={`p-5 rounded-2xl border-2 transition-all text-left ${result === 'GOOD'
                                        ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-200/50'
                                        : 'bg-white border-slate-200 hover:border-emerald-200'
                                        } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${result === 'GOOD' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <ShieldCheck size={24} />
                                    </div>
                                    <p className={`mt-4 text-base font-black ${result === 'GOOD' ? 'text-emerald-700' : 'text-slate-900'}`}>Healthy battery</p>
                                    <p className="mt-1 text-[11px] font-medium text-slate-500">Use this when the unit passes inspection and should be returned to the dealer.</p>
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-4">
                            {!result && (
                                <div className="min-h-[240px] flex items-center justify-center text-center">
                                    <div>
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                            <RefreshCw size={22} />
                                        </div>
                                        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Awaiting assessment</p>
                                        <p className="mt-2 text-sm text-slate-500">Select a verdict on the left to unlock the next action.</p>
                                    </div>
                                </div>
                            )}

                            {result === 'GOOD' && (
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                        <p className="text-sm font-black text-emerald-900 uppercase tracking-[0.14em]">Return to dealer</p>
                                        <p className="mt-1 text-xs text-emerald-700">Set the return date and complete the inspection record.</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] block mb-2">Return Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={returnDate}
                                                onChange={(e) => setReturnDate(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5"
                                            />
                                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {result === 'FAULTY' && (
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                        <p className="text-sm font-black text-rose-900 uppercase tracking-[0.14em]">Move to exchange</p>
                                        <p className="mt-1 text-xs text-rose-700">Select the failure reason and hand this unit into the exchange workflow.</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] block mb-2">Failure Reason</label>
                                        <div className="relative">
                                            <select
                                                value={failureReason}
                                                onChange={(e) => setFailureReason(e.target.value)}
                                                className="w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5"
                                            >
                                                {failureReasons.map((reason) => (
                                                    <option key={reason} value={reason}>{reason}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-2 flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 font-bold rounded-xl transition-all text-sm text-slate-500 hover:bg-white hover:text-slate-700 border border-slate-200"
                            >
                                Close
                            </button>
                            {result === 'FAULTY' ? (
                                isAdmin && (
                                    <button
                                        onClick={handleSaveAndStartExchange}
                                        disabled={isSaving}
                                        className="flex-1 font-black py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all text-sm uppercase tracking-[0.18em] flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                                            <>
                                                Save And Start Exchange
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
                                        className="flex-1 font-black py-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white transition-all text-sm uppercase tracking-[0.18em] flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] disabled:opacity-30"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : (
                                            <>
                                                Complete Inspection
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
