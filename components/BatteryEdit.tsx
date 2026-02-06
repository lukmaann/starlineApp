import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import { Battery, Replacement, Sale, WarrantyCardStatus } from '../types';
import { getLocalDate, formatDate } from '../utils';
import {
    Save, ShieldCheck, X, Calendar, User, Phone,
    CreditCard, CheckCircle2, AlertCircle, Loader2,
    Store, Barcode, ChevronDown, History, Zap
} from 'lucide-react';

interface BatteryEditProps {
    batteryId: string;
    onClose: () => void;
    onUpdate: () => void;
}

const BatteryEdit: React.FC<BatteryEditProps> = ({ batteryId, onClose, onUpdate }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeAsset, setActiveAsset] = useState<{
        battery: Battery;
        sale?: Sale;
        originalSale?: Sale;
        replacement?: Replacement;
    } | null>(null);

    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        soldDate: '',
        // Replacement specific fields
        settlementMethod: 'CREDIT' as 'CREDIT' | 'STOCK' | 'DIRECT',
        paidInAccount: false,
        replenishmentBatteryId: '',
        warrantyCardStatus: 'RECEIVED' as WarrantyCardStatus,
        reason: ''
    });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await Database.searchBattery(batteryId);
                if (data && data.battery) {
                    const incomingReplacement = data.replacements.find(r => r.newBatteryId === batteryId);
                    const saleRecord = data.sale || data.originalSale;

                    setActiveAsset({
                        battery: data.battery,
                        sale: data.sale,
                        originalSale: data.originalSale,
                        replacement: incomingReplacement
                    });

                    setFormData({
                        customerName: data.battery.customerName || saleRecord?.customerName || '',
                        customerPhone: data.battery.customerPhone || saleRecord?.customerPhone || '',
                        soldDate: data.battery.actualSaleDate || saleRecord?.warrantyStartDate || data.battery.activationDate || '',

                        settlementMethod: (incomingReplacement?.settlementType as any) || 'CREDIT',
                        paidInAccount: incomingReplacement?.paidInAccount || false,
                        replenishmentBatteryId: incomingReplacement?.replenishmentBatteryId || '',
                        warrantyCardStatus: incomingReplacement?.warrantyCardStatus || 'RECEIVED',
                        reason: incomingReplacement?.reason || ''
                    });
                }
            } catch (error) {
                console.error("Failed to load battery details", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [batteryId]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (activeAsset?.battery) {
                await Database.run(
                    `UPDATE batteries SET customerName = ?, customerPhone = ? WHERE id = ?`,
                    [formData.customerName, formData.customerPhone, batteryId]
                );

                if (activeAsset.sale) {
                    await Database.run(
                        `UPDATE sales SET customerName = ?, customerPhone = ? WHERE id = ?`,
                        [formData.customerName, formData.customerPhone, activeAsset.sale.id]
                    );
                }
            }

            if (formData.soldDate && activeAsset?.battery) {
                await Database.correctSaleDate(
                    batteryId,
                    formData.soldDate,
                    'WARRANTY_CARD',
                    undefined,
                    'Manual Correction via Edit Page'
                );
            }

            if (activeAsset?.replacement) {
                let replId = formData.replenishmentBatteryId;
                let paid = formData.paidInAccount;

                if (formData.settlementMethod === 'DIRECT') {
                    replId = '';
                    paid = false;
                } else if (formData.settlementMethod === 'CREDIT') {
                    replId = '';
                }

                await Database.run(
                    `UPDATE replacements SET 
                        settlementType = ?, 
                        paidInAccount = ?, 
                        replenishmentBatteryId = ?,
                        warrantyCardStatus = ?,
                        reason = ?
                     WHERE id = ?`,
                    [
                        formData.settlementMethod,
                        paid ? 1 : 0,
                        replId,
                        formData.warrantyCardStatus,
                        formData.reason,
                        activeAsset.replacement.id
                    ]
                );
            }

            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to update record');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

    return (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-6 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600"></div>

            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Edit Registry Record</h3>
                    <p className="text-xs font-bold text-amber-600 uppercase mt-1 tracking-widest bg-amber-50 px-2 py-1 rounded-md inline-block border border-amber-100">
                        Modifying: {activeAsset?.battery.id}
                    </p>
                </div>
                <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-2xl transition-all">
                    <X size={24} />
                </button>
            </div>

            <div className="space-y-8">
                {/* Battery Comparison / Split View */}
                <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    {/* LEFT SIDE: Old Battery / Predecessor */}
                    <div className="bg-slate-50 p-6 flex flex-col justify-center border-r border-slate-200 relative">
                        {activeAsset?.replacement ? (
                            <>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Original Battery (Reference)</p>
                                <p className="text-2xl font-black mono text-rose-600 break-all">{activeAsset.replacement.oldBatteryId}</p>
                                <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase">
                                    Replaced on: <span className="mono text-slate-600">{formatDate(activeAsset.replacement.replacementDate)}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Origin Source</p>
                                <p className="text-xl font-black text-slate-700/50 uppercase">Original Sale / Stock</p>
                                <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase">
                                    Manufactured: <span className="mono text-slate-600">{formatDate(activeAsset?.battery.manufactureDate)}</span>
                                </div>
                            </>
                        )}
                        <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                            <History size={64} />
                        </div>
                    </div>

                    {/* RIGHT SIDE: To Be Edited (New Battery) */}
                    <div className="bg-emerald-50/50 p-6 flex flex-col justify-center items-end text-right relative overflow-hidden">
                        <div className="absolute left-4 bottom-4 opacity-5 pointer-events-none">
                            <Zap size={64} />
                        </div>
                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Current Battery (Editing)</p>
                        <p className="text-3xl font-black mono text-emerald-600 break-all">{batteryId}</p>
                        <div className="mt-2 text-[10px] font-bold text-emerald-700/60 uppercase">
                            Status: {activeAsset?.battery.status}
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-8">

                    {/* 1. Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Customer Name</label>
                            <div className="relative">
                                <input
                                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg uppercase outline-none focus:border-amber-500 transition-all text-slate-700 placeholder:text-slate-300"
                                    value={formData.customerName}
                                    onChange={e => setFormData({ ...formData, customerName: e.target.value.toUpperCase() })}
                                    placeholder="WALK-IN CUSTOMER"
                                />
                                <User className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                            <div className="relative">
                                <input
                                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg uppercase outline-none focus:border-amber-500 transition-all text-slate-700 placeholder:text-slate-300 mono"
                                    value={formData.customerPhone}
                                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                    placeholder="N/A"
                                />
                                <Phone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Sale Date / Warranty Start - CRITICAL */}
                    <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Calendar size={100} /></div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Calendar size={20} /></div>
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                                {activeAsset?.replacement ? 'Warranty Continuation Date' : 'Original Sale Date'}
                            </h4>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className="text-[10px] font-bold text-amber-700  ml-1 uppercase tracking-widest">Effective Date</label>
                            <input
                                type="date"
                                className="w-full px-6 py-4 bg-white border-2 border-amber-200 rounded-xl outline-none font-black text-xl text-slate-900 focus:border-amber-500 focus:shadow-lg focus:shadow-amber-500/10 transition-all"
                                value={formData.soldDate}
                                onChange={(e) => setFormData({ ...formData, soldDate: e.target.value })}
                            />
                            <p className="text-[10px] text-amber-800 font-bold mt-2 flex items-center gap-2">
                                <AlertCircle size={12} />
                                changing this date will recalculate warranty expiry for this and all future units.
                            </p>
                        </div>
                    </div>

                    {/* 3. Settlement / Replacement Logic */}
                    {activeAsset?.replacement && (
                        <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-4">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <Store size={18} className="text-blue-600" /> Dealer Settlement (Editing)
                            </h4>

                            <div className="grid grid-cols-3 gap-4">
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${formData.settlementMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="settlementMethod" value="CREDIT" className="hidden" checked={formData.settlementMethod === 'CREDIT'} onChange={() => setFormData(prev => ({ ...prev, settlementMethod: 'CREDIT' }))} />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.settlementMethod === 'CREDIT' ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {formData.settlementMethod === 'CREDIT' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${formData.settlementMethod === 'CREDIT' ? 'text-blue-700' : 'text-slate-500'}`}>Account Credit</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-6">Value credited.</p>
                                </label>

                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${formData.settlementMethod === 'STOCK' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="settlementMethod" value="STOCK" className="hidden" checked={formData.settlementMethod === 'STOCK'} onChange={() => setFormData(prev => ({ ...prev, settlementMethod: 'STOCK' }))} />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.settlementMethod === 'STOCK' ? 'border-indigo-600' : 'border-slate-300'}`}>
                                            {formData.settlementMethod === 'STOCK' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${formData.settlementMethod === 'STOCK' ? 'text-indigo-700' : 'text-slate-500'}`}>Stock Replacement</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-6">Physical battery back.</p>
                                </label>

                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${formData.settlementMethod === 'DIRECT' ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="settlementMethod" value="DIRECT" className="hidden" checked={formData.settlementMethod === 'DIRECT'} onChange={() => setFormData(prev => ({ ...prev, settlementMethod: 'DIRECT' }))} />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.settlementMethod === 'DIRECT' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                            {formData.settlementMethod === 'DIRECT' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${formData.settlementMethod === 'DIRECT' ? 'text-emerald-700' : 'text-slate-500'}`}>Direct Settlement</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-6">Immediate handover.</p>
                                </label>
                            </div>

                            {formData.settlementMethod === 'STOCK' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider ml-1 flex items-center gap-2">
                                        <Barcode size={14} /> Replenishment Unit ID
                                    </label>
                                    <input
                                        placeholder="SCAN DEALER UNIT..."
                                        className="w-full px-6 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl font-bold text-xl outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 uppercase transition-all mono placeholder:text-indigo-300 text-indigo-900"
                                        value={formData.replenishmentBatteryId}
                                        onChange={e => setFormData({ ...formData, replenishmentBatteryId: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            )}

                            {formData.settlementMethod === 'CREDIT' && (
                                <div className="p-4 bg-blue-100/50 rounded-xl border border-blue-200 transition-all animate-in fade-in slide-in-from-top-1 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paidInAccount: !prev.paidInAccount }))}>
                                    <label className="flex items-center gap-4 cursor-pointer select-none">
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${formData.paidInAccount ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'}`}>
                                            {formData.paidInAccount && <CheckCircle2 size={16} />}
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-blue-900 uppercase block">Mark as Paid?</span>
                                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Tick to confirm payment settled</span>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <button onClick={onClose} className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black py-5 rounded-xl hover:from-black hover:to-slate-900 transition-all uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transform active:scale-[0.99] disabled:opacity-50">
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatteryEdit;
