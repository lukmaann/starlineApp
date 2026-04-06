import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { Expense, FactoryWorker } from '../types';
import { getLocalDate } from '../utils';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Filter, Loader2, RefreshCw, Search, Wallet, X, FileText, ChevronRight, Calculator, IndianRupee } from 'lucide-react';

const PAGE_SIZE = 10;
const CATEGORIES = ['Electricity', 'Maintenance', 'Transport', 'Salaries', 'Office Supplies', 'Rent', 'Miscellaneous'];

type ExpenseStep = 1 | 2 | 3;

export default function Expenses() {
    const [data, setData] = useState<Expense[]>([]);
    const [total, setTotal] = useState(0);
    const [workers, setWorkers] = useState<Array<FactoryWorker & { salary_paid_this_month: boolean }>>([]);
    const [isLoad, setIsLoad] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [showWizard, setShowWizard] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [step, setStep] = useState<ExpenseStep>(1);

    // Side Panel State
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    const [form, setForm] = useState({
        date: getLocalDate(),
        category: CATEGORIES[0],
        amount: '',
        description: '',
        worker_id: '',
    });

    const [filterCategory, setFilterCategory] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const amountNum = Number(form.amount);
    const selectedWorker = workers.find(w => w.id === form.worker_id);

    const canGoStep2 = Boolean(form.date && form.category);
    const workerAlreadyPaid = Boolean(selectedWorker?.salary_paid_this_month);
    const canGoStep3 = Number.isFinite(amountNum) && amountNum > 0 && (form.category !== 'Salaries' || (!!form.worker_id && !workerAlreadyPaid));

    const loadData = useCallback(async (p = page) => {
        setIsLoad(true);
        try {
            const res = await Database.getPaginatedExpenses(
                p,
                PAGE_SIZE,
                filterCategory || undefined,
                filterDateFrom || undefined,
                filterDateTo || undefined,
                searchText || undefined
            );
            setData(res.data);
            setTotal(res.total);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load expenses.');
        } finally {
            setIsLoad(false);
        }
    }, [page, filterCategory, filterDateFrom, filterDateTo, searchText]);

    useEffect(() => {
        loadData();
    }, [page, filterCategory, filterDateFrom, filterDateTo, searchText]);

    useEffect(() => {
        Database.getFactoryWorkers().then(setWorkers).catch(() => {
            toast.error('Failed to load workers for salary expenses.');
        });
    }, []);

    const visibleTotal = useMemo(() => data.reduce((sum, row) => sum + (row.amount || 0), 0), [data]);

    const resetForm = () => {
        setForm({ date: getLocalDate(), category: CATEGORIES[0], amount: '', description: '', worker_id: '' });
        setStep(1);
    };

    const handleSave = async () => {
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            toast.error('Enter a valid amount.');
            return;
        }

        setIsSaving(true);
        try {
            const finalDescription = form.category === 'Salaries' && selectedWorker
                ? `Salary paid to ${selectedWorker.full_name} (${selectedWorker.enrollment_no})${form.description.trim() ? ` - ${form.description.trim()}` : ''}`
                : (form.description.trim() || `${form.category} paid`);

            // Guard: prevent double salary payment for this month
            if (form.category === 'Salaries' && form.worker_id && workerAlreadyPaid) {
                toast.error(`Salary already paid this month for ${selectedWorker?.full_name || 'this employee'}.`);
                setIsSaving(false);
                return;
            }

            await Database.addExpense({
                date: form.date,
                category: form.category,
                amount: amountNum,
                description: finalDescription,
            });

            if (form.category === 'Salaries' && form.worker_id) {
                await Database.addWorkerSalaryPayment({
                    worker_id: form.worker_id,
                    amount: amountNum,
                    payment_date: new Date(form.date).toISOString(),
                    type: 'BASE',
                    notes: 'Logged via Expenses'
                });
            }

            toast.success('Expense logged successfully.');
            resetForm();
            setShowWizard(false);
            setPage(1);
            await loadData(1);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save expense.');
        } finally {
            setIsSaving(false);
        }
    };

    const getInitials = (category: string) => {
        if (!category) return 'EX';
        return category.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-[1650px] mx-auto space-y-4 pb-20 text-slate-900 relative">
            {/* View Mode */}
            {!showWizard && (
                <>
                    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white shadow-inner">
                                <Wallet size={20} className="text-white/90" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Expenses</h1>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Track and analyze factory expenditure</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchText}
                                    onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                                    placeholder="Search expenses..."
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
                                Log Expense
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus:border-slate-900 focus:bg-white transition-colors" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}>
                                    <option value="">All Categories</option>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                                <button onClick={() => { setFilterCategory(''); setFilterDateFrom(''); setFilterDateTo(''); setSearchText(''); setPage(1); }} className="w-full px-4 py-2.5 rounded-lg bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-colors">Clear Filters</button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Expense Ledger</h2>
                            <p className="text-xs font-semibold text-slate-500">Visible Total: <span className="text-slate-900 font-black ml-1">₹{visibleTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-4 font-bold">Details</th>
                                        <th className="px-6 py-4 font-bold">Category</th>
                                        <th className="px-6 py-4 font-bold text-right">Amount</th>
                                        <th className="px-6 py-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80">
                                    {isLoad ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading ledger...</p></td></tr>
                                    ) : data.length === 0 ? (
                                        <tr><td colSpan={4} className="py-20 text-center"><Wallet size={32} className="text-slate-200 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">No expenses recorded yet.</p></td></tr>
                                    ) : data.map((exp) => (
                                        <tr
                                            key={exp.id}
                                            onClick={() => setSelectedExpense(exp)}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black uppercase tracking-wider border border-slate-200 group-hover:bg-white group-hover:border-slate-300 transition-colors shrink-0">
                                                        {getInitials(exp.category)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 line-clamp-1">{exp.description || 'Unknown Expense'}</p>
                                                        <p className="text-xs font-medium text-slate-500 mt-1">{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-base font-black text-slate-900">₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                            <span className="text-xs font-semibold text-slate-400 ml-2">{step === 1 ? 'Classification' : step === 2 ? 'Details' : 'Review'}</span>
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
                                <IndianRupee size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Record Expense</h1>
                        </div>

                        {/* Wizard Content */}
                        <div className="text-left w-full max-w-lg mx-auto min-h-[300px]">
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        >
                                            {CATEGORIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    {form.category === 'Salaries' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Employee</label>
                                            <select
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                                                value={form.worker_id}
                                                onChange={(e) => {
                                                    const workerId = e.target.value;
                                                    const worker = workers.find(w => w.id === workerId);
                                                    setForm({
                                                        ...form,
                                                        worker_id: workerId,
                                                        amount: worker && worker.base_salary ? String(worker.base_salary) : form.amount,
                                                    });
                                                }}
                                            >
                                                <option value="">Select Employee</option>
                                                {workers.map((w) => (
                                                    <option key={w.id} value={w.id}>
                                                        {w.full_name} ({w.enrollment_no})
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Already-paid error banner */}
                                            {workerAlreadyPaid && form.worker_id && (
                                                <div className="mt-2 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
                                                    <span className="text-rose-500 mt-0.5 shrink-0">⚠️</span>
                                                    <div>
                                                        <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Already Paid This Month</p>
                                                        <p className="text-xs font-medium text-rose-600 mt-0.5">This month's salary for <span className="font-bold">{selectedWorker?.full_name}</span> has already been paid. Select a different employee or wait until next month.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₹</span>
                                            <input
                                                type="number"
                                                min={1}
                                                step="0.01"
                                                autoFocus
                                                placeholder="0.00"
                                                className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                                value={form.amount}
                                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="What was this for?"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                        <div className="p-8 text-center border-b border-slate-200 bg-white">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Amount</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tight">₹{Number.isFinite(amountNum) ? amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
                                        </div>
                                        <div className="p-8 space-y-5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</span>
                                                <span className="text-sm font-bold text-slate-900">{new Date(form.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category</span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest bg-slate-200 text-slate-700">
                                                    {form.category}
                                                </span>
                                            </div>
                                            {form.description.trim() && (
                                                <div className="flex justify-between items-start border-t border-slate-200/60 pt-5">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes</span>
                                                    <span className="text-sm font-semibold text-slate-700 text-right max-w-[60%]">{form.description.trim()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="mt-12 flex items-center justify-between w-full max-w-lg mx-auto">
                            <button
                                onClick={() => step > 1 ? setStep((step - 1) as ExpenseStep) : setShowWizard(false)}
                                className="px-6 py-4 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                {step === 1 ? 'Cancel' : 'Back'}
                            </button>

                            {step < 3 ? (
                                <button
                                    onClick={() => {
                                        if (step === 1 && !canGoStep2) return toast.error('Check form requirements.');
                                        if (step === 2 && !canGoStep3) {
                                            if (form.category === 'Salaries' && !form.worker_id) return toast.error('Select an employee.');
                                            if (form.category === 'Salaries' && workerAlreadyPaid) return toast.error(`Salary already paid this month for ${selectedWorker?.full_name}.`);
                                            return toast.error('Enter a valid amount.');
                                        }
                                        setStep((step + 1) as ExpenseStep);
                                    }}
                                    className="px-8 py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    Confirm Receipt
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Expensify-Style Slide Over Panel for Expense Details */}
            {selectedExpense && createPortal(
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
                        onClick={() => setSelectedExpense(null)}
                    ></div>
                    <div className="fixed inset-y-0 right-0 w-full md:w-1/2 bg-white shadow-2xl z-[70] animate-in slide-in-from-right duration-300 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                    <FileText size={18} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Expense Details</h3>
                            </div>
                            <button
                                onClick={() => setSelectedExpense(null)}
                                className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 border-b border-slate-100">
                            <div className="text-center mb-10">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Amount</p>
                                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                                    ₹{selectedExpense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h1>
                            </div>

                            <div className="space-y-6">
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                    <p className="text-sm font-bold text-slate-900">{new Date(selectedExpense.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category Classification</p>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-slate-200 text-slate-700">
                                        {selectedExpense.category}
                                    </span>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description / Notes</p>
                                    <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedExpense.description || 'No additional description provided for this record.'}
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Record ID</p>
                                    <p className="text-xs font-mono font-bold text-slate-500">{selectedExpense.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                Logged in Starline Enterprise via Manufacturing Ledger
                            </p>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

