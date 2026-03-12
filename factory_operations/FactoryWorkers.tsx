import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { FactoryWorker } from '../types';
import { toast } from 'sonner';
import { BadgeCheck, CheckCircle2, Eye, Pencil, Plus, Search, ShieldCheck, Trash2, UserSquare2, X, XCircle } from 'lucide-react';
import { FactoryWorkerFormData, FactoryWorkerWizard } from './components/FactoryWorkerWizard';

interface FactoryWorkersProps {
    userRole?: string;
}

type WorkerRow = FactoryWorker & { salary_paid_this_month: boolean };

function calculateAge(dob?: string): string {
    if (!dob) return '—';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
}

function calculateTenure(joinDate?: string): string {
    if (!joinDate) return '—';
    const start = new Date(joinDate);
    if (isNaN(start.getTime())) return '—';
    const today = new Date();

    let years = today.getFullYear() - start.getFullYear();
    let months = today.getMonth() - start.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years === 0 && months === 0) return 'Just joined';
    if (years === 0) return `${months} mo`;
    if (months === 0) return `${years} yr`;

    return `${years} yr, ${months} mo`;
}

function generateEnrollment(existing: string[]): string {
    const year = new Date().getFullYear();
    let code = '';
    const set = new Set(existing.map((e) => e.toLowerCase()));
    do {
        code = `FW-${year}-${Math.random().toString().slice(2, 7)}`;
    } while (set.has(code.toLowerCase()));
    return code;
}

function formatDate(date?: string) {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('en-IN');
}

export default function FactoryWorkers({ userRole }: FactoryWorkersProps) {
    const isAdmin = userRole === 'ADMIN';
    const [workers, setWorkers] = useState<WorkerRow[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [editing, setEditing] = useState<WorkerRow | null>(null);
    const [selectedWorker, setSelectedWorker] = useState<WorkerRow | null>(null);
    const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
    const [generatedEnrollment, setGeneratedEnrollment] = useState('');

    const currentMonthLabel = useMemo(() => new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }), []);

    const load = async (query?: string) => {
        setIsLoading(true);
        try {
            const data = await Database.getFactoryWorkers(query || undefined);
            setWorkers(data as WorkerRow[]);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load workers.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => load(search), 200);
        return () => clearTimeout(t);
    }, [search]);

    // Keep selected worker in sync with main workers list
    useEffect(() => {
        if (selectedWorker) {
            const updated = workers.find(w => w.id === selectedWorker.id);
            if (updated) setSelectedWorker(updated);
        }
    }, [workers]);

    useEffect(() => {
        if (selectedWorker) {
            Database.getWorkerSalaryHistory(selectedWorker.id).then(setSalaryHistory).catch(console.error);
        } else {
            setSalaryHistory([]);
        }
    }, [selectedWorker?.id]);

    const openCreate = () => {
        const enroll = generateEnrollment(workers.map((w) => w.enrollment_no || ''));
        setGeneratedEnrollment(enroll);
        setEditing(null);
        setShowWizard(true);
    };

    const openEdit = (worker: WorkerRow) => {
        setEditing(worker);
        setGeneratedEnrollment(worker.enrollment_no || '');
        setShowWizard(true);
    };

    const closeWizard = () => {
        setShowWizard(false);
        setEditing(null);
    };

    const handleWizardSave = async (data: FactoryWorkerFormData) => {
        const payload: Omit<FactoryWorker, 'id' | 'created_at' | 'updated_at' | 'salary_paid_month'> = {
            enrollment_no: data.enrollment_no.trim(),
            full_name: data.full_name.trim(),
            gender: data.gender || undefined,
            phone: data.phone || undefined,
            join_date: data.join_date || undefined,
            date_of_birth: data.date_of_birth || undefined,
            base_salary: Number(data.base_salary) || 0,
            emergency_contact: data.emergency_contact || undefined,
            status: data.status,
        };

        // Check for unique name
        const isDuplicateName = workers.some(w =>
            w.full_name.toLowerCase() === payload.full_name.toLowerCase() &&
            w.id !== editing?.id
        );

        if (isDuplicateName) {
            toast.error(`A worker named "${payload.full_name}" already exists.`);
            return;
        }

        if (editing) {
            await Database.updateFactoryWorker(editing.id, payload);
            toast.success('Worker updated.');
        } else {
            await Database.addFactoryWorker(payload);
            toast.success('Worker added.');
        }

        closeWizard();
        await load(search);
    };

    const toggleSalaryPaid = async (w: WorkerRow, paid: boolean) => {
        if (!isAdmin) return;
        try {
            if (paid) {
                // When marking as paid, generate a formal salary transaction record 
                // using the worker's base_salary for the current month
                const today = new Date().toISOString();
                await Database.addWorkerSalaryPayment({
                    worker_id: w.id,
                    amount: w.base_salary || 0,
                    payment_date: today,
                    type: 'BASE',
                    notes: `Auto-marked paid for ${currentMonthLabel}`
                });
            } else {
                await Database.setFactoryWorkerSalaryPaid(w.id, false);
            }
            // `load` updates `workers` which triggers the sync `useEffect` above to update `selectedWorker`
            await load(search);
            // Refresh history payload to show the new transaction immediately
            if (selectedWorker?.id === w.id) {
                const updatedHistory = await Database.getWorkerSalaryHistory(w.id);
                setSalaryHistory(updatedHistory);
            }
        } catch (e: any) {
            console.error(e);
            toast.error('Could not update salary status.');
        }
    };

    const initialWizardData: FactoryWorkerFormData | null = editing ? {
        enrollment_no: editing.enrollment_no || generatedEnrollment,
        full_name: editing.full_name || '',
        gender: editing.gender || '',
        phone: editing.phone || '',
        join_date: editing.join_date || new Date().toISOString().slice(0, 10),
        date_of_birth: editing.date_of_birth || '',
        base_salary: String(editing.base_salary ?? ''),
        emergency_contact: editing.emergency_contact || '',
        status: (editing.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
    } : null;

    return (
        <div className="max-w-[1650px] mx-auto space-y-4 pb-20 text-slate-900">
            {!showWizard && (
                <>
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                                <UserSquare2 size={18} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-900 tracking-tight">Factory Workers</h1>
                                <p className="text-[11px] font-semibold text-slate-500">Worker registry with monthly salary status for {currentMonthLabel}.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search worker"
                                    className="pl-7 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-900 w-44"
                                />
                            </div>
                            {isAdmin && (
                                <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black inline-flex items-center gap-1.5">
                                    <Plus size={12} /> Add Worker
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                                        <th className="px-5 py-3">Factory Worker</th>
                                        <th className="px-5 py-3 text-right">Status ({currentMonthLabel})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr><td colSpan={2} className="py-14 text-center text-sm font-bold text-slate-400">Loading workers...</td></tr>
                                    ) : workers.length === 0 ? (
                                        <tr><td colSpan={2} className="py-14 text-center text-sm font-bold text-slate-400">No workers found.</td></tr>
                                    ) : workers.map((w) => (
                                        <tr key={w.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => setSelectedWorker(w)}>
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-bold text-slate-900">{w.full_name}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {w.salary_paid_this_month ? (
                                                    <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 size={12} /> Paid
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                                                        <XCircle size={12} /> Unpaid
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {showWizard && (
                <FactoryWorkerWizard
                    initialData={editing ? initialWizardData : null}
                    generatedEnrollment={generatedEnrollment}
                    onCancel={closeWizard}
                    onComplete={handleWizardSave}
                />
            )}

            {/* Expensify-Style Slide Over Panel for Worker Details */}
            {selectedWorker && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
                        onClick={() => setSelectedWorker(null)}
                    ></div>
                    <div className="fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col font-sans" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                    <UserSquare2 size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Worker Protocol</h3>
                            </div>
                            <button
                                onClick={() => setSelectedWorker(null)}
                                className="p-3 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex items-center justify-center group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-10">
                            <div className="text-center mb-12">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Starline Factory ID</p>
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
                                    {selectedWorker.full_name}
                                </h1>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">ENROLLMENT: {selectedWorker.enrollment_no}</p>
                            </div>

                            <div className="space-y-6 max-w-xl mx-auto">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Age / Gender</p>
                                        <p className="text-lg font-bold text-slate-900">{calculateAge(selectedWorker.date_of_birth)} <span className="text-slate-400 font-medium px-1">•</span> <span className="capitalize">{selectedWorker.gender || '—'}</span></p>
                                    </div>
                                    <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Age Group Tenure</p>
                                        <p className="text-lg font-bold text-slate-900">{calculateTenure(selectedWorker.join_date)}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Phone</p>
                                        <p className="text-lg font-bold text-slate-900">{selectedWorker.phone || '—'}</p>
                                    </div>
                                    <div className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Emergency</p>
                                        <p className="text-lg font-bold text-slate-900">{selectedWorker.emergency_contact || '—'}</p>
                                    </div>
                                </div>

                                <div className="p-8 rounded-3xl border border-slate-200 shadow-sm bg-white mt-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Salary</p>
                                        <p className="text-3xl font-black text-slate-900">₹{(selectedWorker.base_salary || 0).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status ({currentMonthLabel})</p>
                                        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${selectedWorker.salary_paid_this_month ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                            {selectedWorker.salary_paid_this_month ? <><BadgeCheck size={16} /> Paid</> : <><ShieldCheck size={16} /> Unpaid</>}
                                        </div>
                                    </div>
                                    <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paid On</p>
                                        <p className="text-xl font-black text-slate-900">
                                            {selectedWorker.salary_paid_this_month
                                                ? (salaryHistory.length > 0 ? formatDate(salaryHistory[0].payment_date) : 'Legacy (Date Unknown)')
                                                : '—'}
                                        </p>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center gap-3 mt-8">
                                        {selectedWorker.salary_paid_this_month ? (
                                            <button onClick={() => toggleSalaryPaid(selectedWorker, false)} className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center justify-center gap-2 transition-colors">Unmark Salary</button>
                                        ) : (
                                            <button onClick={() => toggleSalaryPaid(selectedWorker, true)} className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-2 transition-colors"><BadgeCheck size={16} /> Mark Paid</button>
                                        )}
                                        <button onClick={() => { openEdit(selectedWorker); setSelectedWorker(null); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"><Pencil size={14} /> Edit</button>
                                    </div>
                                )}

                                {salaryHistory.length > 0 && (
                                    <div className="mt-12">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Salary History</h4>
                                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-5 py-3 border-b border-slate-200">Date</th>
                                                        <th className="px-5 py-3 border-b border-slate-200">Type</th>
                                                        <th className="px-5 py-3 border-b border-slate-200 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {salaryHistory.map((sh, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="px-5 py-3 text-slate-700 font-semibold">{formatDate(sh.payment_date)}</td>
                                                            <td className="px-5 py-3">
                                                                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[9px] font-bold uppercase tracking-widest">
                                                                    {sh.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-right font-black text-slate-900">₹{sh.amount.toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {!isAdmin && (
                <p className="text-[11px] font-semibold text-slate-500">View-only mode. Only admin can add/update worker details and salary status.</p>
            )}
        </div>
    );
}
