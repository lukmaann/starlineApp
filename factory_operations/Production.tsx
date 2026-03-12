import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { ProductionLog } from '../types';
import { getLocalDate } from '../utils';
import { getAllBatteryModels, BatteryModelData } from '../components/calculator/calculatorData';
import { toast } from 'sonner';
import {
    ArrowLeft, ArrowRight, Check, Filter, Loader2, RefreshCw,
    X, ChevronRight, Factory, Layers, BookOpen, Package, Zap, FlaskConical,
    BatteryCharging
} from 'lucide-react';

const PAGE_SIZE = 10;
type ProdStep = 1 | 2 | 3;

// ─── Bill of Materials Panel ─────────────────────────────────────────────────
function BomPanel({ modelName, modelData, qty, onClose }: {
    modelName: string;
    modelData: BatteryModelData;
    qty: number;
    onClose: () => void;
}) {
    const q = Math.max(qty, 1);
    const materials = [
        { label: 'Lead', icon: '🔩', value: modelData.leadKg, unit: 'kg', total: modelData.leadKg * q, color: 'bg-slate-100 border-slate-300 text-slate-700' },
        { label: 'Acid', icon: '🧪', value: modelData.acidLiters, unit: 'L', total: modelData.acidLiters * q, color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { label: 'PVC Separator', icon: '📋', value: modelData.pvcSeparator, unit: 'pcs', total: modelData.pvcSeparator * q, color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
        { label: 'Packing Jali', icon: '🗂️', value: modelData.packingJali, unit: 'pcs', total: modelData.packingJali * q, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { label: 'Battery Packing', icon: '📦', value: modelData.batteryPacking, unit: 'pcs', total: modelData.batteryPacking * q, color: 'bg-orange-50 border-orange-200 text-orange-700' },
        { label: '±Caps', icon: '🔘', value: modelData.minusPlusCaps, unit: 'pcs', total: modelData.minusPlusCaps * q, color: 'bg-purple-50 border-purple-200 text-purple-700' },
        { label: 'Positive Plates', icon: '+', value: modelData.positivePlates, unit: 'pcs', total: modelData.positivePlates * q, color: 'bg-rose-50 border-rose-200 text-rose-700' },
        { label: 'Negative Plates', icon: '−', value: modelData.negativePlates, unit: 'pcs', total: modelData.negativePlates * q, color: 'bg-green-50 border-green-200 text-green-700' },
    ].filter(m => m.value > 0);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <BookOpen size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">Bill of Materials — {modelName}</p>
                        <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Per battery → For {q} unit{q !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"><X size={14} /></button>
            </div>
            <div className="p-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Package size={16} className="text-slate-500" />
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Container</p>
                            <p className="text-sm font-bold text-slate-900">Model-specific container (ID #{modelData.containerId})</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">For {q} batch</p>
                        <p className="text-sm font-black text-slate-900">{q} container{q !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                    {modelData.charging > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-center">
                            <Zap size={14} className="text-yellow-600 mx-auto mb-1" />
                            <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest">Charging</p>
                            <p className="text-base font-black text-yellow-800">₹{modelData.charging}</p>
                            <p className="text-[9px] text-yellow-600">per battery</p>
                        </div>
                    )}
                    {modelData.batteryScreening > 0 && (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-center">
                            <FlaskConical size={14} className="text-teal-600 mx-auto mb-1" />
                            <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest">Screening</p>
                            <p className="text-base font-black text-teal-800">₹{modelData.batteryScreening}</p>
                            <p className="text-[9px] text-teal-600">per battery</p>
                        </div>
                    )}
                    {modelData.labour > 0 && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-center">
                            <BatteryCharging size={14} className="text-indigo-600 mx-auto mb-1" />
                            <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Labour</p>
                            <p className="text-base font-black text-indigo-800">₹{modelData.labour}</p>
                            <p className="text-[9px] text-indigo-600">per battery</p>
                        </div>
                    )}
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider pl-6">Material</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Per Battery</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right pr-6">For {q} Unit{q !== 1 ? 's' : ''}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {materials.map((m, i) => (
                                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3.5 pl-6">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${m.color}`}>{m.label}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-700">{m.value} <span className="text-[10px] text-slate-400 font-medium">{m.unit}</span></td>
                                    <td className="px-5 py-3.5 text-right pr-6">
                                        <span className="text-base font-black text-slate-900">{m.total % 1 === 0 ? m.total : m.total.toFixed(2)}</span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-1">{m.unit}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Production() {
    const [allModels, setAllModels] = useState<Record<string, BatteryModelData>>({});
    const [modelNames, setModelNames] = useState<string[]>([]);
    const [data, setData] = useState<ProductionLog[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoad, setIsLoad] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showBom, setShowBom] = useState(false);
    const [step, setStep] = useState<ProdStep>(1);
    const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);

    const [form, setForm] = useState({
        date: getLocalDate(),
        battery_model: '',
        quantity_produced: '',
        labour_cost_total: '',
    });

    const [filterModel, setFilterModel] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const qty = Number(form.quantity_produced);
    const labour = Number(form.labour_cost_total) || 0;
    const canGoStep2 = Boolean(form.date && form.battery_model);
    const canGoStep3 = Number.isFinite(qty) && qty > 0;
    const selectedModelData = form.battery_model ? allModels[form.battery_model] : null;

    const refreshModels = () => {
        const models = getAllBatteryModels();
        setAllModels(models);
        const names = Object.keys(models);
        setModelNames(names);
        if (names.length > 0) setForm(f => ({ ...f, battery_model: f.battery_model || names[0] }));
    };

    useEffect(() => { refreshModels(); }, []);

    const loadData = useCallback(async (p = page) => {
        setIsLoad(true);
        try {
            const res = await Database.getPaginatedProduction(
                p, PAGE_SIZE,
                filterModel || undefined,
                filterDateFrom || undefined,
                filterDateTo || undefined
            );
            setData(res.data);
            setTotal(res.total);
        } catch { toast.error('Failed to load production logs.'); }
        finally { setIsLoad(false); }
    }, [page, filterModel, filterDateFrom, filterDateTo]);

    useEffect(() => { loadData(); }, [page, filterModel, filterDateFrom, filterDateTo]);

    const resetForm = () => {
        setForm({ date: getLocalDate(), battery_model: modelNames[0] ?? '', quantity_produced: '', labour_cost_total: '' });
        setStep(1);
        setShowBom(false);
    };

    const handleSave = async () => {
        if (!form.battery_model || !Number.isFinite(qty) || qty <= 0) {
            toast.error('Select a model and enter a valid quantity.');
            return;
        }
        setIsSaving(true);
        try {
            await Database.addProductionLog({
                date: form.date,
                battery_model: form.battery_model,
                quantity_produced: qty,
                labour_cost_total: labour,
            });
            toast.success('Production run logged.');
            resetForm();
            setShowWizard(false);
            setPage(1);
            await loadData(1);
        } catch { toast.error('Failed to save production log.'); }
        finally { setIsSaving(false); }
    };

    const visibleUnits = useMemo(() => data.reduce((s, r) => s + (r.quantity_produced || 0), 0), [data]);

    return (
        <div className="max-w-[1650px] mx-auto space-y-4 pb-20 text-slate-900 relative">
            {!showWizard && (
                <>
                    {/* Header */}
                    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white shadow-inner">
                                <Factory size={20} className="text-white/90" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Production</h1>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Log battery production runs and track output</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowFilters(v => !v)} className={`p-2 rounded-lg border text-slate-600 transition-colors ${showFilters ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`} title="Filters">
                                <Filter size={16} />
                            </button>
                            <button onClick={() => loadData(page)} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                                <RefreshCw size={16} className={isLoad ? 'animate-spin cursor-not-allowed' : ''} />
                            </button>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <button onClick={() => { resetForm(); setShowWizard(true); }} className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95">
                                Log Run
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Battery Model</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterModel} onChange={e => { setFilterModel(e.target.value); setPage(1); }}>
                                    <option value="">All Models</option>
                                    {modelNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">From Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">To Date</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} />
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => { setFilterModel(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-colors">Clear Filters</button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Production Ledger</h2>
                            <p className="text-xs font-semibold text-slate-500">Visible Output: <span className="text-slate-900 font-black ml-1">{visibleUnits.toLocaleString('en-IN')} units</span></p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4 font-bold">Details</th>
                                        <th className="px-6 py-4 font-bold">Model</th>
                                        <th className="px-6 py-4 font-bold text-right">Units Produced</th>
                                        <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {isLoad ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p></td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Factory size={32} className="text-slate-200 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">No production runs recorded yet.</p></td></tr>
                                    ) : data.map(log => (
                                        <tr key={log.id} onClick={() => setSelectedLog(log)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black uppercase tracking-wider border border-slate-200 group-hover:bg-white group-hover:border-slate-300 transition-colors shrink-0">
                                                        {log.battery_model.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">Production Run</p>
                                                        <p className="text-xs font-medium text-slate-500 mt-1">{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                    {log.battery_model}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-base font-black text-slate-900">{log.quantity_produced.toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] font-bold text-slate-400">units</p>
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
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ArrowLeft size={14} /></button>
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest px-3">Page {page} of {totalPages}</span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"><ArrowRight size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Log Run Wizard ────────────────────────────────────────────── */}
            {showWizard && createPortal(
                <div className="fixed inset-0 bg-white z-[70] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 font-sans">
                    <div className="sticky top-0 bg-white border-b border-slate-100 z-10 px-6 flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest">Step {step} of 3</span>
                            <span className="text-xs font-semibold text-slate-400 ml-2">{step === 1 ? 'Run Details' : step === 2 ? 'Output & Cost' : 'Review'}</span>
                        </div>
                        <button onClick={() => { setShowWizard(false); resetForm(); }} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="max-w-2xl mx-auto py-12 px-6">
                        <div className="flex flex-col items-center mb-12">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-6">
                                <Factory size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Log Production Run</h1>
                        </div>

                        <div className="text-left w-full max-w-lg mx-auto min-h-[300px]">
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Battery Model</label>
                                        <div className="flex flex-wrap gap-2">
                                            {modelNames.map(m => (
                                                <button key={m} onClick={() => setForm(f => ({ ...f, battery_model: m }))}
                                                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 border ${form.battery_model === m ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-100'}`}>
                                                    {m}
                                                </button>
                                            ))}
                                            {modelNames.length === 0 && <p className="text-xs text-slate-400 font-medium">No battery models configured.</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Production Date</label>
                                        <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Units Produced</label>
                                        <div className="relative">
                                            <input type="number" min={1} step={1} autoFocus placeholder="0"
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                                value={form.quantity_produced} onChange={e => setForm({ ...form, quantity_produced: e.target.value })} />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm bg-slate-100 px-2 py-0.5 rounded-md">units</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-t border-slate-100 pt-6">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Labour Cost (₹) — Optional</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₹</span>
                                            <input type="number" min={0} step="0.01" placeholder="0.00"
                                                className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                                value={form.labour_cost_total} onChange={e => setForm({ ...form, labour_cost_total: e.target.value })} />
                                        </div>
                                    </div>
                                    {/* Material preview */}
                                    {selectedModelData && qty > 0 && (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Materials that will be consumed</p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">🔩 Lead: {(selectedModelData.leadKg * qty).toFixed(2)}kg</span>
                                                <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">🧪 Acid: {(selectedModelData.acidLiters * qty).toFixed(2)}L</span>
                                                <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">📋 PVC Sep: {selectedModelData.pvcSeparator * qty}pcs</span>
                                                <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">📦 Packing: {selectedModelData.batteryPacking * qty}pcs</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                        <div className="p-8 text-center border-b border-slate-200 bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Units Produced</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">{Number.isFinite(qty) ? qty.toLocaleString('en-IN') : '0'}</p>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Model</span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest bg-slate-200 text-slate-700">{form.battery_model}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</span>
                                                <span className="text-sm font-bold text-slate-900">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            {labour > 0 && (
                                                <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Labour Cost</span>
                                                    <span className="text-sm font-bold text-slate-900">₹{labour.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* BOM toggle */}
                                    <button onClick={() => setShowBom(b => !b)} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors">
                                        <BookOpen size={14} /> {showBom ? 'Hide' : 'View'} Bill of Materials
                                    </button>
                                    {showBom && selectedModelData && <BomPanel modelName={form.battery_model} modelData={selectedModelData} qty={qty} onClose={() => setShowBom(false)} />}
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="mt-12 flex items-center justify-between w-full max-w-lg mx-auto">
                            <button onClick={() => step > 1 ? setStep((step - 1) as ProdStep) : setShowWizard(false)} className="px-6 py-4 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors">
                                {step === 1 ? 'Cancel' : 'Back'}
                            </button>
                            {step < 3 ? (
                                <button onClick={() => {
                                    if (step === 1 && !canGoStep2) return toast.error('Select a model and date.');
                                    if (step === 2 && !canGoStep3) return toast.error('Enter a valid quantity.');
                                    setStep((step + 1) as ProdStep);
                                }} className="px-8 py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2">
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button onClick={handleSave} disabled={isSaving} className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Confirm Run
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Detail Side Panel ─────────────────────────────────────────── */}
            {selectedLog && createPortal(
                <>
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] animate-in fade-in duration-300" onClick={() => setSelectedLog(null)} />
                    <div className="fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl z-[70] animate-in slide-in-from-right duration-300 flex flex-col font-sans" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                    <Factory size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Production Details</h3>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-3 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center group">
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 py-10">
                            <div className="text-center mb-12">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Units Produced</p>
                                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">{selectedLog.quantity_produced.toLocaleString('en-IN')}</h1>
                                <p className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-widest">units</p>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                        <p className="text-sm font-bold text-slate-900">{new Date(selectedLog.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Labour Cost</p>
                                        <p className="text-sm font-bold text-slate-900">{selectedLog.labour_cost_total > 0 ? `₹${selectedLog.labour_cost_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</p>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Battery Model</p>
                                    <p className="text-2xl font-black">{selectedLog.battery_model}</p>
                                </div>
                                {/* BOM for selected log */}
                                {allModels[selectedLog.battery_model] && (
                                    <BomPanel
                                        modelName={selectedLog.battery_model}
                                        modelData={allModels[selectedLog.battery_model]}
                                        qty={selectedLog.quantity_produced}
                                        onClose={() => { }}
                                    />
                                )}
                                <div className="p-5 rounded-2xl bg-white border border-slate-100 flex justify-between items-center opacity-60">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Log ID</p>
                                    <p className="text-xs font-mono font-bold text-slate-500">{selectedLog.id}</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-slate-50 text-center border-t border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Logged in Starline Enterprise via Production</p>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
