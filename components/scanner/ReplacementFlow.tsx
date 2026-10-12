import React from 'react';
import {
    ArrowLeft, ArrowRight, Barcode, CalendarDays, Check,
    CheckCircle2, CreditCard, Loader2, PackageCheck, ShieldCheck,
    Store, X
} from 'lucide-react';
import { formatDate } from '../../utils';
import { WarrantyCardStatus } from '../../types';

interface ReplacementFlowProps {
    isReplacing: boolean;
    setIsReplacing: (replacing: boolean) => void;
    replacementStep: number;
    setReplacementStep: (step: number) => void;
    replacementData: any;
    setReplacementData: (data: any | ((prev: any) => any)) => void;
    activeAsset: any;
    handleReplacementRequest: (e: React.FormEvent) => void;
    isConfirmingReplacement: boolean;
    setIsConfirmingReplacement: (confirming: boolean) => void;
    executeReplacement: () => void;
    isActionLoading: boolean;
    handleMarkPending: () => void;
    showReturnDatePicker: boolean;
    pendingReturnDate: string;
    setPendingReturnDate: (date: string) => void;
}

const FAILURE_MODES = [
    'DEAD CELL', 'CHARGING CIRCUIT FAILURE', 'INTERNAL SHORT-CIRCUIT',
    'EXCESSIVE PLATE SULFATION', 'CASING BULGE / LEAK', 'VOLTAGE DROP UNDER LOAD',
    'MANUFACTURING DEFECT', 'SELF-DISCHARGE ISSUE', 'OTHER'
];

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';

export const ReplacementFlow: React.FC<ReplacementFlowProps> = ({
    isReplacing,
    setIsReplacing,
    replacementStep,
    setReplacementStep,
    replacementData,
    setReplacementData,
    activeAsset,
    handleReplacementRequest,
    isConfirmingReplacement,
    setIsConfirmingReplacement,
    executeReplacement,
    isActionLoading,
    handleMarkPending,
    showReturnDatePicker,
    pendingReturnDate,
    setPendingReturnDate
}) => {
    if ((!isReplacing && !isConfirmingReplacement) || !activeAsset?.battery) return null;

    const updateData = (field: string, value: unknown) => {
        setReplacementData((previous: any) => ({ ...previous, [field]: value }));
    };
    const oldBattery = activeAsset.battery;
    const settlementMethod = replacementData.settlementMethod || 'CREDIT';
    const closeFlow = () => {
        setIsReplacing(false);
        setIsConfirmingReplacement(false);
        setReplacementStep(1);
    };
    const renderStepHeader = () => (
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            {[1, 2].map(step => (
                <React.Fragment key={step}>
                    {step > 1 && <div className="h-px w-8 bg-slate-200" />}
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${replacementStep >= step || isConfirmingReplacement ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{replacementStep > step || isConfirmingReplacement ? <Check size={14} /> : step}</span>
                    <span className={replacementStep >= step || isConfirmingReplacement ? 'text-slate-800' : ''}>{step === 1 ? 'Battery details' : 'Settlement'}</span>
                </React.Fragment>
            ))}
            {isConfirmingReplacement && <><div className="h-px w-8 bg-slate-200" /><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"><Check size={14} /></span><span className="text-slate-800">Review</span></>}
        </div>
    );

    const renderFrame = (subtitle: string, children: React.ReactNode) => (
        <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                <div>
                    <div className="flex items-center gap-2 text-blue-700"><PackageCheck size={19} /><span className="text-xs font-bold uppercase tracking-wide">Battery replacement</span></div>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                </div>
                <button type="button" onClick={closeFlow} disabled={isActionLoading} aria-label="Close replacement" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={20} /></button>
            </header>
            <div className="space-y-6 p-5 sm:p-7">
                {renderStepHeader()}
                {children}
            </div>
        </section>
    );

    const renderBatteryPair = () => (
        <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Old battery</p>
                <p className="mt-1 break-all font-mono text-base font-bold text-slate-900">{oldBattery.id}</p>
                <p className="mt-1 text-xs text-slate-500">{oldBattery.model} · {oldBattery.capacity}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <p className="text-xs font-semibold text-blue-700">Replacement battery</p>
                <p className="mt-1 break-all font-mono text-base font-bold text-slate-900">{replacementData.newBatteryId || 'No replacement battery selected'}</p>
                <p className="mt-1 text-xs text-slate-500">The replacement keeps its registered model</p>
            </div>
        </div>
    );

    const renderSettlementChoice = (value: 'CREDIT' | 'STOCK' | 'DIRECT', title: string, description: string, icon: React.ReactNode) => {
        const selected = settlementMethod === value;
        return (
            <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateData('settlementMethod', value)}
                className={`flex min-h-[7rem] w-full cursor-pointer gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
            >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{icon}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-bold text-slate-900">{title}<span className={`h-4 w-4 rounded-full border-2 ${selected ? 'border-blue-600 bg-blue-600 ring-2 ring-white ring-inset' : 'border-slate-300'}`} /></span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
            </button>
        );
    };

    if (isConfirmingReplacement) {
        const settlementLabel = settlementMethod === 'STOCK'
            ? `Stock replacement · ${replacementData.replenishmentBatteryId}`
            : settlementMethod === 'DIRECT'
                ? 'Direct settlement · settled'
                : `Account credit · ${replacementData.paidInAccount ? 'paid' : 'pending'}`;
        return renderFrame('Check the details once before saving the exchange.', <>
                {renderBatteryPair()}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">Exchange summary</div>
                    <dl className="grid gap-x-8 sm:grid-cols-2">
                        <div className="border-b border-slate-100 px-4 py-3"><dt className="text-xs text-slate-500">Reason</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{replacementData.reason || 'Not specified'}</dd></div>
                        <div className="border-b border-slate-100 px-4 py-3"><dt className="text-xs text-slate-500">Exchange date</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatDate(replacementData.replacementDate)}</dd></div>
                        <div className="border-b border-slate-100 px-4 py-3"><dt className="text-xs text-slate-500">Original sale date</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatDate(replacementData.soldDate)}</dd></div>
                        <div className="border-b border-slate-100 px-4 py-3"><dt className="text-xs text-slate-500">Warranty card</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{String(replacementData.warrantyCardStatus || 'RECEIVED').replaceAll('_', ' ')}</dd></div>
                        <div className="px-4 py-3 sm:col-span-2"><dt className="text-xs text-slate-500">Dealer settlement</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{settlementLabel}</dd></div>
                    </dl>
                </div>
                {replacementData.problemDescription?.trim() && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-semibold text-slate-800">Notes: </span>{replacementData.problemDescription}</p>}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                    <button type="button" onClick={() => setIsConfirmingReplacement(false)} disabled={isActionLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ArrowLeft size={16} />Back to edit</button>
                    <button type="button" onClick={executeReplacement} disabled={isActionLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{isActionLoading ? <><Loader2 size={17} className="animate-spin" />Saving exchange…</> : <><ShieldCheck size={18} />Confirm and save</>}</button>
                </div>
            </>);
    }

    return renderFrame('Enter the replacement details, choose how the dealer will settle, then review.', <>
            {renderBatteryPair()}

            {replacementStep === 1 ? (
                <form onSubmit={handleReplacementRequest} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className={labelClass} htmlFor="replacement-card-status">Warranty card</label><select id="replacement-card-status" className={fieldClass} value={replacementData.warrantyCardStatus} onChange={event => updateData('warrantyCardStatus', event.target.value as WarrantyCardStatus)}><option value="RECEIVED">Original card collected</option><option value="XEROX">Photocopy collected</option><option value="WHATSAPP">Digital copy received</option></select></div>
                        <div><label className={labelClass} htmlFor="replacement-sale-date">Original sale date</label><div className="relative"><CalendarDays size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input id="replacement-sale-date" required type="date" value={replacementData.soldDate} onChange={event => updateData('soldDate', event.target.value)} className={`${fieldClass} pl-10`} /></div></div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div><p className="text-sm font-semibold text-slate-800">Waiting for the old battery to be returned?</p><p className="mt-1 text-xs text-slate-500">Save it as pending and complete the exchange later.</p></div>
                            <button type="button" onClick={handleMarkPending} disabled={isActionLoading} className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{isActionLoading ? 'Saving…' : showReturnDatePicker ? 'Confirm pending' : 'Save as pending'}</button>
                        </div>
                        {showReturnDatePicker && <div className="mt-4"><label className={labelClass} htmlFor="pending-return-date">Expected return date</label><input id="pending-return-date" type="date" required value={pendingReturnDate} onChange={event => setPendingReturnDate(event.target.value)} className={fieldClass} /></div>}
                    </div>
                    <button type="submit" disabled={isActionLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Continue to settlement <ArrowRight size={17} /></button>
                </form>
            ) : (
                <form onSubmit={handleReplacementRequest} className="space-y-5">
                    <div><label className={labelClass} htmlFor="replacement-reason">Reason for replacement</label><select id="replacement-reason" className={fieldClass} value={replacementData.reason} onChange={event => updateData('reason', event.target.value)}>{FAILURE_MODES.map(reason => <option key={reason} value={reason}>{reason}</option>)}</select></div>
                    <div><label className={labelClass} htmlFor="replacement-notes">Notes <span className="font-normal text-slate-400">(optional)</span></label><textarea id="replacement-notes" rows={2} value={replacementData.problemDescription} onChange={event => updateData('problemDescription', event.target.value)} placeholder="Add a short note about the fault" className={`${fieldClass} resize-y`} /></div>
                    <fieldset className="space-y-3">
                        <legend className={labelClass}>How is the dealer settlement handled?</legend>
                        <div role="radiogroup" aria-label="Dealer settlement method" className="space-y-3">
                            {renderSettlementChoice('CREDIT', 'Account credit', 'Record the credit and whether it has been paid.', <CreditCard size={18} />)}
                            {renderSettlementChoice('STOCK', 'Send replacement stock', 'Record a stock battery sent to the dealer.', <Store size={18} />)}
                            {renderSettlementChoice('DIRECT', 'Settled directly', 'The dealer has settled this exchange directly.', <CheckCircle2 size={18} />)}
                        </div>
                    </fieldset>
                    <div className="min-h-[6.5rem]" aria-live="polite">
                        {settlementMethod === 'CREDIT' && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={!!replacementData.paidInAccount} onChange={event => updateData('paidInAccount', event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="block text-sm font-semibold text-slate-800">Credit is already paid</span><span className="mt-1 block text-xs text-slate-500">Leave unchecked to keep it pending.</span></span></label>}
                        {settlementMethod === 'STOCK' && <div><label className={labelClass} htmlFor="replacement-replenishment">Dealer stock serial</label><div className="relative"><Barcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input id="replacement-replenishment" required value={replacementData.replenishmentBatteryId} onChange={event => updateData('replenishmentBatteryId', event.target.value.toUpperCase())} placeholder="Scan or type the stock battery serial" className={`${fieldClass} pl-10 font-mono uppercase`} /></div></div>}
                        {settlementMethod === 'DIRECT' && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 size={17} />This exchange will be marked as settled.</p>}
                    </div>
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                        <button type="button" onClick={() => setReplacementStep(1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16} />Back</button>
                        <button type="submit" disabled={isActionLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">Review exchange <ArrowRight size={17} /></button>
                    </div>
                </form>
            )}
        </>);
};
