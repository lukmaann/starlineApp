import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Printer } from 'lucide-react';
import { playOutcomeSound } from '../utils/notifications';

interface SuccessFlowProps {
    isOpen: boolean;
    variant?: 'success' | 'error';
    title: string;
    description?: string;
    details: {
        label: string;
        value: string | number;
        primary?: boolean;
    }[];
    onPrint?: () => void;
    printLabel?: string;
    closeLabel?: string;
    onClose: () => void;
}

export const SuccessFlow: React.FC<SuccessFlowProps> = ({
    isOpen,
    variant = 'success',
    title,
    description,
    details,
    onPrint,
    printLabel = 'Print Receipt',
    closeLabel,
    onClose
}) => {
    useEffect(() => {
        if (isOpen) playOutcomeSound(variant);
    }, [isOpen, variant]);

    if (!isOpen) return null;

    const isSuccess = variant === 'success';
    const accent = isSuccess
        ? { strip: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100', button: 'bg-slate-900 hover:bg-slate-800', label: 'Completed' }
        : { strip: 'bg-rose-500', icon: 'bg-rose-50 text-rose-600 ring-rose-100', button: 'bg-rose-600 hover:bg-rose-700', label: 'Could not complete' };

    return createPortal(
        <div className="fixed inset-0 z-[5000] flex items-center justify-center overflow-y-auto p-4 sm:p-6 animate-in fade-in duration-200 print:hidden" role="presentation">
            <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" />
            <section role="alertdialog" aria-modal="true" aria-labelledby="result-flow-title" className="relative z-10 my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_-32px_rgba(15,23,42,0.55)] animate-in zoom-in-95 duration-200">
                <div className={`h-1.5 w-full ${accent.strip}`} />
                <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent.icon}`}>
                            {isSuccess ? <CheckCircle2 size={25} strokeWidth={2.25} /> : <AlertCircle size={25} strokeWidth={2.25} />}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${isSuccess ? 'text-emerald-700' : 'text-rose-700'}`}>{accent.label}</p>
                            <h2 id="result-flow-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
                            {description && <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>}
                        </div>
                    </div>

                    {details.length > 0 && (
                        <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/70 px-4">
                            {details.map((detail, idx) => (
                                <div key={`${detail.label}-${idx}`} className="flex items-start justify-between gap-4 py-3.5">
                                    <dt className="shrink-0 text-xs font-medium text-slate-500">{detail.label}</dt>
                                    <dd className={`min-w-0 text-right text-sm font-semibold leading-5 break-words ${detail.primary ? 'font-mono text-slate-950' : 'text-slate-700'}`}>{detail.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.button}`}>
                            {closeLabel || (isSuccess ? 'Done' : 'Close')}
                            <ArrowRight size={15} />
                        </button>
                        {onPrint && (
                            <button type="button" onClick={onPrint} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                                <Printer size={16} /> {printLabel}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </div>,
        document.body
    );
};
