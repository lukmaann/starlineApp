import React, { useState, useEffect, useCallback } from 'react';
import { Database } from '../db';
import { ProductionLog } from '../types';
import { getLocalDate } from '../utils';
import { getAllBatteryModels, BatteryModelData } from '../components/calculator/calculatorData';
import { toast } from 'sonner';
import {
    Plus, X, ArrowLeft, ArrowRight, BatteryCharging, RefreshCw,
    ChevronDown, ListFilter, Loader2, Filter, Check, BookOpen, Package, Zap, FlaskConical
} from 'lucide-react';

const PAGE_SIZE = 10;

// ─── Bill of Materials Panel ─────────────────────────────────────────────────
function BomPanel({ modelName, modelData, qty, onClose }: {
    modelName: string;
    modelData: BatteryModelData;
    qty: number;
    onClose: () => void;
}) {
    const q = Math.max(qty, 1);

    const materials = [
        { label: 'Lead', icon: '🔩', value: modelData.leadKg, unit: 'kg/battery', total: modelData.leadKg * q, color: 'bg-slate-100 border-slate-300 text-slate-700' },
        { label: 'Acid', icon: '🧪', value: modelData.acidLiters, unit: 'L/battery', total: modelData.acidLiters * q, color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { label: 'PVC Separator', icon: '📋', value: modelData.pvcSeparator, unit: 'pcs/battery', total: modelData.pvcSeparator * q, color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
        { label: 'Packing Jali', icon: '🗂️', value: modelData.packingJali, unit: 'pcs/battery', total: modelData.packingJali * q, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        { label: 'Battery Packing', icon: '📦', value: modelData.batteryPacking, unit: 'pcs/battery', total: modelData.batteryPacking * q, color: 'bg-orange-50 border-orange-200 text-orange-700' },
        { label: '±Caps', icon: '🔘', value: modelData.minusPlusCaps, unit: 'pcs/battery', total: modelData.minusPlusCaps * q, color: 'bg-purple-50 border-purple-200 text-purple-700' },
        { label: 'Positive Plates', icon: '+', value: modelData.positivePlates, unit: 'pcs/battery', total: modelData.positivePlates * q, color: 'bg-rose-50 border-rose-200 text-rose-700' },
        { label: 'Negative Plates', icon: '−', value: modelData.negativePlates, unit: 'pcs/battery', total: modelData.negativePlates * q, color: 'bg-green-50 border-green-200 text-green-700' },
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
                        <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
                            Per battery → For {q} unit{q !== 1 ? 's' : ''} of production
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95">
                    <X size={14} />
                </button>
            </div>

            <div className="p-6">
                {/* Container Info */}
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

                {/* Additional specs */}
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

                {/* Materials table */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider pl-6">Material</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Per Battery</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right pr-6">
                                    For {q} Unit{q !== 1 ? 's' : ''}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {materials.map((m, i) => (
                                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-3.5 pl-6">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${m.color}`}>{m.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-700">
                                        {m.value} <span className="text-[10px] text-slate-400 font-medium">{m.unit.split('/')[0]}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right pr-6">
                                        <span className="text-base font-black text-slate-900">{m.total % 1 === 0 ? m.total : m.total.toFixed(2)}</span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-1">{m.unit.split('/')[0]}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 text-center">
                    Material consumption is estimated. Actual may vary by batch quality.
                </p>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Production() {
    const [allModels, setAllModels] = useState<Record<string, BatteryModelData>>({});
    const [modelNames, setModelNames] = useState<string[]>([]);
    const [data, setData] = useState<ProductionLog[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoad, setIsLoad] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showBom, setShowBom] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        battery_model: '',
        date: getLocalDate(),
        quantity_produced: '',
        labour_cost_total: '',
    });

    const [filterModel, setFilterModel] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasFilters = filterModel || filterDateFrom || filterDateTo;

    // Load models from the live source (includes custom + excludes deleted)
    const refreshModels = () => {
        const models = getAllBatteryModels();
        setAllModels(models);
        const names = Object.keys(models);
        setModelNames(names);
        if (names.length > 0 && !form.battery_model) {
            setForm(f => ({ ...f, battery_model: names[0] }));
        }
    };

    useEffect(() => { refreshModels(); }, []);

    const loadData = useCallback(async (p = page) => {
        setIsLoad(true);
        try {
            const r = await Database.getPaginatedProduction(p, PAGE_SIZE, filterModel || undefined, filterDateFrom || undefined, filterDateTo || undefined);
            setData(r.data); setTotal(r.total);
        } catch { toast.error('Failed to load.'); }
        finally { setIsLoad(false); }
    }, [page, filterModel, filterDateFrom, filterDateTo]);

    useEffect(() => { loadData(); }, [page, filterModel, filterDateFrom, filterDateTo]);

    const resetForm = () => {
        setForm({ battery_model: modelNames[0] ?? '', date: getLocalDate(), quantity_produced: '', labour_cost_total: '' });
        setShowBom(false);
    };

    const handleSave = async () => {
        const qty = parseInt(form.quantity_produced, 10);
        if (!qty || qty < 1) { toast.error('Enter valid quantity.'); return; }
        if (!form.battery_model) { toast.error('Select a battery model.'); return; }
        setIsSaving(true);
        try {
            await Database.addProductionLog({ date: form.date, battery_model: form.battery_model, quantity_produced: qty, labour_cost_total: parseFloat(form.labour_cost_total) || 0 });
            toast.success('Batch logged!');
            resetForm(); setShowForm(false); setPage(1); loadData(1);
        } catch { toast.error('Failed to save.'); }
        finally { setIsSaving(false); }
    };

    const selectedModelData = form.battery_model ? allModels[form.battery_model] : null;

    return (
        <div className="max-w-[1600px] mx-auto space-y-5 animate-in fade-in duration-500 pb-20 text-slate-900">

            {/* ── Header ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <BatteryCharging size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">Production Log</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily assembly records • {total.toLocaleString()} entries</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadData(page)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm active:scale-95">
                        <RefreshCw size={18} className={isLoad ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => { setShowBom(b => !b); setShowForm(false); }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 border ${showBom ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'}`}
                    >
                        <BookOpen size={15} />
                        Bill of Materials
                    </button>
                    <button
                        onClick={() => { setShowForm(f => !f); setShowBom(false); if (!showForm) resetForm(); }}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${showForm ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-black'}`}
                    >
                        {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Log Batch</>}
                    </button>
                </div>
            </div>

            {/* ── BOM Panel — shown when BOM button pressed ── */}
            {showBom && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Model selector for BOM */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">View BOM for:</p>
                        <div className="flex flex-wrap gap-2 flex-1">
                            {modelNames.map(m => (
                                <button key={m} onClick={() => setForm(f => ({ ...f, battery_model: m }))}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-black transition-all active:scale-95 border ${form.battery_model === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'}`}
                                >{m}</button>
                            ))}
                        </div>
                    </div>
                    {selectedModelData && (
                        <BomPanel
                            modelName={form.battery_model}
                            modelData={selectedModelData}
                            qty={parseInt(form.quantity_produced, 10) || 1}
                            onClose={() => setShowBom(false)}
                        />
                    )}
                </div>
            )}

            {/* ── Inline Form ── */}
            {showForm && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                <BatteryCharging size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Log Production Batch</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Material stock will auto-deduct based on battery formula</p>
                            </div>
                        </div>
                        {/* Quick BOM preview link */}
                        {form.battery_model && (
                            <button onClick={() => { setShowBom(true); setShowForm(false); }} className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">
                                <BookOpen size={12} /> View BOM
                            </button>
                        )}
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Model Chips — from live data */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Battery Model * ({modelNames.length} available)</label>
                            <div className="flex flex-wrap gap-2">
                                {modelNames.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setForm({ ...form, battery_model: m })}
                                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 border ${form.battery_model === m
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                                {modelNames.length === 0 && (
                                    <p className="text-xs text-slate-400 font-medium">No battery models found. Add models in the Calculator tab.</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Production Date *</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Units Assembled *</label>
                                <input
                                    type="number" min={1} placeholder="0"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-3xl font-black text-slate-900 text-center outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                                    value={form.quantity_produced}
                                    onChange={e => setForm({ ...form, quantity_produced: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Labour Cost (₹) — Optional</label>
                                <input
                                    type="number" step="0.01" placeholder="0.00"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                                    value={form.labour_cost_total}
                                    onChange={e => setForm({ ...form, labour_cost_total: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Quick material preview */}
                        {selectedModelData && form.quantity_produced && parseInt(form.quantity_produced) > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Materials that will be consumed</p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                                        🔩 Lead: {(selectedModelData.leadKg * parseInt(form.quantity_produced)).toFixed(2)}kg
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                                        🧪 Acid: {(selectedModelData.acidLiters * parseInt(form.quantity_produced)).toFixed(2)}L
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                                        📋 PVC Sep: {selectedModelData.pvcSeparator * parseInt(form.quantity_produced)}pcs
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                                        📦 Packing: {selectedModelData.batteryPacking * parseInt(form.quantity_produced)}pcs
                                    </span>
                                    {selectedModelData.packingJali > 0 && (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                                            🗂️ Jali: {selectedModelData.packingJali * parseInt(form.quantity_produced)}pcs
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !form.battery_model || !form.quantity_produced}
                                className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors shadow-md active:scale-95"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                {isSaving ? 'Saving...' : 'Save Batch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filter Bar ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="relative">
                    <button onClick={() => setIsFilterOpen(p => !p)} className={`p-2.5 rounded-xl transition-all active:scale-90 relative ${isFilterOpen || hasFilters ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-400 hover:bg-slate-100 border border-transparent hover:text-slate-600'}`}>
                        <Filter size={18} strokeWidth={2} />
                        {hasFilters && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-white" />}
                    </button>
                    {isFilterOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                            <div className="absolute left-0 top-12 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-5 z-50 space-y-4 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2"><ListFilter size={14} className="text-blue-600" /> Filter Logs</h4>
                                    <button onClick={() => { setFilterModel(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider">Reset</button>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Battery Model</label>
                                    <div className="relative">
                                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 appearance-none cursor-pointer" value={filterModel} onChange={e => { setFilterModel(e.target.value); setPage(1); }}>
                                            <option value="">All Models</option>
                                            {modelNames.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} />
                                        <input type="date" className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} />
                                    </div>
                                </div>
                                <button onClick={() => setIsFilterOpen(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-black transition-all shadow-lg active:scale-95">Apply</button>
                            </div>
                        </>
                    )}
                </div>
                {hasFilters ? (
                    <div className="flex items-center gap-2">
                        {filterModel && <span className="text-[10px] font-black bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg uppercase tracking-widest">{filterModel}</span>}
                        {(filterDateFrom || filterDateTo) && <span className="text-[10px] font-black bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg uppercase tracking-widest">{filterDateFrom} → {filterDateTo || 'today'}</span>}
                    </div>
                ) : <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">All records</p>}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 pl-8">Date</th>
                                <th className="px-6 py-4">Battery Model</th>
                                <th className="px-6 py-4 text-right">Units Built</th>
                                <th className="px-6 py-4 text-right pr-8">Labour Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoad ? (
                                <tr><td colSpan={4} className="py-20 text-center">
                                    <Loader2 size={24} className="text-slate-200 animate-spin mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Loading...</p>
                                </td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={4} className="py-16 text-center">
                                    <BatteryCharging size={28} className="text-slate-200 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-slate-400">No production logs yet.</p>
                                    <button onClick={() => { setShowForm(true); setShowBom(false); }} className="mt-3 text-xs font-bold text-blue-600 hover:underline">Log your first batch →</button>
                                </td></tr>
                            ) : data.map(l => (
                                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 pl-8 text-[11px] font-bold text-slate-500 font-mono whitespace-nowrap">{l.date}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-black bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg uppercase tracking-widest">{l.battery_model}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xl font-black text-emerald-600">+{l.quantity_produced}</span>
                                        <span className="text-[10px] font-bold text-slate-400 ml-1">units</span>
                                    </td>
                                    <td className="px-6 py-4 text-right pr-8 text-sm text-slate-500">{l.labour_cost_total > 0 ? `₹${l.labour_cost_total.toFixed(2)}` : <span className="text-slate-200">—</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {total > PAGE_SIZE && (
                    <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"><ArrowLeft size={14} /></button>
                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest px-2">{page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"><ArrowRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
