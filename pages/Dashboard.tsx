
import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import { BatteryStatus, Battery, Replacement } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Battery as BatteryIcon, Activity, RefreshCw, Zap, Users } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentClaims, setRecentClaims] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const allBatteries = await Database.getAll<Battery>('batteries');
      const allReplacements = await Database.getAll<Replacement>('replacements');
      
      const activeWarranties = allBatteries.filter(b => b.status === BatteryStatus.ACTIVE).length;
      const claimedUnits = allReplacements.length;
      const totalDealers = await Database.getCount('dealers');
      
      setStats([
        { label: 'Active', value: activeWarranties.toLocaleString(), icon: ShieldCheck, color: 'bg-emerald-600', text: 'Live' },
        { label: 'Exchanges', value: claimedUnits.toLocaleString(), icon: RefreshCw, color: 'bg-blue-600', text: 'Done' },
        { label: 'Dealers', value: totalDealers.toString(), icon: Users, color: 'bg-indigo-600', text: 'Partners' },
        { label: 'Status', value: 'SECURE', icon: Zap, color: 'bg-amber-500', text: 'Health' },
      ]);

      const statusCounts = allBatteries.reduce((acc: any, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {});

      setChartData(Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] })));
      setRecentClaims(allReplacements.slice(-5).reverse());
    };
    load();
  }, []);

  const COLORS = ['#2563eb', '#10b981', '#ef4444', '#f59e0b', '#64748b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 uppercase">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-5">
              <div className={`${stat.color} p-3.5 rounded-2xl text-white`}><stat.icon size={24} /></div>
              <span className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">{stat.text}</span>
            </div>
            <p className="text-slate-500 font-bold text-xs uppercase mb-1">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900 mb-10 uppercase tracking-tight">Stock Status</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value" stroke="none">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900 mb-8 uppercase tracking-tight">Recent Exchanges</h2>
          <div className="space-y-4">
            {recentClaims.map((claim: any, idx: number) => (
              <div key={idx} className="flex items-center p-5 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:bg-white transition-all">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-blue-600 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all"><RefreshCw size={18} /></div>
                <div className="flex-1 ml-5">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">{claim.oldBatteryId} &rarr; {claim.newBatteryId}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Issue: {claim.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase">{new Date(claim.replacementDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {recentClaims.length === 0 && (
              <div className="text-center py-24 opacity-30">
                <p className="text-xs font-black uppercase tracking-widest">No Exchanges Found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
