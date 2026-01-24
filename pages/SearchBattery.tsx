
import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import {
  Search, Battery as BatteryIcon,
  MapPin, Zap, ShieldAlert,
  Calendar, CheckCircle2, Activity, Store, History, Clock,
  User, ShieldCheck, ArrowRight, Fingerprint, Map, BadgeCheck,
  Phone
} from 'lucide-react';
import { BatteryStatus, Battery, Dealer } from '../types';
import HistoryReport from '../components/HistoryReport';

const SearchBattery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);

  useEffect(() => {
    Database.getAll<Dealer>('dealers').then(setDealers);
  }, []);

  const performSearch = async (id: string) => {
    if (!id.trim()) return;
    setIsSearching(true);
    setResult(null);
    setError('');

    try {
      const data = await Database.searchBattery(id);
      if (data && data.battery) {
        setResult(data);
      } else {
        setError('SERIAL IDENTITY NOT FOUND IN STARLINE MASTER REGISTRY.');
      }
    } catch (e) {
      setError('SYSTEM TRACE FAILED. CONNECTION TO REGISTRY INTERRUPTED.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (b: any) => {
    const isExpired = b.warrantyExpiry ? new Date() > new Date(b.warrantyExpiry) : false;
    if (isExpired && b.status === BatteryStatus.ACTIVE) return 'bg-rose-50 text-rose-600 border-rose-100';

    switch (b.status) {
      case BatteryStatus.MANUFACTURED: return 'bg-blue-50 text-blue-600 border-blue-100';
      case BatteryStatus.ACTIVE: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case BatteryStatus.RETURNED: return 'bg-slate-100 text-slate-500 border-slate-200';
      case BatteryStatus.REPLACEMENT: return 'bg-amber-50 text-amber-600 border-amber-100';
      case BatteryStatus.EXPIRED: return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const isExpired = result?.battery?.warrantyExpiry ? new Date() > new Date(result.battery.warrantyExpiry) : false;
  const getDealer = (dealerId: string) => dealers.find(d => d.id === dealerId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 uppercase tracking-tight">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">ASSET TRACE HUB</h2>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">REAL-TIME LIFECYCLE AUDIT SYSTEM</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); performSearch(query); }} className="flex gap-3 flex-1 lg:max-w-xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="INPUT SERIAL IDENTITY..."
                className="w-full pl-14 pr-6 py-5 rounded-2xl border-2 border-slate-100 outline-none font-black text-slate-900 text-sm uppercase tracking-widest focus:border-blue-500/20 transition-all bg-slate-50/50"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
              />
            </div>
            <button type="submit" disabled={isSearching} className="px-10 py-5 bg-slate-900 text-white font-black text-[11px] uppercase rounded-2xl tracking-[0.2em] hover:bg-black transition-all flex items-center space-x-3 shadow-xl shadow-slate-200 disabled:bg-slate-200">
              {isSearching ? <Activity size={18} className="animate-spin" /> : <Fingerprint size={18} />}
              <span>{isSearching ? 'TRACING...' : 'START TRACE'}</span>
            </button>
          </form>
        </div>
      </div>


      {result && (
        <>
          <div className="print:hidden space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-between h-[420px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                  <BatteryIcon size={240} />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className={`p-4 rounded-2xl border-2 ${getStatusBadge(result.battery)}`}>
                      <BatteryIcon size={32} />
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-2 ${getStatusBadge(result.battery)} shadow-sm`}>
                      {result.battery.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">UNIT ARCHITECTURE</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{result.battery.model}</h3>
                    <p className="text-lg font-black text-blue-600 tracking-tight">{result.battery.capacity}</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 relative z-10 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">SERIAL TOKEN</p>
                    <p className="text-xl font-mono font-black text-slate-900 tracking-widest">{result.battery.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">MFG DATE</p>
                    <p className="text-sm font-black text-slate-900">{new Date(result.battery.manufactureDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Coverage Context Card - Requirement: Visual parity with Emerald/Amber/Rose system */}
              <div className={`lg:col-span-8 p-12 rounded-[3.5rem] border-2 flex flex-col justify-between shadow-2xl relative overflow-hidden h-[420px] transition-all ${isExpired ? 'bg-rose-50 border-rose-100 text-rose-950' :
                result.battery.status === BatteryStatus.REPLACEMENT ? 'bg-amber-50 border-amber-100 text-amber-950 shadow-amber-500/10' :
                  result.battery.status === BatteryStatus.ACTIVE ? 'bg-emerald-50 border-emerald-100 text-emerald-950 shadow-emerald-500/10' :
                    'bg-slate-950 border-slate-900 text-white shadow-slate-300'
                }`}>
                <div className="absolute -top-20 -right-20 opacity-[0.05] rotate-12 pointer-events-none">
                  <ShieldCheck size={400} />
                </div>

                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <p className={`text-[11px] font-black uppercase tracking-[0.4em] ${isExpired ? 'text-rose-500' :
                      result.battery.status === BatteryStatus.REPLACEMENT ? 'text-amber-600' :
                        result.battery.status === BatteryStatus.ACTIVE ? 'text-emerald-600' : 'text-blue-400'
                      }`}>Registered Owner Record</p>
                    <h3 className={`text-5xl font-black tracking-tighter uppercase leading-tight`}>
                      {result.battery.customerName || 'UNREGISTERED INVENTORY'}
                    </h3>
                    <p className={`text-lg font-black opacity-60 flex items-center`}>
                      <Phone size={18} className="mr-3" /> {result.battery.customerPhone || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Coverage Analytics</p>
                    <span className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border-2 shadow-xl ${isExpired ? 'bg-rose-100 text-rose-600 border-rose-200' :
                      result.battery.status === BatteryStatus.RETURNED ? 'bg-slate-200 text-slate-500 border-slate-300' :
                        'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
                      }`}>
                      {isExpired ? 'WARRANTY EXPIRED' : result.battery.status === BatteryStatus.RETURNED ? 'RETURNED ASSET' : 'ACTIVE COVERAGE'}
                    </span>
                  </div>
                </div>

                {result.battery.dealerId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 mt-8">
                    <div className={`p-6 rounded-3xl border ${isExpired ? 'bg-rose-900/5 border-rose-900/10' : 'bg-black/5 border-black/5'} flex items-start space-x-5`}>
                      <div className={`p-3 rounded-2xl ${isExpired ? 'bg-rose-200 text-rose-700' : 'bg-blue-600 text-white'}`}>
                        <Store size={24} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">AUTHORIZED DEALER</p>
                        <p className="text-lg font-black tracking-tight truncate mt-0.5">{getDealer(result.battery.dealerId)?.name || 'UNKNOWN PARTNER'}</p>
                      </div>
                    </div>
                    <div className={`p-6 rounded-3xl border ${isExpired ? 'bg-rose-900/5 border-rose-900/10' : 'bg-black/5 border-black/5'} flex items-start space-x-5`}>
                      <div className={`p-3 rounded-2xl ${isExpired ? 'bg-rose-200 text-rose-700' : 'bg-emerald-600 text-white'}`}>
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">LIFECYCLE DATES</p>
                        <div className="flex items-center space-x-6 mt-1">
                          <div>
                            <p className="text-[9px] font-black opacity-40 uppercase">SALE</p>
                            <p className="text-sm font-black font-mono">{new Date(result.battery.activationDate).toLocaleDateString()}</p>
                          </div>
                          <div className="h-8 w-px bg-slate-200"></div>
                          <div>
                            <p className="text-[9px] font-black opacity-40 uppercase">EXPIRY</p>
                            <p className={`text-sm font-black font-mono ${isExpired ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {new Date(result.battery.warrantyExpiry).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><History size={20} /></div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter">LINEAGE AUDIT LOG</h3>
                </div>
                {/* Print Button */}
                <button
                  onClick={() => window.electronAPI ? window.electronAPI.printOrPdf() : window.print()}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg hover:translate-y-[-2px]"
                >
                  <Fingerprint size={16} /> Print Full History
                </button>
              </div>

              <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute left-[63px] top-12 bottom-12 w-1 bg-slate-50"></div>
                <div className="p-12 space-y-12">
                  {result.lineage.map((item: any, index: number) => {
                    const replacementRecord = result.replacements.find((r: any) => r.newBatteryId === item.id);
                    return (
                      <div key={item.id} className="relative flex items-start gap-10 animate-in slide-in-from-left duration-500">
                        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-xl ${item.status === BatteryStatus.ACTIVE ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                          item.status === BatteryStatus.REPLACEMENT ? 'bg-amber-500 text-white shadow-amber-500/30' :
                            item.status === BatteryStatus.RETURNED ? 'bg-slate-400 text-white' :
                              'bg-blue-600 text-white shadow-blue-500/30'
                          }`}>
                          <Zap size={18} fill="currentColor" />
                        </div>

                        <div className="flex-1 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 p-8 hover:bg-white hover:border-blue-500/20 transition-all group relative overflow-hidden">
                          <div className="flex flex-col lg:flex-row justify-between gap-10">
                            <div className="space-y-6 flex-1">
                              <div className="flex items-center space-x-4">
                                <span className="text-xl font-mono font-black text-slate-900 tracking-widest">{item.id}</span>
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-2 ${getStatusBadge(item)}`}>
                                  {item.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">MODEL CONFIGURATION</p>
                                  <p className="text-lg font-black text-slate-800 leading-none">{item.model} • {item.capacity}</p>
                                </div>
                                {item.dealerId && (
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">SERVICING PARTNER</p>
                                    <p className="text-lg font-black text-slate-800 leading-none truncate">{getDealer(item.dealerId)?.name || 'UNKNOWN'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col lg:items-end space-y-2 lg:text-right shrink-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">REGISTRATION DATE</p>
                              <p className="text-sm font-black text-slate-700 font-mono">{(item.activationDate || item.manufactureDate)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <HistoryReport
            battery={result.battery}
            lineage={result.lineage}
            replacements={result.replacements}
            dealers={dealers}
            saleDate={result.battery.activationDate}
          />
        </>
      )}
    </div >
  );
};

export default SearchBattery;
