import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { MaterialPurchase, RawMaterial } from '../types';
import { getLocalDate } from '../utils';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Filter, Loader2, Package2, RefreshCw, Search, X, ChevronRight, Calculator } from 'lucide-react';

const PAGE_SIZE = 10;

type PurchaseStep = 1 | 2 | 3;

interface PurchasesProps {
    onNavigate?: (tab: string) => void;
}

const fmtQty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(2));

export default function Purchases({ onNavigate }: PurchasesProps) {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [data, setData] = useState<MaterialPurchase[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoad, setIsLoad] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [showWizard, setShowWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [step, setStep] = useState<PurchaseStep>(1);

    // Side Panel State
    const [selectedPurchase, setSelectedPurchase] = useState<MaterialPurchase | null>(null);

    const [form, setForm] = useState({
        material_id: '',
        date: getLocalDate(),
        quantity: '',
        unit_price: '',
        transport_cost: '',
        supplier_name: '',
    });

    const [filterMaterialId, setFilterMaterialId] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const qty = Number(form.quantity);
    const price = Number(form.unit_price);
    const transport = Number(form.transport_cost) || 0;
    const totalCost = Number.isFinite(qty) && Number.isFinite(price) ? qty * price + transport : 0;

    const selectedMaterial = materials.find((m) => m.id === form.material_id);
    const canGoStep2 = Boolean(form.material_id && form.date);
    const canGoStep3 = Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price > 0;

    const loadMaterials = async () => {
        try {
            const mats = await Database.getRawMaterials();
            setMaterials(mats);
            if (mats.length > 0) {
                setForm((f) => ({ ...f, material_id: f.material_id || mats[0].id }));
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load materials.');
        }
    };

    const loadData = useCallback(async (p = page) => {
        setIsLoad(true);
        try {
            const res = await Database.getPaginatedPurchases(
                p,
                PAGE_SIZE,
                filterMaterialId || undefined,
                filterDateFrom || undefined,
                filterDateTo || undefined,
                supplierSearch || undefined
            );
            setData(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load purchases.');
        } finally {
            setIsLoad(false);
        }
    }, [page, filterMaterialId, filterDateFrom, filterDateTo, supplierSearch]);

    useEffect(() => {
        loadMaterials();
    }, []);

    useEffect(() => {
        loadData();
    }, [page, filterMaterialId, filterDateFrom, filterDateTo, supplierSearch]);

    const resetForm = () => {
        setForm({
            material_id: materials[0]?.id ?? '',
            date: getLocalDate(),
            quantity: '',
            unit_price: '',
            transport_cost: '',
            supplier_name: '',
        });
        setStep(1);
    };

    const handleSave = async () => {
        if (!form.material_id || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
            toast.error('Material, quantity and unit price are required.');
            return;
        }

        setIsSaving(true);
        try {
            await Database.addMaterialPurchase({
                material_id: form.material_id,
                date: form.date,
                quantity: qty,
                unit_price: price,
                transport_cost: transport,
                total_cost: totalCost,
                supplier_name: form.supplier_name.trim(),
            });
            toast.success('Purchase logged successfully.');
            resetForm();
            setShowWizard(false);
            setPage(1);
            await loadData(1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save purchase.');
        } finally {
            setIsSaving(false);
        }
    };

    const getMaterialName = (id: string) => materials.find((m) => m.id === id)?.name ?? id;
    const getMaterialUnit = (id: string) => materials.find((m) => m.id === id)?.unit ?? '';
    const visibleTotal = useMemo(() => data.reduce((sum, row) => sum + (row.total_cost || 0), 0), [data]);

    const getInitials = (name: string) => {
        if (!name) return 'PR';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-[1650px] mx-auto space-y-4 pb-20 text-slate-900 relative">
            {/* View Mode */}
            {!showWizard && (
                <>
                    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white shadow-inner">
                                <Package2 size={20} className="text-white/90" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Material Purchases</h1>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Track raw material inward and supplier costs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={supplierSearch}
                                    onChange={(e) => { setSupplierSearch(e.target.value); setPage(1); }}
                                    placeholder="Search suppliers..."
                                    className="pl-9 pr-4 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all w-64"
                                />
                            </div>
                            <button onClick={() => setShowFilters(v => !v)} className={`p-2 rounded-lg border text-slate-600 transition-colors ${showFilters ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title="Filters">
                                <Filter size={16} />
                            </button>
                            <button onClick={() => loadData(page)} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                                <RefreshCw size={16} className={isLoad ? 'animate-spin cursor-not-allowed' : ''} />
                            </button>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button onClick={() => { resetForm(); setShowWizard(true); }} className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95">
                                Log Purchase
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Material</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterMaterialId} onChange={(e) => { setFilterMaterialId(e.target.value); setPage(1); }}>
                                    <option value="">All Materials</option>
                                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} />
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => { setFilterMaterialId(''); setFilterDateFrom(''); setFilterDateTo(''); setSupplierSearch(''); setPage(1); }} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-colors">Clear Filters</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Purchase Ledger</h2>
                            <p className="text-xs font-semibold text-slate-500">Visible Total: <span className="text-slate-900 font-black ml-1">₹{visibleTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4 font-bold">Details</th>
                                        <th className="px-6 py-4 font-bold">Supplier Info</th>
                                        <th className="px-6 py-4 font-bold text-right">Total Cost</th>
                                        <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {isLoad ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading ledger...</p></td></tr>
                                    ) : materials.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><p className="text-sm font-bold text-slate-500">No materials configured yet.</p><button onClick={() => onNavigate?.('materials')} className="mt-2 text-xs font-bold text-blue-600 hover:underline">Add materials first</button></td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Package2 size={32} className="text-slate-200 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">No purchases recorded yet.</p></td></tr>
                                    ) : data.map((p) => (
                                        <tr
                                            key={p.id}
                                            onClick={() => setSelectedPurchase(p)}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black uppercase tracking-wider border border-slate-200 group-hover:bg-white group-hover:border-slate-300 transition-colors shrink-0">
                                                        {getInitials(getMaterialName(p.material_id))}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 line-clamp-1">
                                                            {getMaterialName(p.material_id)}
                                                            <span className="text-xs font-semibold text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                                {fmtQty(p.quantity)} <span className="text-[10px] text-slate-400 ml-0.5">{getMaterialUnit(p.material_id)}</span>
                                                            </span>
                                                        </p>
                                                        <p className="text-xs font-medium text-slate-500 mt-1">{new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                    {p.supplier_name ? p.supplier_name.substring(0, 15) + (p.supplier_name.length > 15 ? '...' : '') : 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-base font-black text-slate-900">₹{p.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {total > PAGE_SIZE && (
                            <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-white">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString('en-IN')}</p>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ArrowLeft size={14} /></button>
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest px-3">Page {page} of {totalPages}</span>
                                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ArrowRight size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Expensify-Style Full Screen Modal Wizard */}
            {showWizard && createPortal(
                <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 font-sans">
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-slate-100 z-10 px-6 flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest">Step {step} of 3</span>
                            <span className="text-xs font-semibold text-slate-400 ml-2">{step === 1 ? 'Purchase Details' : step === 2 ? 'Pricing & Quantity' : 'Review & Confirm'}</span>
                        </div>
                        <button
                            onClick={() => { setShowWizard(false); resetForm(); }}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="max-w-2xl mx-auto py-12 px-6">
                        <div className="flex flex-col items-center mb-12">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-6">
                                <Package2 size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Record Purchase</h1>
                        </div>

                        {/* Wizard Content */}
                        <div className="text-left w-full max-w-lg mx-auto min-h-[300px]">
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Material Classification</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                                            value={form.material_id}
                                            onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                                        >
                                            {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Purchase Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier / Vendor (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter supplier entity"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                            value={form.supplier_name}
                                            onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Received Qty</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    autoFocus
                                                    className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                                    value={form.quantity}
                                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                                />
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded-md">{selectedMaterial?.unit || ''}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₹</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    className="w-full pl-9 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                                    value={form.unit_price}
                                                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-t border-slate-100 pt-6">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logistics / Transport Cost (₹)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                placeholder="0.00"
                                                className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                                value={form.transport_cost}
                                                onChange={(e) => setForm({ ...form, transport_cost: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                        <div className="p-8 text-center border-b border-slate-200 bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Bill Amount</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">₹{totalCost > 0 ? totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base Material</span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest bg-slate-200 text-slate-700">
                                                    {selectedMaterial?.name || 'Unknown'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity</span>
                                                <span className="text-sm font-bold text-slate-900">{Number.isFinite(qty) ? fmtQty(qty) : '0'} {selectedMaterial?.unit || ''}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</span>
                                                <span className="text-sm font-bold text-slate-900">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="mt-12 flex items-center justify-between w-full max-w-lg mx-auto">
                            <button
                                onClick={() => step > 1 ? setStep((step - 1) as PurchaseStep) : setShowWizard(false)}
                                className="px-6 py-4 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                {step === 1 ? 'Cancel' : 'Back'}
                            </button>

                            {step < 3 ? (
                                <button
                                    onClick={() => {
                                        if (step === 1 && !canGoStep2) return toast.error('Choose material and date.');
                                        if (step === 2 && !canGoStep3) return toast.error('Enter valid quantity and unit price.');
                                        setStep((step + 1) as PurchaseStep);
                                    }}
                                    className="px-8 py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !materials.length}
                                    className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Confirm Purchase
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Expensify-Style Slide Over Panel for Purchase Details */}
            {selectedPurchase && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
                        onClick={() => setSelectedPurchase(null)}
                    ></div>
                    <div className="fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                    <Package2 size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Purchase Details</h3>
                            </div>
                            <button
                                onClick={() => setSelectedPurchase(null)}
                                className="p-3 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-10">
                            <div className="text-center mb-12">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Paid Amount</p>
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">
                                    ₹{selectedPurchase.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h1>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                        <p className="text-sm font-bold text-slate-900">{new Date(selectedPurchase.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transport</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedPurchase.transport_cost > 0 ? `₹${selectedPurchase.transport_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Free / Included'}</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Material Reference</p>
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            {getInitials(getMaterialName(selectedPurchase.material_id))}
                                        </span>
                                        <span className="text-base font-bold text-slate-900">
                                            {getMaterialName(selectedPurchase.material_id)}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/10 grid grid-cols-2 gap-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <Calculator size={100} />
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Volume / Quantity</p>
                                        <p className="text-2xl font-black">{fmtQty(selectedPurchase.quantity)}<span className="text-xs font-bold text-slate-400 ml-1.5">{getMaterialUnit(selectedPurchase.material_id)}</span></p>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Base Price / Unit</p>
                                        <p className="text-2xl font-black">₹{selectedPurchase.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Supplier / Vendor</p>
                                    <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedPurchase.supplier_name || 'No specific supplier designated in records.'}
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-white border border-slate-100 flex justify-between items-center opacity-60">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Purchase ID</p>
                                    <p className="text-xs font-mono font-bold text-slate-500">{selectedPurchase.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 text-center border-t border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                Logged in Starline Enterprise via Material Purchases
                            </p>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
