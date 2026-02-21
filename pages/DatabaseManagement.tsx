import React, { useState } from 'react';
import { HardDrive, Server, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Loader2, Zap, Battery, BatteryCharging, Activity, Cpu, Wifi } from 'lucide-react';
import { Database } from '../db';

const DatabaseManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentConfigStr = localStorage.getItem('dbConfig');
    const currentConfig = currentConfigStr ? JSON.parse(currentConfigStr) : { type: 'INTERNAL' };
    const isInternal = currentConfig.type === 'INTERNAL';

    const handleSwitchInternal = async () => {
        if (isInternal) return;
        if (!confirm("Switch to Internal Storage? The app will restart.")) return;
        setLoading(true);
        try {
            localStorage.setItem('dbConfig', JSON.stringify({ type: 'INTERNAL' }));
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSwitchExternal = async () => {
        setLoading(true);
        try {
            const path = await Database.selectExternalDrive();
            if (!path) { setLoading(false); return; }
            if (!confirm(`Switch to External Drive at: ${path}? The app will restart.`)) { setLoading(false); return; }
            localStorage.setItem('dbConfig', JSON.stringify({ type: 'EXTERNAL', path }));
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center mb-8 max-w-xl">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Database Source</h1>
                <p className="text-sm text-slate-500 mt-2 font-medium">Switch between internal storage and an external portable drive</p>
            </div>

            {/* Card */}
            <div
                className="bg-white rounded-2xl p-8 w-full max-w-xl"
                style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)' }}
            >
                {error && (
                    <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-50 rounded-xl animate-in slide-in-from-top-2 duration-200">
                        <AlertCircle size={14} className="text-rose-500 shrink-0" />
                        <span className="text-xs text-rose-700 font-medium">{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                    {/* Internal */}
                    <button
                        onClick={handleSwitchInternal}
                        disabled={isInternal || loading}
                        className={`group relative text-left p-7 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none ${isInternal
                            ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-2'
                            : 'bg-slate-50 hover:bg-blue-50'
                            }`}
                    >
                        {isInternal && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={9} /> Active
                            </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${isInternal ? 'bg-blue-600 text-white' : 'bg-white shadow-sm text-slate-500 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            <Server size={22} />
                        </div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">Internal Storage</h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Data stored locally on this machine. Ideal for single-PC setups.</p>
                        {!isInternal && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight size={13} className="text-blue-500" />
                            </div>
                        )}
                    </button>

                    {/* External */}
                    <button
                        onClick={handleSwitchExternal}
                        disabled={loading}
                        className={`group relative text-left p-7 rounded-xl transition-all duration-200 active:scale-[0.98] ${!isInternal
                            ? 'bg-purple-50 ring-2 ring-purple-400 ring-offset-2'
                            : 'bg-slate-50 hover:bg-purple-50'
                            }`}
                    >
                        {!isInternal && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={9} /> Active
                            </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all ${!isInternal ? 'bg-purple-600 text-white' : 'bg-white shadow-sm text-slate-500 group-hover:bg-purple-600 group-hover:text-white'}`}>
                            <HardDrive size={22} />
                        </div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">External SSD</h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Portable drive stored in <code className="font-mono">starline/data</code> folder.</p>
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isInternal
                                ? <RefreshCw size={13} className="text-purple-500" />
                                : <ArrowRight size={13} className="text-purple-500" />
                            }
                        </div>
                    </button>
                </div>

                {!isInternal && currentConfig.path && (
                    <div className="mt-4 text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-2 rounded-lg truncate">
                        📂 {currentConfig.path}
                    </div>
                )}

                {loading && (
                    <div className="mt-5 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-xs font-semibold uppercase tracking-widest">Processing...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseManagement;
