
import React, { useState, useEffect, useMemo } from 'react';
import {
    Tag, IndianRupee, Box, Edit2, History, X, Loader2,
    Calendar as CalendarIcon, ArrowLeft, Search, Filter, ChevronRight,
    Plus, CheckCircle2, TrendingUp, Clock
} from 'lucide-react';
import { Database } from '../db';
import { BatteryModel } from '../types';
import { getLocalDate } from '../utils';

interface PriceManagerProps {
    models: BatteryModel[];
}

type ViewMode = 'LIST' | 'DETAIL';

const PriceManager: React.FC<PriceManagerProps> = ({ models }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('LIST');
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState<BatteryModel | null>(null);
    const [priceForm, setPriceForm] = useState({ price: '', effectiveDate: getLocalDate() });
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadPriceData();
    }, []);

    const loadPriceData = async () => {
        const currentPrices = await Database.getCurrentPrices();
        setPrices(currentPrices);
    };

    const handleSelectModel = async (model: BatteryModel) => {
        setSelectedModel(model);
        setPriceForm({
            price: prices[model.id]?.toString() || '',
            effectiveDate: getLocalDate()
        });

        setViewMode('DETAIL');
        setIsHistoryLoading(true);
        const history = await Database.getModelPriceHistory(model.id);
        setPriceHistory(history);
        setIsHistoryLoading(false);
    };

    const notify = (message: string, type: 'success' | 'error' = 'success') => {
        window.dispatchEvent(new CustomEvent('app-notify', { detail: { message, type } }));
    };

    const handleUpdatePrice = async () => {
        if (!selectedModel || !priceForm.price) return;
        setIsActionLoading(true);
        try {
            await Database.updateModelPrice(
                selectedModel.id,
                parseFloat(priceForm.price),
                priceForm.effectiveDate
            );

            await loadPriceData();
            const history = await Database.getModelPriceHistory(selectedModel.id);
            setPriceHistory(history);
            notify(`Price updated for ${selectedModel.name}`, 'success');
        } catch (e: any) {
            notify(`Failed to update price: ${e.message}`, 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredModels = useMemo(() => {
        return models.filter(m =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [models, searchTerm]);

    if (viewMode === 'DETAIL' && selectedModel) {
        const currentPrice = prices[selectedModel.id];

        return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto space-y-3">
                {/* Back bar */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={15} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none truncate">{selectedModel.name}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure Pricing</p>
                    </div>
                    {currentPrice && (
                        <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 shrink-0">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-700">₹{currentPrice.toLocaleString()} active</span>
                        </div>
                    )}
                </div>

                {/* Main card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Form section */}
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <IndianRupee size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Set New Price</span>
                        </div>

                        {/* Inline form row */}
                        <div className="flex gap-3">
                            {/* Price input */}
                            <div className="flex-1 relative group">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 text-sm font-bold transition-colors select-none">₹</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-900 tabular-nums"
                                    value={priceForm.price}
                                    onChange={e => setPriceForm({ ...priceForm, price: e.target.value })}
                                />
                            </div>

                            {/* Date input */}
                            <div className="relative group w-44">
                                <CalendarIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                <input
                                    type="date"
                                    className="w-full pl-8 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700"
                                    value={priceForm.effectiveDate}
                                    onChange={e => setPriceForm({ ...priceForm, effectiveDate: e.target.value })}
                                />
                            </div>

                            {/* Publish button */}
                            <button
                                onClick={handleUpdatePrice}
                                disabled={isActionLoading || !priceForm.price}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-sm"
                            >
                                {isActionLoading
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <Plus size={13} />}
                                Publish
                            </button>
                        </div>

                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            Price will apply to all sales on or after the effective date.
                        </p>
                    </div>

                    {/* Divider + history */}
                    <div className="border-t border-slate-100">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60">
                            <History size={13} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price History</span>
                            {priceHistory.length > 0 && (
                                <span className="ml-auto text-[9px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{priceHistory.length} entries</span>
                            )}
                        </div>

                        <div className="max-h-56 overflow-y-auto">
                            {isHistoryLoading ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
                                </div>
                            ) : priceHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300">
                                    <History size={22} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">No price history yet</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {priceHistory.map((record, i) => (
                                        <div key={record.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700 font-mono tabular-nums">
                                                        {record.effectiveDate.split('-').reverse().join('/')}
                                                    </p>
                                                    {i === 0 && (
                                                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Current</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-sm font-black tabular-nums ${i === 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                                ₹{record.price.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header & Search */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 px-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-md border border-slate-800">
                        <Tag size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase leading-none mb-1">Pricing Registry</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit value management</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative group w-full sm:w-60">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter by name or ID..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all uppercase tracking-wide"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="hidden lg:flex items-center gap-2 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
                        <TrendingUp size={12} className="text-blue-500" />
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Revenue Projections</p>
                    </div>
                </div>
            </div>

            {/* Models Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Product Identity</th>
                            <th className="px-6 py-4 text-center">Specifications</th>
                            <th className="px-6 py-4 text-center">Unit Valuation</th>
                            <th className="px-6 py-4 text-right pr-6">Control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredModels.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:border-slate-200 transition-all shadow-sm">
                                            <Box size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-tight leading-none mb-1">{m.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 mono uppercase tracking-wider">ID: {m.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 text-[9px] font-bold text-slate-600 uppercase tabular-nums">
                                            {m.defaultCapacity}
                                        </div>
                                        <div className="bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 text-[9px] font-bold text-blue-600 uppercase tabular-nums">
                                            {m.defaultWarrantyMonths} MO
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center tabular-nums">
                                    {prices[m.id] ? (
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-black text-slate-900 leading-tight">₹{prices[m.id].toLocaleString()}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <CheckCircle2 size={9} className="text-emerald-500" />
                                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Active</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-rose-400 italic">
                                            <span className="text-[9px] font-bold uppercase tracking-tight">Unpriced</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right pr-6">
                                    <button
                                        onClick={() => handleSelectModel(m)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 shadow-sm"
                                    >
                                        Configure
                                        <ChevronRight size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredModels.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                            <Search size={32} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No models match your search query</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceManager;
