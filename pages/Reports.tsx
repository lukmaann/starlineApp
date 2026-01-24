
import React, { useMemo, useState, useEffect } from 'react';
import { Database } from '../db';
import { BatteryStatus, Sale, Replacement, Dealer, Battery } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import {
  FileText, TrendingUp, AlertTriangle, RefreshCw, Download,
  Users, Package, History, ShieldCheck, IndianRupee,
  Trophy, ArrowUpRight, Percent, Building2, MapPin
} from 'lucide-react';

const formatINR = (value: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};

const Reports: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);

  const loadData = async () => {
    // SCALABILITY FIX: Use server-side aggregated analytics
    const data = await Database.getAnalytics();
    setAnalytics(data);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    return () => window.removeEventListener('db-synced', loadData);
  }, []);

  if (!analytics) return <div className="p-10 text-center uppercase font-black text-slate-400">Loading Network Intelligence...</div>;

  const { networkStats, dealerStats, expiringSoon } = analytics;

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-8 rounded-none border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-5">
          <div className="bg-slate-900 p-4 rounded-none text-white shadow-xl shadow-slate-200">
            <FileText size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Analytical Hub</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Cross-territory network intelligence</p>
          </div>
        </div>
        <button onClick={() => window.electronAPI ? window.electronAPI.printOrPdf() : window.print()} className="flex items-center space-x-3 px-8 py-4 bg-blue-600 text-white rounded-none font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20">
          <Download size={18} />
          <span>GENERATE NETWORK AUDIT</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Geographic Heatmap Simulation */}
        <div className="bg-white p-10 rounded-none border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-200"><MapPin size={180} /></div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center relative z-10">
            <MapPin size={16} className="mr-2 text-blue-500" /> Territory Market Penetration
          </h3>
          <div className="h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" hide />
                <YAxis type="number" dataKey="y" hide />
                <ZAxis type="number" dataKey="sales" range={[100, 1500]} name="units" unit=" units" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'black' }} />
                <Scatter name="Dealers" data={dealerStats}>
                  {dealerStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.7} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiration Forecast */}
        <div className="bg-white p-10 rounded-none border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center">
            <AlertTriangle size={16} className="mr-2 text-amber-500" /> 90-Day Coverage Forecast
          </h3>
          <div className="space-y-4">
            {expiringSoon.slice(0, 5).map((s: Sale) => (
              <div key={s.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-none border border-slate-100 hover:border-amber-200 transition-all group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-none border border-slate-200 text-slate-300 group-hover:text-amber-500 transition-colors">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{s.batteryId}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{s.customerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Expires</p>
                  <p className="text-xs font-black text-slate-600 font-mono">{new Date(s.warrantyExpiry).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50">
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Network Leaderboard</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized dealer performance metrics</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-t border-slate-200">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
                <th className="px-10 py-5">Rank & Partner</th>
                <th className="px-10 py-5">Units Sold</th>
                <th className="px-10 py-5">Gross Volume</th>
                <th className="px-10 py-5 text-right">Market Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dealerStats.map((stat, index) => (
                <tr key={stat.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-5">
                      <div className={`w-8 h-8 rounded-none flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-sm shadow-amber-200/50' : 'bg-slate-100 text-slate-400'}`}>
                        {index === 0 ? <Trophy size={14} /> : index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{stat.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-sm font-black text-slate-700">{stat.sales} Units</span>
                  </td>
                  <td className="px-10 py-6">
                    <span className="text-sm font-black text-emerald-600">{formatINR(stat.revenue)}</span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end space-x-3">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-none overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-none transition-all duration-1000" style={{ width: `${stat.marketShare}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-500">{stat.marketShare.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
