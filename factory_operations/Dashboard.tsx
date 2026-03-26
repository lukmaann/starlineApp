import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Database } from '../db';
import { toast } from 'sonner';
import { Boxes, Check, Loader2, Package, RefreshCw, Search, TrendingUp, ChevronDown, type LucideIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import RawMaterials from './RawMaterials';
import { getAllBatteryModels, type BatteryModelData } from '../components/calculator/calculatorData';
import { BatteryModel } from '../types';

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
    availableYears: number[];
    selectedYear: number;
    selectedMonth: number;
    thisMonthProduction: number;
    lastMonthProduction: number;
    thisMonthExpenses: number;
    lastMonthExpenses: number;
    thisMonthPurchaseSpend: number;
    lastMonthPurchaseSpend: number;
    thisMonthBatteriesDelivered: number;
    lastMonthBatteriesDelivered: number;
    positiveGridTotal: number;
    negativeGridTotal: number;
    positiveGridAvgPrice: number;
    negativeGridAvgPrice: number;
    positivePlateTotal: number;
    negativePlateTotal: number;
    positivePlateAvgPrice: number;
    negativePlateAvgPrice: number;
    assemblyByModel: { model: string; units: number; avg_price: number }[];
    monthlyOverview: { month: number; label: string; production: number; dispatched: number; purchases: number; expenses: number }[];
    selectedMonthModelMix: { name: string; value: number }[];
    selectedMonthStageMix: { name: string; value: number }[];
    productionByModel: { model: string; units: number }[];
    expenseByCategory: { category: string; total: number }[];
    last30DayAvgPrices: { name: string; unit: string; avg_cost: number }[];
}

type StockView = 'all' | 'low' | 'healthy';
type DashboardView = 'summary' | 'production' | 'stock';
type ProductionFocus = 'overview' | 'assembled';

type SummaryRow = {
    id: string;
    label: string;
    value: string;
    note: string;
};

type ProductionRow = {
    id: string;
    step: string;
    output: string;
    unit: string;
    avgCost: string;
    note: string;
};

const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtQty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(1));
const pctDelta = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
};
const deltaLabel = (current: number, previous: number, suffix = '%') => {
    const delta = pctDelta(current, previous);
    const rounded = Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1);
    return `${delta >= 0 ? '+' : ''}${rounded}${suffix}`;
};
const monthShort = (offset: number) => new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
const monthName = (month: number) => new Date(2026, month - 1, 1).toLocaleDateString('en-IN', { month: 'long' }).toUpperCase();
const previousMonthLabel = (year: number, month: number) => new Date(year, month - 2, 1).toLocaleDateString('en-IN', { month: 'long' }).toUpperCase();
const viewOptions: Array<{ id: DashboardView; label: string; icon: LucideIcon; iconClass: string; }> = [
    { id: 'summary', label: 'This Month', icon: TrendingUp, iconClass: 'text-blue-600' },
    { id: 'production', label: 'Production Flow', icon: Boxes, iconClass: 'text-violet-600' },
    { id: 'stock', label: 'Materials Stock', icon: Package, iconClass: 'text-emerald-600' },
];
const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#dc2626', '#475569'];

export default function Dashboard({ onNavigate }: DashboardProps) {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [stats, setStats] = useState<DashStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<DashboardView>('summary');
    const [stockView, setStockView] = useState<StockView>('all');
    const [productionFocus, setProductionFocus] = useState<ProductionFocus>('overview');
    const [query, setQuery] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [showMaterials, setShowMaterials] = useState(false);
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedAssemblyModel, setSelectedAssemblyModel] = useState('');
    const [systemModelNames, setSystemModelNames] = useState<string[]>([]);
    const viewMenuRef = useRef<HTMLDivElement | null>(null);

    const load = async () => {
        setIsLoading(true);
        try {
            const [stockData, statsData, modelsData] = await Promise.all([
                Database.getInventoryOverview(),
                Database.getManufacturingDashboardStats(selectedYear, selectedMonth),
                Database.getAll<BatteryModel>('models'),
            ]);
            setStock(stockData);
            setStats(statsData);
            setSystemModelNames(
                Array.from(new Set(modelsData.map((model) => String(model.name || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
            );
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
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!viewMenuRef.current?.contains(event.target as Node)) {
                setIsViewMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const lowStock = useMemo(() => stock.filter((item) => item.is_low), [stock]);

    const visibleStock = useMemo(() => {
        let rows = [...stock];
        if (stockView === 'low') rows = rows.filter((item) => item.is_low);
        if (stockView === 'healthy') rows = rows.filter((item) => !item.is_low);
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            rows = rows.filter((item) => item.name.toLowerCase().includes(q));
        }
        rows.sort((a, b) => {
            if (a.is_low !== b.is_low) return a.is_low ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        return rows;
    }, [stock, stockView, query]);

    const summaryRows: SummaryRow[] = useMemo(() => ([
        {
            id: 'made',
            label: 'Batteries Made This Month',
            value: (stats?.thisMonthProduction ?? 0).toLocaleString('en-IN'),
            note: 'All finished production saved this month',
        },
        {
            id: 'dispatched',
            label: 'Batteries Dispatched This Month',
            value: (stats?.thisMonthBatteriesDelivered ?? 0).toLocaleString('en-IN'),
            note: 'Finished batteries sold and moved out',
        },
        {
            id: 'purchase_spend',
            label: 'Material Purchase Spend',
            value: fmtINR(stats?.thisMonthPurchaseSpend ?? 0),
            note: 'Purchase cost included in total expenses',
        },
        {
            id: 'expenses',
            label: 'Total Expenses',
            value: fmtINR(stats?.thisMonthExpenses ?? 0),
            note: 'Operating expenses plus material purchases',
        },
        {
            id: 'tracked_items',
            label: 'Materials Tracked',
            value: stock.length.toLocaleString('en-IN'),
            note: 'Raw materials and packing items in stock',
        },
        {
            id: 'low_stock',
            label: 'Low Stock Items',
            value: lowStock.length.toLocaleString('en-IN'),
            note: 'Items at or below the safe level',
        },
    ]), [stats, stock.length, lowStock.length]);

    const summaryCards = useMemo(() => {
        const currentProduction = stats?.thisMonthProduction ?? 0;
        const lastProduction = stats?.lastMonthProduction ?? 0;
        const currentDispatch = stats?.thisMonthBatteriesDelivered ?? 0;
        const lastDispatch = stats?.lastMonthBatteriesDelivered ?? 0;
        const currentPurchases = stats?.thisMonthPurchaseSpend ?? 0;
        const lastPurchases = stats?.lastMonthPurchaseSpend ?? 0;
        const currentExpenses = stats?.thisMonthExpenses ?? 0;
        const lastExpenses = stats?.lastMonthExpenses ?? 0;

        return [
            {
                id: 'production',
                label: 'Batteries Produced',
                current: currentProduction,
                previous: lastProduction,
                currentDisplay: currentProduction.toLocaleString('en-IN'),
                previousDisplay: lastProduction.toLocaleString('en-IN'),
                note: 'Finished units saved this month',
            },
            {
                id: 'dispatch',
                label: 'Batteries Dispatched',
                current: currentDispatch,
                previous: lastDispatch,
                currentDisplay: currentDispatch.toLocaleString('en-IN'),
                previousDisplay: lastDispatch.toLocaleString('en-IN'),
                note: 'Units sold and moved out',
            },
            {
                id: 'purchases',
                label: 'Material Purchase Spend',
                current: currentPurchases,
                previous: lastPurchases,
                currentDisplay: fmtINR(currentPurchases),
                previousDisplay: fmtINR(lastPurchases),
                note: 'This is part of total expense',
            },
            {
                id: 'expenses',
                label: 'Total Expenses',
                current: currentExpenses,
                previous: lastExpenses,
                currentDisplay: fmtINR(currentExpenses),
                previousDisplay: fmtINR(lastExpenses),
                note: 'Operating expenses plus purchases',
            },
        ];
    }, [stats]);

    const summaryBars = useMemo(() => {
        const maxValue = Math.max(...summaryCards.flatMap((card) => [card.current, card.previous]), 1);
        return summaryCards.map((card) => ({
            ...card,
            currentWidth: `${Math.max((card.current / maxValue) * 100, card.current > 0 ? 8 : 0)}%`,
            previousWidth: `${Math.max((card.previous / maxValue) * 100, card.previous > 0 ? 8 : 0)}%`,
            delta: deltaLabel(card.current, card.previous),
        }));
    }, [summaryCards]);

    const topModels = useMemo(() => {
        const rows = stats?.productionByModel ?? [];
        const maxUnits = Math.max(...rows.map((row) => row.units), 1);
        return rows.slice(0, 5).map((row) => ({
            ...row,
            width: `${(row.units / maxUnits) * 100}%`,
        }));
    }, [stats]);

    const expenseBreakdown = useMemo(() => {
        const rows = stats?.expenseByCategory ?? [];
        const maxTotal = Math.max(...rows.map((row) => row.total), 1);
        return rows.slice(0, 5).map((row) => ({
            ...row,
            width: `${(row.total / maxTotal) * 100}%`,
        }));
    }, [stats]);

    const productionRows: ProductionRow[] = useMemo(() => ([
        {
            id: 'positive_casting',
            step: 'Positive Casting',
            output: (stats?.positiveGridTotal ?? 0).toLocaleString('en-IN'),
            unit: 'grids',
            avgCost: fmtINR(stats?.positiveGridAvgPrice ?? 0),
            note: 'Average cost of one positive grid',
        },
        {
            id: 'negative_casting',
            step: 'Negative Casting',
            output: (stats?.negativeGridTotal ?? 0).toLocaleString('en-IN'),
            unit: 'grids',
            avgCost: fmtINR(stats?.negativeGridAvgPrice ?? 0),
            note: 'Average cost of one negative grid',
        },
        {
            id: 'positive_pasting',
            step: 'Positive Pasting',
            output: (stats?.positivePlateTotal ?? 0).toLocaleString('en-IN'),
            unit: 'plates',
            avgCost: fmtINR(stats?.positivePlateAvgPrice ?? 0),
            note: 'Finished cost of one positive plate',
        },
        {
            id: 'negative_pasting',
            step: 'Negative Pasting',
            output: (stats?.negativePlateTotal ?? 0).toLocaleString('en-IN'),
            unit: 'plates',
            avgCost: fmtINR(stats?.negativePlateAvgPrice ?? 0),
            note: 'Finished cost of one negative plate',
        },
    ]), [stats]);

    const productionCards = useMemo(() => ([
        {
            id: 'positive_grids',
            title: 'Positive Grids',
            quantity: stats?.positiveGridTotal ?? 0,
            quantityLabel: 'Total grids made',
            cost: stats?.positiveGridAvgPrice ?? 0,
            costLabel: 'Avg cost per grid',
            tint: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
        {
            id: 'negative_grids',
            title: 'Negative Grids',
            quantity: stats?.negativeGridTotal ?? 0,
            quantityLabel: 'Total grids made',
            cost: stats?.negativeGridAvgPrice ?? 0,
            costLabel: 'Avg cost per grid',
            tint: 'bg-amber-50 text-amber-700 border-amber-200',
        },
        {
            id: 'positive_plates',
            title: 'Positive Plates',
            quantity: stats?.positivePlateTotal ?? 0,
            quantityLabel: 'Total plates after pasting',
            cost: stats?.positivePlateAvgPrice ?? 0,
            costLabel: 'Avg cost per plate',
            tint: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
            id: 'negative_plates',
            title: 'Negative Plates',
            quantity: stats?.negativePlateTotal ?? 0,
            quantityLabel: 'Total plates after pasting',
            cost: stats?.negativePlateAvgPrice ?? 0,
            costLabel: 'Avg cost per plate',
            tint: 'bg-slate-100 text-slate-700 border-slate-200',
        },
        {
            id: 'assembled_batteries',
            title: 'Batteries Assembled',
            quantity: (stats?.assemblyByModel ?? []).reduce((sum, row) => sum + row.units, 0),
            quantityLabel: 'Total assembled batteries',
            cost: (() => {
                const rows = stats?.assemblyByModel ?? [];
                const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
                if (totalUnits === 0) return 0;
                return rows.reduce((sum, row) => sum + (row.avg_price * row.units), 0) / totalUnits;
            })(),
            costLabel: 'Avg cost per battery',
            tint: 'bg-violet-50 text-violet-700 border-violet-200',
            isInteractive: true,
            hideCost: true,
        },
    ]), [stats]);

    const assemblyRows = useMemo(() => stats?.assemblyByModel ?? [], [stats]);
    const allBatteryModels = useMemo(() => getAllBatteryModels(), []);
    const availableCalculatorModels = useMemo(
        () => systemModelNames.filter((modelName) => Boolean(allBatteryModels[modelName])),
        [systemModelNames, allBatteryModels]
    );
    const stockAvgCostMap = useMemo(() => {
        const entries = stock.map((item) => [item.name.trim().toLowerCase(), item.avg_cost] as const);
        return Object.fromEntries(entries);
    }, [stock]);
    const selectedAssemblyModelData: BatteryModelData | null = selectedAssemblyModel ? (allBatteryModels[selectedAssemblyModel] ?? null) : null;
    const selectedMonthAssemblyUnits = useMemo(() => (stats?.selectedMonthModelMix ?? []).reduce((sum, row) => sum + row.value, 0), [stats]);
    const selectedMonthOperatingExpenses = Math.max((stats?.thisMonthExpenses ?? 0) - (stats?.thisMonthPurchaseSpend ?? 0), 0);
    const assemblyOverheadPerBattery = selectedMonthAssemblyUnits > 0 ? selectedMonthOperatingExpenses / selectedMonthAssemblyUnits : 0;
    const selectedExpenseCategories = useMemo(() => (stats?.expenseByCategory ?? []).filter((row) => row.category !== 'Material Purchases'), [stats]);
    const selectedAssemblyCostRows = useMemo(() => {
        if (!selectedAssemblyModelData) return [];
        const containerKey = `container - ${selectedAssemblyModelData.model.trim().toLowerCase()}`;
        const getAvgCost = (name: string, fallback = 0) => stockAvgCostMap[name] ?? fallback;
        return [
            { label: 'Positive Plates', qty: selectedAssemblyModelData.positivePlates, unit: 'pcs', unitPrice: stats?.positivePlateAvgPrice ?? 0 },
            { label: 'Negative Plates', qty: selectedAssemblyModelData.negativePlates, unit: 'pcs', unitPrice: stats?.negativePlateAvgPrice ?? 0 },
            { label: 'PVC Separator', qty: selectedAssemblyModelData.pvcSeparator, unit: 'pcs', unitPrice: getAvgCost('pvc separator') },
            { label: 'Acid', qty: selectedAssemblyModelData.acidLiters, unit: 'liters', unitPrice: getAvgCost('acid') },
            { label: 'Packing Jali', qty: selectedAssemblyModelData.packingJali, unit: 'pcs', unitPrice: getAvgCost('packing jali') },
            { label: 'Plus Minus Caps', qty: selectedAssemblyModelData.minusPlusCaps, unit: 'pairs', unitPrice: getAvgCost('plus minus caps') },
            { label: 'Container', qty: 1, unit: 'pcs', unitPrice: getAvgCost(containerKey) },
            { label: 'Battery Packing', qty: 1, unit: 'pcs', unitPrice: getAvgCost('battery packing', selectedAssemblyModelData.batteryPacking) },
            { label: 'Charging', qty: 1, unit: 'service', unitPrice: selectedAssemblyModelData.charging },
            { label: 'Battery Screening', qty: 1, unit: 'service', unitPrice: selectedAssemblyModelData.batteryScreening },
            { label: 'Monthly Overhead', qty: 1, unit: 'share', unitPrice: assemblyOverheadPerBattery },
        ].map((row) => ({ ...row, total: row.qty * row.unitPrice }));
    }, [selectedAssemblyModelData, stockAvgCostMap, stats, assemblyOverheadPerBattery]);
    const selectedAssemblyPrice = useMemo(() => selectedAssemblyCostRows.reduce((sum, row) => sum + row.total, 0), [selectedAssemblyCostRows]);
    const activeView = viewOptions.find((option) => option.id === view) ?? viewOptions[0];
    const ActiveViewIcon = activeView.icon;
    const selectedMonthLabel = monthName(selectedMonth);
    const previousMonthName = previousMonthLabel(selectedYear, selectedMonth);

    const activeRowsCount = view === 'summary'
        ? summaryRows.length
        : view === 'production'
            ? (productionFocus === 'assembled' ? assemblyRows.length : productionCards.length)
            : visibleStock.length;

    useEffect(() => {
        if (!availableCalculatorModels.length) return;
        if (!selectedAssemblyModel || !availableCalculatorModels.includes(selectedAssemblyModel)) {
            setSelectedAssemblyModel(availableCalculatorModels[0]);
        }
    }, [availableCalculatorModels, selectedAssemblyModel]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div ref={viewMenuRef} className="w-full md:w-auto relative">
                    <button
                        type="button"
                        onClick={() => setIsViewMenuOpen((open) => !open)}
                        className="w-full md:min-w-[220px] flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-white hover:border-blue-500 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                                <ActiveViewIcon size={16} className={activeView.iconClass} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                {activeView.label}
                            </span>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isViewMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isViewMenuOpen && (
                        <div className="absolute left-0 top-[calc(100%+10px)] z-30 w-full md:w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2">
                            <div className="space-y-1">
                                {viewOptions.map((option) => {
                                    const OptionIcon = option.icon;
                                    const isActive = option.id === view;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setView(option.id);
                                                if (option.id !== 'production') {
                                                    setProductionFocus('overview');
                                                }
                                                setIsViewMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-all ${isActive ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                                                    <OptionIcon size={16} className={option.iconClass} />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                                                    {option.label}
                                                </span>
                                            </div>
                                            {isActive ? <Check size={16} className="text-blue-600" /> : <span className="w-4" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {view === 'stock' ? (
                    <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                            <input
                                placeholder="Search Material Name..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md outline-none font-bold text-sm transition-all uppercase tracking-wide text-slate-900 focus:bg-white focus:border-blue-500"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-auto relative">
                            <select
                                value={stockView}
                                onChange={(e) => setStockView(e.target.value as StockView)}
                                className="w-full px-3 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer text-slate-900 tracking-wide"
                            >
                                <option value="all">All Materials</option>
                                <option value="low">Low Stock Only</option>
                                <option value="healthy">Healthy Stock</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                ) : view === 'summary' ? (
                    <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-4">
                        <div className="w-full md:w-auto relative">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                {(stats?.availableYears ?? [selectedYear]).map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="w-full md:w-auto relative">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, index) => (
                                    <option key={index + 1} value={index + 1}>{monthName(index + 1)}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-700 ml-2">{selectedMonthLabel} {selectedYear}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 w-full flex items-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Last Sync <span className="text-slate-700 ml-2">{lastUpdated || '—'}</span>
                        </div>
                    </div>
                )}

                <div className="flex w-full md:w-auto items-center gap-2">
                    <button
                        onClick={() => setShowMaterials(true)}
                        className="w-full md:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-[10px] uppercase tracking-[0.15em] text-slate-600 hover:bg-white hover:border-blue-400 transition-all"
                    >
                        Materials
                    </button>
                    <button
                        onClick={load}
                        className="w-full md:w-auto px-5 py-3 bg-slate-900 text-white rounded-md font-bold text-[10px] uppercase tracking-[0.15em] hover:bg-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[760px] flex flex-col">
                <div className="flex-1 overflow-x-auto">
                    {isLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center opacity-40">
                            <Loader2 size={48} className="mb-4 text-slate-300 animate-spin" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading data</p>
                        </div>
                    ) : view === 'summary' ? (
                        <div className="p-6 md:p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {summaryBars.map((card) => (
                                    <div key={card.id} className="bg-white border border-slate-200 rounded-xl p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                                                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{card.currentDisplay}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${card.current >= card.previous ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                                {card.delta}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs font-semibold text-slate-500">{card.note}</p>
                                        <div className="mt-5 space-y-3">
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    <span>{selectedMonthLabel}</span>
                                                    <span>{card.currentDisplay}</span>
                                                </div>
                                                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-slate-900" style={{ width: card.currentWidth }} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    <span>{monthShort(-1)}</span>
                                                    <span>{card.previousDisplay}</span>
                                                </div>
                                                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-slate-300" style={{ width: card.previousWidth }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Yearly Production vs Dispatch</p>
                                    </div>
                                    <div className="p-6 h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats?.monthlyOverview ?? []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="production" name="Production" fill="#2563eb" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey="dispatched" name="Dispatched" fill="#0f172a" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Yearly Expense Split</p>
                                    </div>
                                    <div className="p-6 h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={stats?.monthlyOverview ?? []}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                <Tooltip formatter={(value: number) => fmtINR(value)} />
                                                <Legend />
                                                <Line type="monotone" dataKey="purchases" name="Purchase Part" stroke="#7c3aed" strokeWidth={3} dot={false} />
                                                <Line type="monotone" dataKey="expenses" name="Total Expense" stroke="#ea580c" strokeWidth={3} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedMonthLabel} Assembly Mix</p>
                                    </div>
                                    <div className="p-6 h-[320px]">
                                        {stats?.selectedMonthModelMix?.length ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={stats.selectedMonthModelMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={4}>
                                                        {stats.selectedMonthModelMix.map((entry, index) => (
                                                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm font-bold uppercase tracking-wide text-slate-400">No assembled batteries in this month</div>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedMonthLabel} Stage Mix</p>
                                    </div>
                                    <div className="p-6 h-[320px]">
                                        {stats?.selectedMonthStageMix?.length ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={stats.selectedMonthStageMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={4}>
                                                        {stats.selectedMonthStageMix.map((entry, index) => (
                                                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm font-bold uppercase tracking-wide text-slate-400">No production saved in this month</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top Battery Models In {selectedMonthLabel}</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {topModels.length > 0 ? topModels.map((row) => (
                                            <div key={row.model} className="space-y-2">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-sm font-bold text-slate-900">{row.model || 'Unknown Model'}</span>
                                                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">{row.units.toLocaleString('en-IN')} units</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-blue-500" style={{ width: row.width }} />
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-10 text-center text-sm font-bold uppercase tracking-wide text-slate-400">No production saved this month</div>
                                        )}
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Expense Breakdown In {selectedMonthLabel}</p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {expenseBreakdown.length > 0 ? expenseBreakdown.map((row) => (
                                            <div key={row.category} className="space-y-2">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-sm font-bold text-slate-900">{row.category || 'Uncategorized'}</span>
                                                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">{fmtINR(row.total)}</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                    <div className="h-full rounded-full bg-slate-700" style={{ width: row.width }} />
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-10 text-center text-sm font-bold uppercase tracking-wide text-slate-400">No expense data in this month</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                            <th className="px-6 py-4 whitespace-nowrap pl-8">Factory Snapshot</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-right">{selectedMonthLabel}</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-right">{previousMonthName}</th>
                                            <th className="px-6 py-4 whitespace-nowrap text-right pr-8">Change</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {summaryCards.map((row) => (
                                            <tr key={row.id} className="group/row hover:bg-slate-50 transition-all">
                                                <td className="px-6 py-4 pl-8 text-sm font-bold text-slate-900">{row.label}</td>
                                                <td className="px-6 py-4 text-right text-sm font-black text-slate-900">{row.currentDisplay}</td>
                                                <td className="px-6 py-4 text-right text-sm font-black text-slate-500">{row.previousDisplay}</td>
                                                <td className={`px-6 py-4 pr-8 text-right text-xs font-black uppercase tracking-wide ${row.current >= row.previous ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {deltaLabel(row.current, row.previous)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="group/row hover:bg-slate-50 transition-all">
                                            <td className="px-6 py-4 pl-8 text-sm font-bold text-slate-900">Low Stock Items</td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-slate-900">{lowStock.length.toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-right text-sm font-black text-slate-500">-</td>
                                            <td className="px-6 py-4 pr-8 text-right text-xs font-black uppercase tracking-wide text-slate-400">Live</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : view === 'production' ? (
                        <div className="p-6 md:p-8 space-y-8">
                            {productionFocus === 'overview' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {productionCards.map((card) => (
                                    <button
                                        key={card.id}
                                        type="button"
                                        onClick={() => {
                                            if (card.id === 'assembled_batteries') {
                                                setProductionFocus('assembled');
                                            }
                                        }}
                                        className={`bg-white border border-slate-200 rounded-xl p-5 text-left ${card.id === 'assembled_batteries' ? 'hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.title}</p>
                                                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                                                    {card.quantity.toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${card.tint}`}>
                                                Live
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs font-semibold text-slate-500">{card.quantityLabel}</p>
                                        {!card.hideCost && (
                                            <div className="mt-5 pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    <span>{card.costLabel}</span>
                                                    <span className="text-slate-900">{fmtINR(card.cost)}</span>
                                                </div>
                                            </div>
                                        )}
                                        {card.id === 'assembled_batteries' && (
                                            <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-600">
                                                Open Battery List + Price Calculator
                                            </div>
                                        )}
                                    </button>
                                ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Batteries Assembled</p>
                                                <p className="mt-1 text-sm font-bold text-slate-900">Model, quantity and logged average battery cost</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setProductionFocus('overview')}
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-md hover:border-blue-400 transition-all text-[10px] font-black uppercase tracking-widest text-slate-600"
                                            >
                                                Back
                                            </button>
                                        </div>
                                        {assemblyRows.length > 0 ? (
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                        <th className="px-6 py-4 whitespace-nowrap pl-8">Battery Model</th>
                                                        <th className="px-6 py-4 whitespace-nowrap text-right">Quantity</th>
                                                        <th className="px-6 py-4 whitespace-nowrap text-right pr-8">Avg Price Per Battery</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {assemblyRows.map((row) => (
                                                        <tr key={row.model} className="group/row hover:bg-slate-50 transition-all">
                                                            <td className="px-6 py-4 pl-8 text-sm font-bold text-slate-900">{row.model}</td>
                                                            <td className="px-6 py-4 text-right text-sm font-black text-slate-900">{row.units.toLocaleString('en-IN')}</td>
                                                            <td className="px-6 py-4 pr-8 text-right text-sm font-black text-slate-900">{fmtINR(row.avg_price)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="py-24 flex flex-col items-center justify-center opacity-40">
                                                <Boxes size={48} className="text-slate-300 mb-4" />
                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">No batteries assembled yet</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Calculated Battery Price</p>
                                                <p className="mt-1 text-sm font-bold text-slate-900">Choose a battery model below to calculate live average price</p>
                                            </div>
                                            <div className="w-full md:w-auto">
                                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Choose Battery Model</label>
                                                <div className="relative">
                                                <select
                                                    value={selectedAssemblyModel}
                                                    onChange={(e) => setSelectedAssemblyModel(e.target.value)}
                                                    className="w-full md:min-w-[220px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                                >
                                                    {availableCalculatorModels.map((modelName) => (
                                                        <option key={modelName} value={modelName}>{modelName}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {selectedAssemblyModelData ? (
                                            <div className="p-6 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="border border-slate-200 rounded-xl p-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Battery Model</p>
                                                        <p className="mt-2 text-2xl font-black text-slate-900">{selectedAssemblyModelData.model}</p>
                                                    </div>
                                                    <div className="border border-slate-200 rounded-xl p-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calculated Avg Price</p>
                                                        <p className="mt-2 text-2xl font-black text-slate-900">{fmtINR(selectedAssemblyPrice)}</p>
                                                    </div>
                                                    <div className="border border-slate-200 rounded-xl p-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overhead Per Battery</p>
                                                        <p className="mt-2 text-2xl font-black text-slate-900">{fmtINR(assemblyOverheadPerBattery)}</p>
                                                    </div>
                                                </div>

                                                <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                                            <th className="px-6 py-4 pl-8">Item</th>
                                                            <th className="px-6 py-4 text-right">Qty</th>
                                                            <th className="px-6 py-4 text-right">Avg Rate</th>
                                                            <th className="px-6 py-4 text-right pr-8">Cost Per Battery</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {selectedAssemblyCostRows.map((row) => (
                                                            <tr key={row.label} className="group/row hover:bg-slate-50 transition-all">
                                                                <td className="px-6 py-4 pl-8 text-sm font-bold text-slate-900">{row.label}</td>
                                                                <td className="px-6 py-4 text-right text-sm font-black text-slate-900">{row.qty.toLocaleString('en-IN')}</td>
                                                                <td className="px-6 py-4 text-right text-sm font-black text-slate-500">{fmtINR(row.unitPrice)}</td>
                                                                <td className="px-6 py-4 pr-8 text-right text-sm font-black text-slate-900">{fmtINR(row.total)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                <div className="border border-slate-200 rounded-xl p-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">This Month Operating Expense Categories</p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {selectedExpenseCategories.length > 0 ? selectedExpenseCategories.map((row) => (
                                                            <span key={row.category} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wide border border-slate-200">
                                                                {row.category}: {fmtINR(row.total)}
                                                            </span>
                                                        )) : (
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">No salary, electricity or other expense entries in this month</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : availableCalculatorModels.length === 0 ? (
                                            <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-slate-400">No system battery models available for calculator</div>
                                        ) : (
                                            <div className="py-16 text-center text-sm font-bold uppercase tracking-wide text-slate-400">Select an assembled battery model</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : visibleStock.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                    <th className="px-6 py-4 whitespace-nowrap pl-8">Material</th>
                                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 whitespace-nowrap text-right">In Stock</th>
                                    <th className="px-6 py-4 whitespace-nowrap text-right">Consumed</th>
                                    <th className="px-6 py-4 whitespace-nowrap text-right pr-8">Average Buy Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleStock.map((item) => (
                                    <tr key={item.id} className="group/row hover:bg-slate-50 transition-all">
                                        <td className="px-6 py-4 pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{item.name}</span>
                                                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Unit {item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.is_low ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                                                {item.is_low ? 'Low' : 'OK'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right text-sm font-black ${item.is_low ? 'text-rose-600' : 'text-slate-900'}`}>{fmtQty(item.current_stock)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-black text-slate-900">{fmtQty(item.consumed)}</td>
                                        <td className="px-6 py-4 pr-8 text-right text-sm font-black text-slate-900">
                                            {item.avg_cost > 0 ? `₹${item.avg_cost.toFixed(2)} / ${item.unit}` : 'No purchase history'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center opacity-40">
                            <Boxes size={48} className="text-slate-300 mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">No records found</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Showing {activeRowsCount === 0 ? '0-0' : `1-${activeRowsCount}`} of {activeRowsCount} Records</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (view === 'stock') {
                                    setShowMaterials(true);
                                    return;
                                }
                                setView('stock');
                            }}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-md hover:border-blue-400 transition-all text-slate-600"
                        >
                            {view === 'stock' ? 'EDIT' : 'OPEN STOCK'}
                        </button>
                    </div>
                </div>
            </div>

            {showMaterials && (
                <RawMaterials onClose={() => { setShowMaterials(false); load(); }} />
            )}
        </div>
    );
}
