import React from 'react';
import {
    X, Barcode, ChevronDown, Clock, Check,
    ArrowRight, Store, CheckCircle2, Loader2, ShieldCheck,
    AlertCircle, Calendar
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
    replacementInputRef: React.RefObject<HTMLInputElement>;
}

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
    setPendingReturnDate,
    replacementInputRef
}) => {
    if (!isReplacing && !isConfirmingReplacement) return null;

    if (isReplacing && !isConfirmingReplacement) {
        return (
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-6 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600"></div>
                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Exchange Protocol</h3>
                        <p className="text-xs font-bold text-amber-600 uppercase mt-1 tracking-widest bg-amber-50 px-2 py-1 rounded-md inline-block border border-amber-100">
                            Swapping Model: {activeAsset.battery.model}
                        </p>
                    </div>
                    <button
                        onClick={() => { setIsReplacing(false); setReplacementStep(1); }}
                        className="p-3 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {replacementStep === 1 ? (
                    <form onSubmit={handleReplacementRequest} className="space-y-8 py-4">
                        <div className="space-y-4">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Step 1: Scan Replacement Unit</label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                    <Barcode size={32} />
                                </div>
                                <input
                                    ref={replacementInputRef}
                                    required
                                    autoFocus
                                    placeholder="SCAN NEW SERIAL..."
                                    className="w-full pl-20 pr-6 py-8 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-3xl outline-none focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/10 uppercase transition-all mono placeholder:text-slate-300"
                                    value={replacementData.newBatteryId}
                                    onChange={e => setReplacementData({ ...replacementData, newBatteryId: e.target.value.toUpperCase() })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (replacementData.newBatteryId) {
                                                document.getElementById('card-status-select')?.focus();
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Warranty Proof Status</label>
                                <div className="relative">
                                    <select
                                        id="card-status-select"
                                        required
                                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm uppercase outline-none focus:border-amber-500 transition-all cursor-pointer appearance-none text-slate-700"
                                        value={replacementData.warrantyCardStatus}
                                        onChange={e => setReplacementData({ ...replacementData, warrantyCardStatus: e.target.value as WarrantyCardStatus })}
                                    >
                                        <option value="RECEIVED">Original Card Collected</option>
                                        <option value="XEROX">Xerox Only</option>
                                        <option value="WHATSAPP">Digital / WhatsApp</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Original Sale Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-900 focus:border-amber-500 transition-all"
                                    value={replacementData.soldDate}
                                    onChange={(e) => setReplacementData({ ...replacementData, soldDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {showReturnDatePicker && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Returning Date</label>
                                <input
                                    type="date"
                                    className="w-full px-7 py-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl outline-none focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/10 transition-all mono shadow-inner"
                                    value={pendingReturnDate}
                                    onChange={e => setPendingReturnDate(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={handleMarkPending}
                                disabled={isActionLoading}
                                className={`px-8 py-6 font-bold rounded-2xl transition-all uppercase text-sm tracking-widest flex items-center justify-center gap-2 ${showReturnDatePicker ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {showReturnDatePicker ? (
                                    <>
                                        <Check size={20} strokeWidth={3} />
                                        Confirm & Mark Pending
                                    </>
                                ) : (
                                    <>
                                        <Clock size={20} />
                                        Keep Pending
                                    </>
                                )}
                            </button>
                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className="flex-1 bg-blue-600 text-white font-black py-6 rounded-2xl hover:bg-blue-700 transition-all uppercase text-lg tracking-[0.2em] flex items-center justify-center gap-4 shadow-xl shadow-blue-500/20 group"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : <>Validate Unit <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" /></>}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-6 flex flex-col justify-center border-r border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"> Old Battery</p>
                                <p className="text-2xl font-black mono text-rose-600 break-all">{activeAsset.battery.id}</p>
                            </div>
                            <div className="bg-emerald-50/50 p-6 flex flex-col justify-center items-end text-right">
                                <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">New Battery</p>
                                <p className="text-2xl font-black mono text-emerald-600 break-all">{replacementData.newBatteryId}</p>
                            </div>
                        </div>

                        <form onSubmit={handleReplacementRequest} className="space-y-8">

                            <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-4">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                    <Store size={18} className="text-blue-600" /> Dealer Settlement Method
                                </h4>

                                <div className="grid grid-cols-3 gap-4">
                                    <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${replacementData.settlementMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="settlementMethod"
                                            value="CREDIT"
                                            className="hidden"
                                            checked={replacementData.settlementMethod === 'CREDIT'}
                                            onChange={() => setReplacementData(prev => ({ ...prev, settlementMethod: 'CREDIT' }))}
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${replacementData.settlementMethod === 'CREDIT' ? 'border-blue-600' : 'border-slate-300'}`}>
                                                {replacementData.settlementMethod === 'CREDIT' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                            </div>
                                            <span className={`font-bold uppercase text-xs ${replacementData.settlementMethod === 'CREDIT' ? 'text-blue-700' : 'text-slate-500'}`}>Account Credit</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium pl-6">Value credited. Pending/Paid status.</p>
                                    </label>

                                    <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${replacementData.settlementMethod === 'STOCK' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="settlementMethod"
                                            value="STOCK"
                                            className="hidden"
                                            checked={replacementData.settlementMethod === 'STOCK'}
                                            onChange={() => setReplacementData(prev => ({ ...prev, settlementMethod: 'STOCK' }))}
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${replacementData.settlementMethod === 'STOCK' ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                {replacementData.settlementMethod === 'STOCK' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                            </div>
                                            <span className={`font-bold uppercase text-xs ${replacementData.settlementMethod === 'STOCK' ? 'text-indigo-700' : 'text-slate-500'}`}>Stock Replacement</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium pl-6">Physical battery given to dealer now.</p>
                                    </label>

                                    <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${replacementData.settlementMethod === 'DIRECT' ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="settlementMethod"
                                            value="DIRECT"
                                            className="hidden"
                                            checked={replacementData.settlementMethod === 'DIRECT'}
                                            onChange={() => setReplacementData(prev => ({ ...prev, settlementMethod: 'DIRECT' }))}
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${replacementData.settlementMethod === 'DIRECT' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                                {replacementData.settlementMethod === 'DIRECT' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                                            </div>
                                            <span className={`font-bold uppercase text-xs ${replacementData.settlementMethod === 'DIRECT' ? 'text-emerald-700' : 'text-slate-500'}`}>Direct Settlement</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium pl-6">Immediate handover of {replacementData.newBatteryId}. No tracking.</p>
                                    </label>
                                </div>

                                {replacementData.settlementMethod === 'CREDIT' && (
                                    <div className="p-4 bg-blue-100/50 rounded-xl border border-blue-200 transition-all animate-in fade-in slide-in-from-top-1 cursor-pointer" onClick={() => setReplacementData(prev => ({ ...prev, paidInAccount: !prev.paidInAccount }))}>
                                        <label className="flex items-center gap-4 cursor-pointer select-none">
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${replacementData.paidInAccount ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'}`}>
                                                {replacementData.paidInAccount && <CheckCircle2 size={16} />}
                                            </div>
                                            <div>
                                                <span className="text-xs font-black text-blue-900 uppercase block">Mark as Paid?</span>
                                                <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Tick to confirm payment settled</span>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                {replacementData.settlementMethod === 'STOCK' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider ml-1 flex items-center gap-2">
                                            <Barcode size={14} /> Scan Replenishment Unit (For Dealer)
                                        </label>
                                        <input
                                            required
                                            placeholder="SCAN DEALER UNIT..."
                                            className="w-full px-6 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl font-bold text-xl outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 uppercase transition-all mono placeholder:text-indigo-300 text-indigo-900"
                                            value={replacementData.replenishmentBatteryId}
                                            onChange={e => setReplacementData({ ...replacementData, replenishmentBatteryId: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                )}

                                {replacementData.settlementMethod === 'DIRECT' && (
                                    <div className="p-4 bg-emerald-100/50 rounded-xl border border-emerald-200 transition-all animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center gap-3 text-emerald-800">
                                            <CheckCircle2 size={20} />
                                            <div>
                                                <span className="text-xs font-black uppercase block">Settled Directly</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Transaction will be marked as fully settled.</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setReplacementStep(1)} className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Back</button>
                                <button type="submit" className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black py-5 rounded-xl hover:from-black hover:to-slate-900 transition-all uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transform active:scale-[0.99]">
                                    Review & Authorize Swap <ArrowRight size={20} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    // Confirmation View
    return (
        <div className="bg-slate-900 text-white rounded-[2rem] p-12 border-4 border-amber-500 shadow-2xl animate-in zoom-in-95 duration-300 space-y-12 max-w-4xl mx-auto overflow-y-auto max-h-[90vh]">
            <div className="flex flex-col items-center text-center space-y-4 border-b border-white/10 pb-8">
                <div className="p-5 bg-amber-500 text-slate-900 rounded-3xl shadow-lg shadow-amber-500/20 mb-2">
                    <ShieldCheck size={48} />
                </div>
                <div>
                    <h3 className="text-4xl font-black tracking-tighter uppercase leading-none mb-2">Final Authorization</h3>
                    <p className="text-amber-500 text-xs font-black uppercase tracking-[0.4em]">Please confirm exchange details</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-white/5 rounded-3xl p-2 border border-white/10">
                    <div className="grid grid-cols-2 divide-x divide-white/5">
                        <div className="p-8 text-center bg-rose-500/10 rounded-l-2xl">
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Old battery number</p>
                            <p className="text-3xl font-black mono text-white truncate break-all">{activeAsset.battery.id}</p>
                        </div>
                        <div className="p-8 text-center bg-emerald-500/10 rounded-r-2xl">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">new battery number</p>
                            <p className="text-3xl font-black mono text-white truncate break-all">{replacementData.newBatteryId}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Exchange Date</p>
                        <p className="text-xs font-black text-white mono">{formatDate(replacementData.replacementDate)}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Evidence Status</p>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-wide">{replacementData.warrantyCardStatus.replace('_', ' ')}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Dealer Settlement</p>
                        {replacementData.settlementMethod === 'STOCK' ? (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase">Stock Replaced</span>
                                <span className="text-xs font-black text-white mono truncate">{replacementData.replenishmentBatteryId}</span>
                            </div>
                        ) : replacementData.settlementMethod === 'DIRECT' ? (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">Method</span>
                                <span className="text-xs font-black text-white uppercase tracking-wider">DIRECT SETTLEMENT</span>
                            </div>
                        ) : (
                            <div className={`text-xs font-black uppercase tracking-wide justify-center flex items-center gap-2 ${replacementData.paidInAccount ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {replacementData.paidInAccount ? <><CheckCircle2 size={14} /> PAID</> : 'PENDING'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-amber-500/60 uppercase mb-2">battery selling date by dealer </p>
                    <p className="text-xl font-black text-amber-400 mono">{formatDate(replacementData.soldDate)}</p>
                </div>
            </div>

            <div className="flex flex-col gap-4 pt-4">
                <button onClick={executeReplacement} disabled={isActionLoading} className="w-full py-6 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-[0.2em] text-lg flex items-center justify-center gap-4 transform active:scale-[0.98]">
                    {isActionLoading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                    Confirm & Finalize Swap
                </button>
                <button onClick={() => setIsConfirmingReplacement(false)} className="w-full py-4 bg-white/5 text-slate-400 font-bold rounded-2xl hover:bg-white/10 hover:text-white uppercase tracking-widest text-xs transition-all border border-white/5">
                    Cancel & Back
                </button>
            </div>
        </div >
    );
};
