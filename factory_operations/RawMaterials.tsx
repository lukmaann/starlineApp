import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { RawMaterial } from '../types';
import { toast } from 'sonner';
import { AlertTriangle, PackageSearch, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';

interface RawMaterialsProps {
    onNavigate?: (tab: string) => void;
    onClose?: () => void;
}

const UNIT_OPTIONS = ['kg', 'liters', 'pieces', 'pairs'];
const emptyForm = { name: '', unit: 'kg', alert_threshold: '0' };

const fmtQty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(1));

export default function RawMaterials({ onNavigate, onClose }: RawMaterialsProps) {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [missing, setMissing] = useState<Array<{ name: string; unit: string; alert_threshold: number }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const load = async () => {
        setIsLoading(true);
        try {
            const [materialsData, missingData] = await Promise.all([
                Database.getRawMaterials(),
                Database.getMissingRequiredMaterials(),
            ]);
            setMaterials(materialsData);
            setMissing(missingData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load materials.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const onSubmit = async () => {
        if (!form.name.trim()) {
            toast.error('Material name is required.');
            return;
        }

        const threshold = Number(form.alert_threshold);
        if (!Number.isFinite(threshold) || threshold < 0) {
            toast.error('Low stock value must be 0 or more.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                unit: form.unit.trim(),
                alert_threshold: threshold,
            };

            if (editingId) {
                await Database.updateRawMaterial(editingId, payload);
                toast.success('Material updated.');
            } else {
                await Database.addRawMaterial(payload);
                toast.success('Material added.');
            }
            resetForm();
            await load();
        } catch (error: any) {
            toast.error(error?.message || 'Could not save material.');
        } finally {
            setIsSaving(false);
        }
    };

    const onEdit = (material: RawMaterial) => {
        setEditingId(material.id);
        setForm({
            name: material.name,
            unit: material.unit,
            alert_threshold: String(material.alert_threshold ?? 0),
        });
    };

    const onDelete = async (material: RawMaterial) => {
        const yes = window.confirm(`Delete material "${material.name}"?`);
        if (!yes) return;

        try {
            await Database.deleteRawMaterial(material.id);
            toast.success('Material deleted.');
            if (editingId === material.id) resetForm();
            await load();
        } catch (error: any) {
            toast.error(error?.message || 'Could not delete material.');
        }
    };

    const addAllMissing = async () => {
        if (missing.length === 0) return;
        try {
            await Promise.all(missing.map((m) => Database.addMissingMaterialByName(m.name)));
            toast.success('Added recommended materials.');
            await load();
        } catch (error: any) {
            toast.error(error?.message || 'Could not add recommended materials.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 font-sans flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 z-20 px-8 flex items-center justify-between h-16 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest">Configuration</span>
                    <span className="text-sm font-bold text-slate-800 tracking-tight">Material Definitions</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="p-8 max-w-[1650px] mx-auto w-full space-y-5 pb-20">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-inner">
                            <PackageSearch size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Factory Materials</h1>
                            <p className="text-[11px] font-semibold text-slate-500">Simple setup for material list, units, and low-stock limits.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {missing.length > 0 && (
                            <button onClick={addAllMissing} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100">
                                Add Suggested ({missing.length})
                            </button>
                        )}
                        <button onClick={load} className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50">
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Material Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Raw Lead"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-900"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Unit</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-900"
                            value={form.unit}
                            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                        >
                            {UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Low Stock At</label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-slate-900"
                            value={form.alert_threshold}
                            onChange={(e) => setForm((f) => ({ ...f, alert_threshold: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={onSubmit}
                            disabled={isSaving}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:bg-slate-300"
                        >
                            <Plus size={13} /> {isSaving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                        </button>
                        {editingId && (
                            <button onClick={resetForm} className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Materials Needed In Factory</p>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{materials.length} items</span>
                    </div>

                    {materials.length === 0 ? (
                        <div className="py-14 text-center">
                            <AlertTriangle size={20} className="mx-auto text-amber-500 mb-2" />
                            <p className="text-sm font-bold text-slate-500">No materials added yet.</p>
                            <button onClick={() => onNavigate?.('purchases')} className="mt-2 text-xs font-bold text-blue-600 hover:underline">Go to purchases after adding</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                        <th className="px-5 py-3">Material</th>
                                        <th className="px-5 py-3">Unit</th>
                                        <th className="px-5 py-3 text-right">Low Stock</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {materials.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-3 text-sm font-bold text-slate-900">{m.name}</td>
                                            <td className="px-5 py-3 text-sm text-slate-600">{m.unit}</td>
                                            <td className="px-5 py-3 text-right text-sm font-semibold text-slate-700">{fmtQty(m.alert_threshold)}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => onEdit(m)} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => onDelete(m)} className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div></div>,
        document.body
    );
}
