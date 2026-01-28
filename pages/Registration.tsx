
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Database } from '../db';
import { BatteryStatus, Battery, Dealer, WarrantyCardStatus } from '../types';
import { UserPlus, Search, Calendar, Phone, User, Store, ShieldCheck, Zap, Activity, ChevronRight, Copy, Smartphone, X } from 'lucide-react';
import { formatDate } from '../utils';

const Registration: React.FC = () => {
  const [db, setDb] = useState<{ batteries: Battery[], dealers: Dealer[] }>({ batteries: [], dealers: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [serialSearch, setSerialSearch] = useState('');
  const [showSerials, setShowSerials] = useState(false);
  const [confirmationData, setConfirmationData] = useState<null | typeof form>(null);
  const serialRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    batteryId: '',
    customerName: '',
    customerPhone: '',
    dealerId: '',
    date: new Date().toISOString().split('T')[0]
  });

  const load = async () => {
    const batts = await Database.getAll<Battery>('batteries');
    const deals = await Database.getAll<Dealer>('dealers');
    setDb({ batteries: batts, dealers: deals });
  };

  useEffect(() => {
    load();
    // Force reset form to required defaults on mount (fixes HMR state retention)
    setForm(prev => ({
      ...prev,
      customerName: '',
      date: new Date().toISOString().split('T')[0]
    }));

    const handleClickOutside = (event: MouseEvent) => {
      if (serialRef.current && !serialRef.current.contains(event.target as Node)) setShowSerials(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const freshStock = useMemo(() => db.batteries.filter(b => b.status === BatteryStatus.MANUFACTURED), [db.batteries]);
  const filteredSerials = useMemo(() => serialSearch ? freshStock.filter(b => b.id.includes(serialSearch.toUpperCase())).slice(0, 5) : [], [freshStock, serialSearch]);

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const battery = db.batteries.find(b => b.id === form.batteryId);
    if (!battery) return;
    setConfirmationData(form);
  };

  const handleFinalConfirm = async () => {
    if (!confirmationData) return;
    const battery = db.batteries.find(b => b.id === confirmationData.batteryId);
    if (!battery) return;

    setIsProcessing(true);
    const startDate = new Date(confirmationData.date);
    const expiry = new Date(startDate);
    expiry.setMonth(expiry.getMonth() + battery.warrantyMonths);

    await Database.activateWarranty(
      confirmationData.batteryId,
      confirmationData.customerName || 'DEALER STOCK',
      confirmationData.customerPhone || '0000000000',
      confirmationData.dealerId,
      confirmationData.date,
      expiry.toISOString().split('T')[0],
      'RECEIVED'
    );

    setIsProcessing(false);
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'WARRANTY ACTIVATED SUCCESSFULLY' } }));
    setForm({ batteryId: '', customerName: '', customerPhone: '', dealerId: '', date: new Date().toISOString().split('T')[0] });
    setConfirmationData(null);
    setSerialSearch('');
    load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 uppercase pb-20 relative">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
            <UserPlus size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">WARRANTY ACTIVATION</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">PROVISIONING CUSTOMER COVERAGE <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[9px]">v2.1</span></p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePreSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
            <div className="relative" ref={serialRef}>
              <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] ml-2">ASSET SERIAL IDENTITY</label>
              <div className="relative mt-3">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input
                  required
                  placeholder="SCAN OR TYPE SERIAL NUMBER..."
                  className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-transparent rounded-[2rem] outline-none font-black text-lg focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-200"
                  value={serialSearch}
                  onFocus={() => setShowSerials(true)}
                  onChange={e => { setSerialSearch(e.target.value); setShowSerials(true); }}
                />
              </div>
              {showSerials && filteredSerials.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-3 bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-top-4">
                  {filteredSerials.map(b => (
                    <button key={b.id} type="button" onClick={() => { setForm({ ...form, batteryId: b.id }); setSerialSearch(b.id); setShowSerials(false); }} className="w-full px-8 py-6 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group">
                      <div>
                        <p className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{b.id}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{b.model} | {b.capacity}</p>
                      </div>
                      <ChevronRight className="text-slate-200 group-hover:text-emerald-600" size={20} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] ml-2">CUSTOMER NAME</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="OPTIONAL"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] outline-none font-bold text-sm focus:bg-white focus:border-emerald-500/20 transition-all"
                    value={form.customerName}
                    onChange={e => setForm({ ...form, customerName: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] ml-2">PRIMARY CONTACT NO</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    placeholder="+91 MOBILE"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] outline-none font-bold text-sm focus:bg-white focus:border-emerald-500/20 transition-all"
                    value={form.customerPhone}
                    onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] ml-2">ISSUING PARTNER</label>
                <div className="relative">
                  <Store className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select
                    required
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] outline-none font-bold text-sm focus:bg-white focus:border-emerald-500/20 transition-all appearance-none"
                    value={form.dealerId}
                    onChange={e => setForm({ ...form, dealerId: e.target.value })}
                  >
                    <option value="">SELECT CHANNEL PARTNER</option>
                    {db.dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] ml-2">ACTIVATION DATE</label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="date"
                    // Ensuring it defaults to today is handled in state init, but we can also restrict it if needed
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] outline-none font-bold text-sm focus:bg-white focus:border-emerald-500/20 transition-all"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0f172a] p-10 rounded-[3rem] text-white shadow-2xl space-y-10 sticky top-8 border border-white/5 overflow-hidden">
            <div className="absolute -top-20 -right-20 opacity-5 rotate-12 pointer-events-none">
              <ShieldCheck size={300} />
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center space-x-4 border-b border-white/10 pb-6">
                <div className="p-3 bg-emerald-500 rounded-2xl"><Zap size={24} /></div>
                <div>
                  <p className="text-[11px] font-black text-slate-500 tracking-[0.4em]">REGISTRY PAYLOAD</p>
                  <p className="text-[9px] font-bold text-emerald-400 mt-1">STATUS: PENDING ACTIVATION</p>
                </div>
              </div>

              <button
                disabled={!form.batteryId}
                type="submit"
                className="w-full py-7 bg-emerald-600 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/40 hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center space-x-4"
              >
                <ShieldCheck size={24} />
                <span>PROCEED</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      {confirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 relative text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20"><ShieldCheck size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">CONFIRM ACTIVATION</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10">Please verify details before committing to blockchain</p>

            <div className="space-y-6 text-left mb-10">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400">SERIAL ID</span>
                  <span className="text-sm font-black text-slate-900">{confirmationData.batteryId}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400">CUSTOMER</span>
                  <span className="text-sm font-black text-slate-900">{confirmationData.customerName || 'N/A'}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400">DATE</span>
                  <span className="text-sm font-black text-emerald-600">{formatDate(confirmationData.date)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setConfirmationData(null)} className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
              <button
                onClick={handleFinalConfirm}
                disabled={isProcessing}
                className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-3"
              >
                {isProcessing ? <Activity className="animate-spin" size={18} /> : <Zap size={18} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registration;
