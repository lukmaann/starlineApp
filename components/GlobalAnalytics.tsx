
import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    TrendingUp, Package, AlertCircle,
    BarChart3, Activity, Users,
    Trophy, Medal, Globe, ChevronDown, ListFilter,
    ArrowUpRight, ArrowDownRight, LayoutGrid, List,
    Search, RefreshCw, Scale, History, Layers,
    Lock, KeyRound, Loader2
} from 'lucide-react';
import { Database } from '../db';
import { Dealer } from '../types';
import { AuthSession } from '../utils/AuthSession';
import { AnalyticsLoader } from './AnalyticsLoader';
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

    // Filters
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
    const [selectedLocation, setSelectedLocation] = useState<string>('All');
    const [locations, setLocations] = useState<string[]>([]);
    const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
    const [isSyncing, setIsSyncing] = useState(true);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            const [global, leaders, locs] = await Promise.all([
                Database.getGlobalAnalytics(selectedYear, selectedMonth, selectedLocation),
                Database.getDealerLeaderboard(selectedYear, selectedMonth, selectedLocation),
                Database.getAvailableLocations()
            ]);
            setData(global);
            setLeaderboard(leaders);
            setLocations(locs);
        } catch (error) {
            console.error('Failed to load global analytics:', error);
        } finally {
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
                AuthSession.saveSession();
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

    if (isSyncing) {
        return (
            <AnalyticsLoader
                title="Global Performance Registry"
                subtitle="Syncing Enterprise Data"
                duration={6000}
                onComplete={() => setIsSyncing(false)}
            />
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
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-[3px] border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900 relative">
            {/* Header - Matching Dealers.tsx Style */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">Analytics Registry</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Global Performance Ledger</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab('METRICS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'METRICS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <History size={14} />
                            Metrics
                        </button>
                        <button
                            onClick={() => setActiveTab('LEADERBOARD')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'LEADERBOARD' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Layers size={14} />
                            Leaderboard
                        </button>
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <button
                        onClick={loadData}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm active:scale-95"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Bar - Simulating Search bar in Settlements */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-slate-900 transition-colors" size={18} />
                    <input
                        placeholder={`Filter by Dealer or Location...`}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-sm transition-all uppercase tracking-wide mono text-slate-900 focus:bg-white focus:border-slate-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 h-12">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-transparent text-[10px] font-black uppercase outline-none px-3 cursor-pointer"
                    >
                        {data?.availableYears?.map((y: number) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <select
                        value={selectedMonth || ''}
                        onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-transparent text-[10px] font-black uppercase outline-none px-3 cursor-pointer"
                    >
                        <option value="">Full Year</option>
                        {months.map((m, i) => <option key={m} value={i + 1}>{m.substring(0, 3)}</option>)}
                    </select>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase outline-none px-3 cursor-pointer"
                    >
                        <option value="All">All Locations</option>
                        {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
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
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group hover:border-slate-300 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                                    <div className={`p-2 rounded-lg bg-${kpi.color}-50 text-${kpi.color}-600 group-hover:scale-110 transition-transform`}>
                                        <kpi.icon size={16} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{kpi.value}</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Aggregate</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Global Sales Trend */}
                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                            {loading && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center"><Activity className="text-slate-900 animate-spin" size={24} /></div>}
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Growth Velocity</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sales</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Exchanges</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.05} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.05} />
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
                                        <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        <Area type="monotone" dataKey="exchanges" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorClaims)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Models & Locations */}
                        <div className="space-y-6">
                            {/* Top Models */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden">
                                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Model Throughput</h3>
                                <div className="space-y-4">
                                    {data?.modelDistribution?.slice(0, 5).map((model: any, i: number) => {
                                        const modelColors = ['bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];
                                        return (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                                    <span className="text-slate-600 font-mono tracking-tighter">{model.name}</span>
                                                    <span className="text-slate-900 font-black">{model.value}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${modelColors[i] || 'bg-slate-900'} rounded-full transition-all duration-1000`}
                                                        style={{ width: `${(model.value / (data.kpis.totalSales || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!data?.modelDistribution || data.modelDistribution.length === 0) && (
                                        <div className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Data</div>
                                    )}
                                </div>
                            </div>

                            {/* Top Locations */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden">
                                <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Market Heatmap</h3>
                                <div className="space-y-4">
                                    {data?.locationDistribution?.slice(0, 5).map((loc: any, i: number) => {
                                        const locColors = ['bg-indigo-600', 'bg-blue-600', 'bg-cyan-600', 'bg-teal-600', 'bg-emerald-600'];
                                        return (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                                    <span className="text-slate-600 font-mono tracking-tighter">{loc.name}</span>
                                                    <span className="text-slate-900 font-black">{loc.value}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${locColors[i] || 'bg-slate-900'} rounded-full transition-all duration-1000`}
                                                        style={{ width: `${(loc.value / (data.kpis.totalSales || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!data?.locationDistribution || data.locationDistribution.length === 0) && (
                                        <div className="py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Data</div>
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
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                    <th className="px-6 py-4 pl-8">Rank</th>
                                    <th className="px-6 py-4">Dealer Unit</th>
                                    <th className="px-6 py-4 text-center">Volume (Sales)</th>
                                    <th className="px-6 py-4 text-center">History (Exchanges)</th>
                                    <th className="px-6 py-4 text-right pr-6">Intelligence Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeaderboard.map((dealer, i) => (
                                    <tr
                                        key={dealer.id}
                                        onClick={() => setSelectedDealer(dealer)}
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
                                        <td className="px-6 py-5 text-right pr-6">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-black text-slate-900 leading-none">{dealer.score}</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Efficiency Rating</span>
                                                </div>
                                                <div className="w-1.5 h-8 bg-slate-100 rounded-full overflow-hidden flex flex-col justify-end">
                                                    <div className={`w-full transition-all duration-700 ease-out rounded-full
                                                        ${dealer.score > 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                                                            dealer.score > 50 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' :
                                                                'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}
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
