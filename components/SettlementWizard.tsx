
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Check, 
    ArrowRight, 
    Loader2, 
    FileSignature, 
    Box, 
    Store,
    Calendar,
    QrCode,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    ShieldCheck
} from 'lucide-react';
import { Database } from '../db';
import { formatDate, getLocalDate } from '../utils';
import { ProgressFlow } from './ProgressFlow';
import { SuccessFlow } from './SuccessFlow';

export interface SettlementTarget {
    id: string;
    oldBatteryId: string;
    dealerName: string;
}

interface SettlementWizardProps {
    isOpen: boolean;
    onClose: () => void;
    target: SettlementTarget | null;
    onSuccess: () => void;
}

export const SettlementWizard: React.FC<SettlementWizardProps> = ({ isOpen, onClose, target, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [resolutionMode, setResolutionMode] = useState<'STOCK' | 'CREDIT'>('CREDIT');
    const [newSerial, setNewSerial] = useState('');
    const [settlementDate, setSettlementDate] = useState(getLocalDate());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    // Progress Bar State
    const [processingState, setProcessingState] = useState({
        isActive: false,
        progress: 0,
        stage: 'INITIALIZING'
    });

    // Success State
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setResolutionMode('CREDIT');
            setNewSerial('');
            setSettlementDate(getLocalDate());
            setProcessingState({ isActive: false, progress: 0, stage: 'INITIALIZING' });
            setIsSubmitting(false);
            setShowConfirm(false);
            setShowSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen || !target) return null;

    const handleNext = () => {
        if (step === 1 && resolutionMode === 'STOCK' && !newSerial.trim()) {
            window.dispatchEvent(new CustomEvent('app-notify', {
                detail: { message: 'Please enter a new battery serial', type: 'error' }
            }));
            return;
        }
        if (step < 2) {
            setStep(s => s + 1);
        } else {
            setShowConfirm(true);
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(s => s - 1);
    };

    const handleFinalConfirm = async () => {
        setShowConfirm(false);
        setIsSubmitting(true);
        setProcessingState({ isActive: true, progress: 0, stage: 'PROCESSING' });

        const startTime = Date.now();
        const DURATION = 2000; 

        const interval = setInterval(() => {
            setProcessingState(prev => {
                if (prev.progress >= 90) return prev;
                const increment = Math.max(1, (90 - prev.progress) / 8);
                return { ...prev, progress: prev.progress + increment };
            });
        }, 100);

        try {
            await Database.resolveSettlement(
                target.id,
                resolutionMode,
                settlementDate,
                resolutionMode === 'STOCK' ? newSerial.trim().toUpperCase() : undefined
            );

            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, DURATION - elapsed);

            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }

            clearInterval(interval);
            setProcessingState({ isActive: true, progress: 100, stage: 'COMPLETE' });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            setProcessingState(p => ({ ...p, isActive: false }));
            setShowSuccess(true);

        } catch (error: any) {
            clearInterval(interval);
            console.error('Resolution failed:', error);
            window.dispatchEvent(new CustomEvent('app-notify', {
                detail: { message: error.message || 'Failed to resolve settlement', type: 'error' }
            }));
            setIsSubmitting(false);
            setProcessingState({ isActive: false, progress: 0, stage: 'INITIALIZING' });
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 0: // Context
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Target</span>
                                <div className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-tight">
                                    Pending Settle
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
                                        <QrCode size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Battery</p>
                                        <p className="text-base font-black text-slate-900 mono">{target.oldBatteryId}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400">
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Dealer</p>
                                        <p className="text-base font-black text-slate-900 uppercase truncate max-w-[150px]">{target.dealerName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-center gap-4">
                            <ShieldCheck className="text-blue-500 shrink-0" size={20} />
                            <p className="text-[11px] text-blue-700/80 font-bold leading-tight">Verify physical unit receipt before final registry update.</p>
                        </div>
                    </div>
                );

            case 1: // Configuration
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setResolutionMode('STOCK')}
                                className={`relative p-5 rounded-3xl border-2 transition-all text-left flex flex-col gap-3 group ${resolutionMode === 'STOCK' ? 'border-slate-900 bg-white ring-8 ring-slate-900/5' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${resolutionMode === 'STOCK' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600 border border-slate-100 shadow-sm'}`}>
                                    <Box size={20} />
                                </div>
                                <div>
                                    <p className={`font-black text-xs uppercase tracking-tight ${resolutionMode === 'STOCK' ? 'text-slate-900' : 'text-slate-500'}`}>Stock Replacement</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-1 leading-relaxed">Issue a new unit from factory stock.</p>
                                </div>
                                {resolutionMode === 'STOCK' && <div className="absolute top-4 right-4 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300"><Check size={12} strokeWidth={3} /></div>}
                            </button>
                            <button
                                onClick={() => setResolutionMode('CREDIT')}
                                className={`relative p-5 rounded-3xl border-2 transition-all text-left flex flex-col gap-3 group ${resolutionMode === 'CREDIT' ? 'border-slate-900 bg-white ring-8 ring-slate-900/5' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${resolutionMode === 'CREDIT' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600 border border-slate-100 shadow-sm'}`}>
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <p className={`font-black text-xs uppercase tracking-tight ${resolutionMode === 'CREDIT' ? 'text-slate-900' : 'text-slate-500'}`}>Paid in Account</p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-1 leading-relaxed">Adjust dealer ledger with financial credit.</p>
                                </div>
                                {resolutionMode === 'CREDIT' && <div className="absolute top-4 right-4 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300"><Check size={12} strokeWidth={3} /></div>}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Settlement Date</label>
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="date"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase"
                                        value={settlementDate}
                                        onChange={e => setSettlementDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {resolutionMode === 'STOCK' && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 flex flex-col">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">New Serial</label>
                                    <div className="relative flex-1">
                                        <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            autoFocus
                                            placeholder="SCAN UNIT..."
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase mono placeholder:text-slate-300"
                                            value={newSerial}
                                            onChange={e => setNewSerial(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 2: // Review
                return (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="rounded-[32px] border border-slate-100 bg-white overflow-hidden shadow-2xl shadow-slate-200/40">
                            <div className="p-8 text-center border-b border-slate-50 bg-slate-50/30">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Settle Method</p>
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full">
                                    {resolutionMode === 'STOCK' ? <Box size={14} /> : <CreditCard size={14} />}
                                    <span className="text-[9px] font-black uppercase tracking-widest">{resolutionMode === 'STOCK' ? 'Stock Replace' : 'Paid in Account'}</span>
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 text-left">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Case ID</span>
                                    <p className="text-xs font-black text-slate-900">{target.id}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Battery Serial</span>
                                    <p className="text-xs font-black text-slate-900 mono">{target.oldBatteryId}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dealer Partner</span>
                                    <p className="text-xs font-black text-slate-900 uppercase truncate">{target.dealerName}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Settle Date</span>
                                    <p className="text-xs font-black text-slate-900">{formatDate(settlementDate)}</p>
                                </div>
                                {resolutionMode === 'STOCK' && (
                                    <div className="space-y-1 col-span-full pt-4 border-t border-slate-50">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Replacement Unit ID</span>
                                        <p className="text-lg font-black text-blue-600 mono uppercase tracking-tight">{newSerial}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return createPortal(
        <>
            <ProgressFlow
                isOpen={processingState.isActive}
                title="Processing Settlement"
                subtitle="Updating Enterprise Registry..."
                progress={processingState.progress}
                stageLabel={processingState.progress >= 90 ? "FINALIZING TRANSACTION" : "SYNCING RECORDS"}
            />

            <SuccessFlow 
                isOpen={showSuccess}
                title="Settlement Done"
                details={[
                    { label: 'Method', value: resolutionMode === 'STOCK' ? 'STOCK REPLACE' : 'PAID IN ACCOUNT' },
                    { label: 'Claim ID', value: target.id },
                    { label: 'Date', value: formatDate(settlementDate) }
                ]}
                onClose={() => {
                    setShowSuccess(false);
                    onSuccess();
                    onClose();
                }}
            />

            {/* Main Wizard */}
            <div className="fixed inset-0 bg-white z-[200] overflow-y-auto animate-in fade-in duration-300 font-sans">
                {/* Header Navigation */}
                <div className="sticky top-0 bg-white border-b border-slate-100 z-10 px-8 flex items-center justify-between h-20">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                            <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Step {step + 1} of 3</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`} />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-90"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="max-w-2xl mx-auto py-8 px-8 min-h-[calc(100vh-80px)] flex flex-col">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-4 transform hover:rotate-3 transition-transform duration-500">
                            <FileSignature size={28} strokeWidth={1.5} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                            {step === 0 ? 'Assigned Case' : step === 1 ? 'Settlement Method' : 'Final Review'}
                        </h1>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Starline Enterprise</p>
                    </div>

                    <div className="flex-1">
                        {renderStepContent()}
                    </div>

                    <div className="mt-12 flex items-center justify-between pt-6 border-t border-slate-100">
                        <button
                            onClick={step === 0 ? onClose : handleBack}
                            className="px-6 py-3 rounded-xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                        >
                            {step === 0 ? 'Exit' : 'Go Back'}
                        </button>

                        <button
                            onClick={handleNext}
                            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2 group"
                        >
                            {step === 2 ? 'Finish Settle' : 'Continue'}
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                </div>

                {/* Confirmation Modal Overlay */}
                {showConfirm && (
                    <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="p-10 space-y-8 text-center">
                                <div className="w-20 h-20 bg-amber-50 rounded-[24px] flex items-center justify-center mx-auto text-amber-500">
                                    <AlertCircle size={40} />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Execute Settle</h2>
                                    <p className="text-xs font-semibold text-slate-500 leading-relaxed px-6">
                                        Confirming a <span className="text-slate-900">{resolutionMode === 'STOCK' ? 'Stock Replacement' : 'Paid in Account'}</span> for <span className="font-bold text-slate-900 mono">{target.oldBatteryId}</span>. This is permanent.
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold uppercase text-[9px] tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Go Back
                                    </button>
                                    <button
                                        onClick={handleFinalConfirm}
                                        className="flex-1 py-3.5 bg-slate-900 text-white font-black uppercase text-[9px] tracking-[0.15em] rounded-xl hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                    >
                                        Execute
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>,
        document.body
    );
};
