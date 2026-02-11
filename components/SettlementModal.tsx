import React, { useState, useEffect } from 'react';
import {
    X,
    FileSignature,
    Check,
    ArrowRight,
    Loader2,
    Landmark,
    Box,
    QrCode,
    CheckCircle2
} from 'lucide-react';
import { Database } from '../db';
import { getLocalDate } from '../utils';

export interface SettlementTarget {
    id: string;
    oldBatteryId: string;
    dealerName: string;
}

interface SettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    target: SettlementTarget | null;
    onSuccess: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({ isOpen, onClose, target, onSuccess }) => {
    const [resolutionMode, setResolutionMode] = useState<'STOCK' | 'CREDIT'>('CREDIT');
    const [newSerial, setNewSerial] = useState('');
    const [settlementDate, setSettlementDate] = useState(getLocalDate());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Progress Bar State (Like Batch Assignment)
    const [processingState, setProcessingState] = useState({
        isActive: false,
        progress: 0,
        stage: 'INITIALIZING' // INITIALIZING | PROCESSING | FINALIZING | COMPLETE
    });

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setResolutionMode('CREDIT');
            setNewSerial('');
            setSettlementDate(getLocalDate());
            setProcessingState({ isActive: false, progress: 0, stage: 'INITIALIZING' });
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleResolve = async () => {
        if (!target) return;

        if (resolutionMode === 'STOCK' && !newSerial.trim()) {
            window.dispatchEvent(new CustomEvent('app-notify', {
                detail: { message: 'Please enter a new battery serial', type: 'error' }
            }));
            return;
        }

        // Start 3-Second Processing Animation
        onClose(); // Close modal immediately
        setProcessingState({ isActive: true, progress: 0, stage: 'PROCESSING' });

        const startTime = Date.now();
        const DURATION = 3000; // 3 Seconds fixed duration

        // Animation Interval
        const interval = setInterval(() => {
            setProcessingState(prev => {
                if (prev.progress >= 90) return prev;
                // Logarithmic-ish increment
                const increment = Math.max(1, (90 - prev.progress) / 10);
                return { ...prev, progress: prev.progress + increment };
            });
        }, 100);

        try {
            // Perform Actual Logic
            await Database.resolveSettlement(
                target.id,
                resolutionMode,
                settlementDate,
                resolutionMode === 'STOCK' ? newSerial.trim().toUpperCase() : undefined
            );

            // Wait for remaining time to ensure 3 seconds minimum
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, DURATION - elapsed);

            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }

            // Finalize
            clearInterval(interval);
            setProcessingState({ isActive: true, progress: 100, stage: 'COMPLETE' });

            // Small delay to show 100%
            await new Promise(resolve => setTimeout(resolve, 500));

            window.dispatchEvent(new CustomEvent('app-notify', {
                detail: { message: 'Settlement resolved successfully', type: 'success' }
            }));

            onSuccess(); // Start data reload

        } catch (error: any) {
            clearInterval(interval);
            console.error('Resolution failed:', error);
            window.dispatchEvent(new CustomEvent('app-notify', {
                detail: { message: error.message || 'Failed to resolve settlement', type: 'error' }
            }));
        } finally {
            setProcessingState({ isActive: false, progress: 0, stage: 'INITIALIZING' });
            setIsSubmitting(false);
        }
    };

    if (processingState.isActive) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="w-full max-w-md space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Processing Settlement</h2>
                        <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs">
                            Updating Registry...
                        </p>
                    </div>

                    <div className="relative h-4 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
                        <div
                            className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                            style={{ width: `${processingState.progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-center text-white mono text-xs font-bold">
                        <span>{Math.round(processingState.progress)}% COMPLETE</span>
                        <span>FINALIZING</span>
                    </div>

                    <div className="pt-4 space-y-4">
                        <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                            PLEASE WAIT
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isOpen || !target) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 relative border border-slate-200">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded flex items-center justify-center">
                            <FileSignature size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Process Settlement</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{target.dealerName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Method selection - Simple buttons */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setResolutionMode('STOCK')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${resolutionMode === 'STOCK' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            Stock Replace
                        </button>
                        <button
                            onClick={() => setResolutionMode('CREDIT')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${resolutionMode === 'CREDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            Paid to Account
                        </button>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Settlement Date</label>
                        <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all outline-none text-xs uppercase"
                            value={settlementDate}
                            onChange={(e) => setSettlementDate(e.target.value)}
                        />
                    </div>

                    {resolutionMode === 'STOCK' ? (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">New Stock Serial</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Scan or Type Serial Number..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3.5 px-4 font-mono font-bold text-slate-900 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm uppercase placeholder:text-slate-300"
                                value={newSerial}
                                onChange={(e) => setNewSerial(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                            />
                        </div>
                    ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-3 text-emerald-800">
                                <Check size={18} />
                                <p className="text-[10px] font-bold uppercase tracking-widest">Financial Resolution Prepared</p>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            onClick={handleResolve}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-[0.1em] text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <>
                                    Process Settlement
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
