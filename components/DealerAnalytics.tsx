import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, Package, AlertCircle,
    ChevronLeft, Download,
    BarChart3, PieChart as PieChartIcon, Activity, RefreshCw
} from 'lucide-react';
import { Database } from '../db';
import { Dealer } from '../types';
import { AnalyticsLoader } from './AnalyticsLoader';

interface DealerAnalyticsProps {
    dealer: Dealer;
    onBack: () => void;
}

const DealerAnalytics: React.FC<DealerAnalyticsProps> = ({ dealer, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [advancedData, setAdvancedData] = useState<any>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    useEffect(() => {
        loadAnalytics();
    }, [selectedYear, selectedMonth, dealer.id]);

    const loadAnalytics = async () => {
        try {
            const [detailed, advanced] = await Promise.all([
                Database.getDetailedDealerAnalytics(dealer.id, selectedYear, selectedMonth),
                Database.getAdvancedDealerAnalytics(dealer.id, selectedYear, selectedMonth)
            ]);
            setData(detailed);
            setAdvancedData(advanced);

            if (detailed?.availableYears?.length > 0 && !detailed.availableYears.includes(selectedYear)) {
                setSelectedYear(detailed.availableYears[0]);
            }
        } catch (error) {
            console.error('Failed to load dealer analytics:', error);
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
                claims: claim ? claim.claims : 0
            };
        });
    }, [data]);

    const benchmarkData = useMemo(() => [
        { name: 'This Dealer', value: Math.round(advancedData?.benchmark?.dealerRevenue || 0) },
        { name: 'Network Avg', value: Math.round(advancedData?.benchmark?.networkAvg || 0) }
    ], [advancedData]);

    const handleLoadingComplete = React.useCallback(() => {
        setLoading(false);
    }, []);

    // Unified Loader Logic: Confined to component workspace
    if (loading) {
        return (
            <AnalyticsLoader
                title="Intelligence Report"
                subtitle={dealer.name}
                duration={1500}
                onComplete={handleLoadingComplete}
            />
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20 animate-in fade-in duration-700 text-slate-900 relative">
            {/* Enterprise Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all text-slate-500 hover:text-slate-900 active:scale-95 shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">{dealer.name}</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dealer performance Registry • ID: {dealer.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 h-12">
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
                    </div>
                    <button className="px-5 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2">
                        <Download size={14} />
                        Export Audit
                    </button>
                </div>
            </div>

            {/* KPI Registry */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                {[
                    { label: 'Intelligence Rating', value: advancedData?.efficiencyScore || 0, sub: 'Efficiency %', icon: Activity, color: 'blue' },
                    { label: 'Active Revenue', value: `₹${(data?.kpis?.totalRevenue || 0).toLocaleString()}`, sub: 'Price Registry Based', icon: TrendingUp, color: 'emerald' },
                    { label: 'Warranty Claims', value: data?.kpis?.totalClaims || 0, sub: 'Ratio: ' + (data?.kpis?.claimRatio || 0) + '%', icon: AlertCircle, color: 'rose' },
                    { label: 'Stock Velocity', value: advancedData?.inventory?.turnoverRatio || "0.00", sub: 'Turnover Ratio', icon: RefreshCw, color: 'amber' }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group hover:border-slate-300 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                            <div className={`p-2 bg-${kpi.color}-50 text-${kpi.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>
                                <kpi.icon size={14} />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{kpi.value}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* Visual Trends Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Activity Trends</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Supply & Claim distribution</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sales</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Claims</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.05} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fill="url(#colorSales)" animationDuration={1000} />
                                <Area type="monotone" dataKey="claims" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fill="transparent" animationDuration={1000} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">Product Architecture</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Inventory model distribution</p>
                    <div className="flex-1 flex items-center justify-between">
                        <div className="w-[180px] h-[180px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.modelDistribution || []}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {(data?.modelDistribution || []).map((e: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-900 leading-none">{data?.kpis?.totalSales || 0}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Units</span>
                            </div>
                        </div>
                        <div className="flex-1 pl-8 space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                            {data?.modelDistribution?.slice(0, 6).map((e: any, i: number) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[100px] font-mono tracking-tight">{e.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-900 font-mono">{e.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Sales Audit Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Sales Registry Audit</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Detailed Transaction Logs</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Sales Value</p>
                            <p className="text-sm font-black text-emerald-600">₹{(data?.detailedSales?.reduce((acc: number, s: any) => acc + s.price, 0) || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[400px] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Serial No</th>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Model</th>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.detailedSales?.map((sale: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="p-3 text-[10px] font-black text-slate-900 font-mono tracking-tighter">{sale.id}</td>
                                        <td className="p-3 text-[10px] font-bold text-slate-600 uppercase">{sale.model}</td>
                                        <td className="p-3 text-[10px] font-bold text-slate-400">{sale.date}</td>
                                        <td className="p-3 text-[10px] font-black text-slate-900 text-right font-mono">₹{sale.price.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {(!data?.detailedSales || data.detailedSales.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Sales Recorded</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Exchange Audit Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Exchange Registry Audit</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Claims Value Impact</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exchange Value</p>
                            <p className="text-sm font-black text-rose-600">₹{(data?.detailedClaims?.reduce((acc: number, c: any) => acc + c.price, 0) || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto max-h-[400px] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Old Unit</th>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Model</th>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.detailedClaims?.map((claim: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                        <td className="p-3 text-[10px] font-black text-slate-900 font-mono tracking-tighter">{claim.id}</td>
                                        <td className="p-3 text-[10px] font-bold text-slate-600 uppercase">{claim.model}</td>
                                        <td className="p-3 text-[10px] font-bold text-slate-400">{claim.date}</td>
                                        <td className="p-3 text-[10px] font-black text-slate-900 text-right font-mono">₹{claim.price.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {(!data?.detailedClaims || data.detailedClaims.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Claims Recorded</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealerAnalytics;
