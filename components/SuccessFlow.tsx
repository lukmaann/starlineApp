import React from 'react';
import { CheckCircle, Printer, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SuccessFlowProps {
    isOpen: boolean;
    title: string;
    details: {
        label: string;
        value: string | number;
        primary?: boolean;
    }[];
    onPrint?: () => void;
    onClose: () => void;
}

export const SuccessFlow: React.FC<SuccessFlowProps> = ({
    isOpen,
    title,
    details,
    onPrint,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-300 print:hidden">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Success Header Strip */}
                <div className="h-1.5 w-full bg-emerald-500" />

                <div className="p-10 flex flex-col items-center text-center space-y-8">
                    {/* Icon Section */}
                    <div className="relative">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center animate-in zoom-in duration-700">
                            <CheckCircle2 className="text-emerald-500" size={40} strokeWidth={2.5} />
                        </div>
                        {/* Subtle pulse ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 animate-ping -z-10" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {title}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Registry Update Finalized
                        </p>
                    </div>

                    {/* Details Board */}
                    <div className="w-full bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                        {details.map((detail, idx) => (
                            <div key={idx} className={`flex flex-col items-center space-y-1 ${idx !== 0 ? 'pt-4 border-t border-slate-200' : ''}`}>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{detail.label}</span>
                                <span className={`${detail.primary ? 'text-4xl font-black text-slate-900 tracking-tighter' : 'text-xs font-black text-blue-600 uppercase leading-tight'}`}>
                                    {detail.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                        {onPrint && (
                            <button
                                onClick={onPrint}
                                className="py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                            >
                                <Printer size={14} /> Print Receipt
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group ${!onPrint ? 'col-span-2' : ''}`}
                        >
                            Complete
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
