import React, { useEffect, useMemo, useState } from 'react';
import { Database } from '../db';
import { toast } from 'sonner';
import { AlertTriangle, Boxes, Factory, Loader2, RefreshCw, Search, Wallet, Wrench } from 'lucide-react';
import RawMaterials from './RawMaterials';

interface DashboardProps {
    onNavigate?: (tab: string) => void;
}

interface StockItem {
    id: string;
    name: string;
    unit: string;
    alert_threshold: number;
    purchased: number;
    consumed: number;
    current_stock: number;
    avg_cost: number;
    is_low: boolean;
}

interface DashStats {
    thisMonthProduction: number;
    thisMonthExpenses: number;
    thisMonthPurchaseSpend: number;
    thisMonthBatteriesDelivered: number;
    positiveGridTotal: number;
    negativeGridTotal: number;
    positiveGridAvgPrice: number;
    negativeGridAvgPrice: number;
    productionByModel: { model: string; units: number }[];
    expenseByCategory: { category: string; total: number }[];
    last30DayAvgPrices: { name: string; unit: string; avg_cost: number }[];
}

type StockView = 'all' | 'low' | 'healthy';

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtQty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(1));

export default function Dashboard({ onNavigate }: DashboardProps) {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [stats, setStats] = useState<DashStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [stockView, setStockView] = useState<StockView>('all');
    const [lastUpdated, setLastUpdated] = useState('');
    const [showMaterials, setShowMaterials] = useState(false);

    const load = async () => {
        setIsLoading(true);
        try {
            const [stockData, statsData] = await Promise.all([
                Database.getInventoryOverview(),
                Database.getManufacturingDashboardStats(),
            ]);
            setStock(stockData);
            setStats(statsData);
            setLastUpdated(new Date().toLocaleString('en-IN'));
        } catch (error) {
            console.error(error);
            toast.error('Could not load manufacturing dashboard.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const lowStock = useMemo(() => stock.filter((item) => item.is_low), [stock]);

    const visibleStock = useMemo(() => {
        let rows = [...stock];
        if (stockView === 'low') rows = rows.filter((r) => r.is_low);
        if (stockView === 'healthy') rows = rows.filter((r) => !r.is_low);
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            rows = rows.filter((r) => r.name.toLowerCase().includes(q));
        }
        rows.sort((a, b) => {
            if (a.is_low !== b.is_low) return a.is_low ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return rows;
    }, [stock, stockView, query]);

    const stockValue = useMemo(
        () => stock.reduce((sum, item) => sum + (item.current_stock * item.avg_cost), 0),
        [stock]
    );

    const healthPct = stock.length === 0 ? 100 : Math.round(((stock.length - lowStock.length) / stock.length) * 100);

    return (
        <div className="max-w-[1650px] mx-auto space-y-8 pb-32 text-slate-900 font-sans">
            <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-blue-50/50 rounded-full blur-[100px] pointer-events-none -mr-16 -mt-16 z-0"></div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Factory Control</h1>
                        <p className="text-sm text-slate-500 font-semibold mt-2 max-w-lg leading-relaxed">Centralized view of production, logistics, and material overhead calculations.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={() => setShowMaterials(true)} className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">Materials</button>
                        <button onClick={() => onNavigate?.('purchases')} className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">Purchases</button>
                        <button onClick={load} className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-slate-900 text-white hover:bg-black inline-flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-slate-900/20">
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> {isLoading ? 'Syncing...' : 'Sync'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-10 relative z-10">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-center">
                        <p className="text-[10px] flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-widest"><Boxes size={12} /> Tracked Assets</p>
                        <p className="text-2xl font-black text-slate-900 mt-2">{stock.length}</p>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5 flex flex-col justify-center">
                        <p className="text-[10px] flex items-center gap-1.5 font-bold text-red-500 uppercase tracking-widest"><AlertTriangle size={12} /> Low Stock</p>
                        <p className="text-2xl font-black text-red-700 mt-2">{lowStock.length}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 flex flex-col justify-center">
                        <p className="text-[10px] flex items-center gap-1.5 font-bold text-emerald-600 uppercase tracking-widest">Health Index</p>
                        <p className="text-2xl font-black text-emerald-700 mt-2">{healthPct}%</p>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 flex flex-col justify-center">
                        <p className="text-[10px] flex items-center gap-1.5 font-bold text-blue-600 uppercase tracking-widest">Net Value</p>
                        <p className="text-xl font-black text-blue-700 mt-2 tracking-tight">{fmtINR(stockValue)}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5 flex flex-col justify-center">
                        <p className="text-[10px] flex items-center gap-1.5 font-bold text-violet-600 uppercase tracking-widest">Purchases (MTD)</p>
                        <p className="text-xl font-black text-violet-700 mt-2 tracking-tight">{fmtINR(stats?.thisMonthPurchaseSpend ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 flex flex-col justify-center items-start overflow-hidden">
                        <p className="text-[10px] flex items-center gap-1.5 font-bold text-amber-600 uppercase tracking-widest">Expenses (MTD)</p>
                        <p className="text-xl font-black text-amber-700 mt-2 tracking-tight">{fmtINR(stats?.thisMonthExpenses ?? 0)}</p>
                    </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6 bg-white/50 inline-block px-3 py-1.5 rounded-lg border border-slate-100 backdrop-blur-sm relative z-10">Last sync: {lastUpdated || '—'}</p>
            </div>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-2">
                    <Loader2 size={24} className="text-slate-300 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading data...</p>
                </div>
            ) : (
                <>
                    {lowStock.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle size={18} className="text-red-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-black text-red-700 uppercase tracking-wide">Low Stock Alert</p>
                                        <p className="text-xs font-semibold text-red-700/80 mt-1">
                                            {lowStock.slice(0, 6).map(item => `${item.name} (${fmtQty(item.current_stock)} ${item.unit})`).join(' • ')}
                                            {lowStock.length > 6 ? ` • +${lowStock.length - 6} more` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowMaterials(true)} className="px-4 py-2.5 rounded-xl bg-white border border-red-100 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm transition-colors">
                                    Manage Materials
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                                    <Boxes size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock and Average Price</p>
                                    <p className="text-xs font-semibold text-slate-500">{visibleStock.length} cards shown</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search material"
                                        className="pl-8 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                                    />
                                </div>
                                <select
                                    value={stockView}
                                    onChange={(e) => setStockView(e.target.value as StockView)}
                                    className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-900"
                                >
                                    <option value="all">All</option>
                                    <option value="low">Low Only</option>
                                    <option value="healthy">Healthy Only</option>
                                </select>
                            </div>
                        </div>

                        {visibleStock.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-sm font-bold text-slate-500">No materials match current filters.</p>
                            </div>
                        ) : (
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {visibleStock.map((item) => (
                                    <div key={item.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex flex-col justify-between group">
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-1.5">
                                                <p className="text-base font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{item.name}</p>
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shrink-0 ${item.is_low ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-500 border border-slate-200/50'}`}>
                                                    {item.is_low ? 'Low' : 'OK'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Unit base: {item.unit}</p>
                                        </div>

                                        <div className="space-y-4 mt-8">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock</p>
                                                <p className={`text-3xl font-black mt-1 ${item.is_low ? 'text-red-600' : 'text-slate-900'}`}>{fmtQty(item.current_stock)}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100/50">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Consumed</p>
                                                    <p className="font-black text-slate-700 text-sm">{fmtQty(item.consumed)}</p>
                                                </div>
                                                <div className="rounded-xl bg-slate-50 px-3 py-2 border border-slate-100/50">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Alert Below</p>
                                                    <p className="font-black text-slate-700 text-sm">{fmtQty(item.alert_threshold)}</p>
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-blue-50/50 px-3 py-2.5 border border-blue-100/50 flex flex-col justify-center">
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Weighted Avg Buy Price</p>
                                                <p className="font-black text-blue-700 text-sm">{item.avg_cost > 0 ? `₹${item.avg_cost.toFixed(2)} / ${item.unit}` : 'No purchase history'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 bg-slate-50 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Total Production (MTD)</p>
                            <p className="text-4xl font-black text-slate-900 mt-3 relative z-10">{stats?.thisMonthProduction?.toLocaleString('en-IN') ?? 0}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1 relative z-10">Gross units verified & assembled</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 bg-slate-50 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Total Dispatched (MTD)</p>
                            <p className="text-4xl font-black text-slate-900 mt-3 relative z-10">{stats?.thisMonthBatteriesDelivered?.toLocaleString('en-IN') ?? 0}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1 relative z-10">Batteries shipped to external outlets</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Positive Grid Output</p>
                            <p className="text-4xl font-black text-slate-900 mt-3">{stats?.positiveGridTotal?.toLocaleString('en-IN') ?? 0}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">Total positive grids produced</p>
                            <div className="mt-5 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Avg Single Positive Grid Price</p>
                                <p className="text-xl font-black text-rose-700 mt-1">{fmtINR(stats?.positiveGridAvgPrice ?? 0)}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Negative Grid Output</p>
                            <p className="text-4xl font-black text-slate-900 mt-3">{stats?.negativeGridTotal?.toLocaleString('en-IN') ?? 0}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">Total negative grids produced</p>
                            <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Avg Single Negative Grid Price</p>
                                <p className="text-xl font-black text-blue-700 mt-1">{fmtINR(stats?.negativeGridAvgPrice ?? 0)}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showMaterials && (
                <RawMaterials onClose={() => { setShowMaterials(false); load(); }} />
            )}
        </div>
    );
}
