
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    TrendingUp, Package, AlertCircle,
    BarChart3, Activity, Users,
    Trophy, Medal, Globe, ChevronDown, ListFilter,
    ArrowUpRight, ArrowDownRight, LayoutGrid, List,
    Search, RefreshCw, Scale, History, Layers,
    Lock, KeyRound, Loader2, Check, type LucideIcon
} from 'lucide-react';
import { Database } from '../db';
import { Dealer } from '../types';
import { AuthSession } from '../utils/AuthSession';
import DealerAnalytics from './DealerAnalytics';

const GlobalAnalytics: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'METRICS' | 'LEADERBOARD'>('METRICS');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocked, setIsLocked] = useState(!AuthSession.isValid());
    const [lockPassword, setLockPassword] = useState('');
    const [lockError, setLockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
    const viewMenuRef = useRef<HTMLDivElement | null>(null);

    // Filters
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
    const [selectedLocation, setSelectedLocation] = useState<string>('All');
    const [locations, setLocations] = useState<string[]>([]);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const loadData = async () => {
        setLoading(true);
        const startTime = Date.now();
        try {
            const [global, leaders, locs] = await Promise.all([
                Database.getGlobalAnalytics(selectedYear, selectedMonth, selectedLocation),
                Database.getDealerLeaderboard(selectedYear, selectedMonth, selectedLocation),
                Database.getAvailableLocations()
            ]);
            setData(global);
            setLeaderboard(leaders);
            setLocations(locs);

            // If the currently selected year has no data, but availableYears exist, default to the latest
            if (global?.availableYears?.length > 0 && !global.availableYears.includes(selectedYear)) {
                setSelectedYear(global.availableYears[0]);
            }
        } catch (error) {
            console.error('Failed to load global analytics:', error);
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 2000 - elapsed);
            if (remaining > 0) {
                await new Promise((resolve) => setTimeout(resolve, remaining));
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleSessionChange = (e: any) => {
            setIsLocked(!e.detail.isAuthenticated);
        };
        window.addEventListener('session-changed' as any, handleSessionChange);
        return () => window.removeEventListener('session-changed' as any, handleSessionChange);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!viewMenuRef.current?.contains(event.target as Node)) {
                setIsViewMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isLocked) {
            loadData();
        }
    }, [selectedYear, selectedMonth, selectedLocation, isLocked]);

    const handleLocalUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUnlocking(true);
        setLockError('');

        try {
            const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';
            if (lockPassword === adminPass) {
                AuthSession.refreshSession();
                setIsLocked(false);
                setLockPassword('');
            } else {
                setLockError('Incorrect Access Key');
                setLockPassword('');
            }
        } catch (err) {
            console.error('Verification Failed:', err);
        } finally {
            setIsUnlocking(false);
        }
    };

    const chartData = useMemo(() => {
        if (!data?.salesTrend) return [];
        return Array.from({ length: 12 }, (_, i) => {
            const monthNum = (i + 1).toString().padStart(2, '0');
            const sale = data.salesTrend.find((s: any) => s.name === monthNum);
            const claim = data.claimsTrend?.find((c: any) => c.name === monthNum);
            return {
                name: months[i].substring(0, 3),
                sales: sale ? sale.sales : 0,
                exchanges: claim ? claim.claims : 0
            };
        });
    }, [data, selectedYear]);

    const filteredLeaderboard = useMemo(() => {
        return leaderboard.filter(d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [leaderboard, searchQuery]);

    const viewOptions: Array<{ id: 'METRICS' | 'LEADERBOARD'; label: string; icon: LucideIcon; iconClass: string; }> = [
        { id: 'METRICS', label: 'Metrics Registry', icon: History, iconClass: 'text-blue-600' },
        { id: 'LEADERBOARD', label: 'Leaderboard Snapshot', icon: Layers, iconClass: 'text-violet-600' },
    ];

    const activeView = viewOptions.find((option) => option.id === activeTab) ?? viewOptions[0];
    const ActiveViewIcon = activeView.icon;

    if (isLocked) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-slate-50/50">
                <div className="w-full max-w-sm text-center">
                    <div className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                        <Lock size={32} className="text-slate-900" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Registry Locked</h2>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">Authorization Required</p>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-left mb-6">
                        <p className="text-blue-700 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                            Security Clearance Required. Please enter the administrator access key to proceed with enterprise analytics.
                        </p>
                    </div>

                    <form onSubmit={handleLocalUnlock} className="space-y-4">
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="password"
                                autoFocus
                                placeholder="Access Key"
                                className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-300
                                    ${lockError
                                        ? 'border-rose-300 bg-rose-50 text-rose-600 focus:border-rose-500 shadow-sm shadow-rose-100'
                                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                                    }`}
                                value={lockPassword}
                                onChange={e => { setLockPassword(e.target.value); setLockError(''); }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isUnlocking || !lockPassword}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isUnlocking ? <Loader2 size={16} className="animate-spin text-white/50" /> : 'Authorize Access'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (selectedDealer) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-400">
                <DealerAnalytics
                    dealer={selectedDealer}
                    onBack={() => setSelectedDealer(null)}
                />
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="max-w-[1600px] mx-auto pb-20">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                            <BarChart3 size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">Analytics Registry</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Loading enterprise metrics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
                        <Loader2 size={16} className="animate-spin text-slate-700" />
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Syncing</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                            <div className="mt-5 h-8 w-20 bg-slate-100 rounded animate-pulse" />
                            <div className="mt-4 h-2 w-full bg-slate-100 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[320px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-[3px] border-slate-200 border-t-slate-900 animate-spin" />
                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Preparing Dashboard</p>
                            <p className="mt-1 text-sm font-semibold text-slate-600">Loading analytics without interrupting the page</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900 relative">
            {/* Header - Matching Dashboard View Style */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
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
                                    const isActive = option.id === activeTab;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveTab(option.id);
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

                <div className="flex-1 w-full flex items-center justify-between">
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">
                        Sales Analytics Trace <span className="text-slate-700 ml-2">{loading ? 'Synchronizing' : 'Operational'}</span>
                    </div>
                </div>

                <div className="flex w-full md:w-auto items-center gap-2">
                    <button
                        onClick={loadData}
                        className="w-full md:w-auto px-5 py-3 bg-slate-900 text-white rounded-md font-bold text-[10px] uppercase tracking-[0.15em] hover:bg-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar - Matching Dashboard Selector Style */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center gap-3">
                <div className="flex-1 w-full relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                    <input
                        placeholder={`Filter by Dealer or Location...`}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-bold text-sm transition-all uppercase tracking-wide text-slate-900 focus:bg-white focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-col md:flex-row items-center gap-2.5 w-full md:w-auto">
                    <div className="w-full md:w-auto relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full px-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer text-slate-900 tracking-wide"
                        >
                            {data?.availableYears?.map((y: number) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="w-full md:w-auto relative">
                        <select
                            value={selectedMonth || ''}
                            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer text-slate-900 tracking-wide"
                        >
                            <option value="">Full Year Summary</option>
                            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="w-full md:w-auto relative">
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full px-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer text-slate-900 tracking-wide"
                        >
                            <option value="All">All Locations</option>
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {activeTab === 'METRICS' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                    {/* KPI Cards - Reconciled with Dealers.tsx style */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Revenue', value: `₹${(data?.kpis?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
                            { label: 'Units Sold', value: (data?.kpis?.totalSales || 0).toLocaleString(), icon: Package, color: 'emerald' },
                            { label: 'Exchanges', value: data?.kpis?.totalClaims || 0, icon: AlertCircle, color: 'rose' },
                            { label: 'Active Dealers', value: data?.kpis?.totalDealers || 0, icon: Users, color: 'blue' }
                        ].map((kpi, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">{kpi.label}</span>
                                    <div className={`p-1.5 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-600`}>
                                        <kpi.icon size={14} />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{kpi.value}</h3>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-2 focus:text-slate-600">Aggregate Metrics</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Global Sales Trend */}
                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
                            {loading && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center"><Activity className="text-slate-900 animate-spin" size={24} /></div>}
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth Velocity Hub</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sales</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Exchanges</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5">
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 700 }}
                                            itemStyle={{ textTransform: 'uppercase' }}
                                        />
                                        <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        <Area type="monotone" dataKey="exchanges" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorClaims)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Models & Locations */}
                        <div className="space-y-6">
                            {/* Top Models */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model Throughput Mix</h3>
                                </div>
                                <div className="p-5 space-y-3">
                                    {data?.modelDistribution?.slice(0, 5).map((model: any, i: number) => {
                                        const modelColors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide">
                                                    <span className="text-slate-600 font-mono">{model.name}</span>
                                                    <span className="text-slate-900 font-bold">{model.value} UNITS</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${modelColors[i] || 'bg-slate-900'} rounded-full transition-all duration-1000`}
                                                        style={{ width: `${(model.value / (data.kpis.totalSales || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!data?.modelDistribution || data.modelDistribution.length === 0) && (
                                        <div className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Model Data</div>
                                    )}
                                </div>
                            </div>

                            {/* Top Locations */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Market Heatmap Territory</h3>
                                </div>
                                <div className="p-5 space-y-3">
                                    {data?.locationDistribution?.slice(0, 5).map((loc: any, i: number) => {
                                        const locColors = ['bg-slate-900', 'bg-blue-700', 'bg-blue-600', 'bg-blue-500', 'bg-blue-400'];
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide">
                                                    <span className="text-slate-600 font-mono">{loc.name}</span>
                                                    <span className="text-slate-900 font-bold">{loc.value} UNITS</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${locColors[i] || 'bg-slate-900'} rounded-full transition-all duration-1000`}
                                                        style={{ width: `${(loc.value / (data.kpis.totalSales || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!data?.locationDistribution || data.locationDistribution.length === 0) && (
                                        <div className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Location Data</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-400">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-[0.12em]">
                                    <th className="px-5 py-3 pl-8">Rank</th>
                                    <th className="px-5 py-3">Dealer Unit / Network</th>
                                    <th className="px-5 py-3 text-center">Sales Volume</th>
                                    <th className="px-5 py-3 text-center">Exchange Units</th>
                                    <th className="px-5 py-3 text-right pr-8">Performance Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeaderboard.map((dealer, i) => (
                                    <tr
                                        key={dealer.id}
                                        onClick={() => {
                                            setSelectedDealer(dealer);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="group hover:bg-slate-50 transition-all duration-200 cursor-pointer border-b border-slate-50 last:border-0"
                                    >
                                        <td className="px-6 py-5 pl-8">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black font-mono shadow-sm
                                                    ${i === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                        i === 1 ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                                            i === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                                'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                                                    {i + 1}
                                                </div>
                                                {i === 0 ? <Trophy className="text-amber-400" size={14} /> :
                                                    i === 1 ? <Medal className="text-slate-300" size={14} /> :
                                                        i === 2 ? <Medal className="text-orange-300" size={14} /> : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-none">{dealer.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{dealer.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs font-bold font-mono text-slate-900 px-2 py-1 bg-slate-100 rounded">
                                                {dealer.totalSales}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-[10px] font-bold uppercase tracking-tight ${dealer.totalExchanges > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {dealer.totalExchanges} Units
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <div className="flex items-center justify-end gap-4">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xl font-black text-slate-900 leading-none">{dealer.score}</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Efficiency Rating</span>
                                                </div>
                                                <div className="w-2 h-10 bg-slate-100 rounded-full overflow-hidden flex flex-col justify-end">
                                                    <div className={`w-full transition-all duration-700 ease-out rounded-full
                                                        ${dealer.score > 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' :
                                                            dealer.score > 50 ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' :
                                                                'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}
                                                        style={{ height: `${dealer.score}%` }}>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLeaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center bg-slate-50/50">
                                            <p className="font-bold text-[10px] tracking-widest text-slate-400 uppercase">No Data Found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalAnalytics;
