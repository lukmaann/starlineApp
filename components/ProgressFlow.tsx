import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface ProgressFlowProps {
    isOpen: boolean;
    title: string;
    subtitle?: string;
    progress: number;
    stageLabel?: string;
    onCancel?: () => void;
}

export const ProgressFlow: React.FC<ProgressFlowProps> = ({
    isOpen,
    title,
    subtitle,
    progress,
    stageLabel,
    onCancel
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[5000] bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-300 print:hidden">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-500">
                {/* Progress Strip */}
                <div className="h-1.5 w-full bg-slate-50">
                    <div
                        className="h-full bg-slate-900 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                            <Loader2 className="animate-spin text-slate-400" size={18} />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Step Status</span>
                                <p className="text-xs font-bold text-slate-900 uppercase">
                                    {stageLabel || 'Processing Task...'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Completion</span>
                                <p className="text-sm font-black text-slate-900 mono">
                                    {Math.round(progress)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {onCancel && (
                        <div className="pt-2 border-t border-slate-50 flex justify-center">
                            <button
                                onClick={onCancel}
                                className="px-6 py-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel Process
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
