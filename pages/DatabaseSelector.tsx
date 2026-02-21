import React, { useState } from 'react';
import { HardDrive, Server, ArrowRight, Database as DatabaseIcon, AlertCircle, Loader2, Zap, Battery, BatteryCharging, Activity, Cpu, Wifi } from 'lucide-react';
import { Database } from '../db';
import { toast } from 'sonner';

interface DatabaseSelectorProps {
    onComplete: () => void;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInternal = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await Database.switchDatabase('INTERNAL');
            if (res.success) {
                localStorage.setItem('dbConfig', JSON.stringify({ type: 'INTERNAL' }));
                toast.success("Connected to Internal Storage");
                onComplete();
            } else {
                throw new Error(res.error || "Failed to initialize");
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleExternal = async () => {
        setLoading(true);
        setError(null);
        try {
            const path = await Database.selectExternalDrive();
            if (!path) { setLoading(false); return; }
            const res = await Database.switchDatabase('EXTERNAL', path);
            if (res.success) {
                localStorage.setItem('dbConfig', JSON.stringify({ type: 'EXTERNAL', path }));
                toast.success("Connected to External SSD");
                onComplete();
            } else {
                throw new Error(res.error || "Failed to initialize");
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 antialiased"
            style={{ background: 'radial-gradient(ellipse at 60% 20%, #eff6ff 0%, #f8fafc 50%, #f1f5f9 100%)' }}
        >
            {/* Decorative background icons — same as login */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />
                <Zap size={180} className="absolute text-blue-400 opacity-[0.07]" style={{ top: '-4%', left: '-3%', transform: 'rotate(-15deg)' }} />
                <Zap size={100} className="absolute text-slate-400 opacity-[0.06]" style={{ top: '18%', right: '6%', transform: 'rotate(20deg)' }} />
                <Zap size={70} className="absolute text-blue-500 opacity-[0.08]" style={{ bottom: '22%', left: '8%', transform: 'rotate(-8deg)' }} />
                <Zap size={50} className="absolute text-slate-500 opacity-[0.05]" style={{ top: '55%', right: '22%', transform: 'rotate(30deg)' }} />
                <BatteryCharging size={140} className="absolute text-blue-300 opacity-[0.06]" style={{ bottom: '-2%', right: '-2%', transform: 'rotate(12deg)' }} />
                <BatteryCharging size={80} className="absolute text-slate-400 opacity-[0.05]" style={{ top: '40%', left: '3%', transform: 'rotate(-20deg)' }} />
                <Battery size={90} className="absolute text-blue-400 opacity-[0.05]" style={{ top: '70%', right: '5%', transform: 'rotate(-10deg)' }} />
                <Battery size={55} className="absolute text-slate-400 opacity-[0.04]" style={{ top: '12%', left: '25%', transform: 'rotate(15deg)' }} />
                <Activity size={120} className="absolute text-blue-500 opacity-[0.05]" style={{ bottom: '12%', left: '-1%', transform: 'rotate(0deg)' }} />
                <Activity size={65} className="absolute text-slate-400 opacity-[0.05]" style={{ top: '30%', right: '3%', transform: 'rotate(-12deg)' }} />
                <Cpu size={110} className="absolute text-slate-400 opacity-[0.05]" style={{ top: '6%', right: '15%', transform: 'rotate(10deg)' }} />
                <Cpu size={60} className="absolute text-blue-400 opacity-[0.04]" style={{ bottom: '38%', right: '14%', transform: 'rotate(-25deg)' }} />
                <Wifi size={80} className="absolute text-blue-300 opacity-[0.06]" style={{ bottom: '5%', left: '30%', transform: 'rotate(0deg)' }} />
                <Wifi size={50} className="absolute text-slate-400 opacity-[0.04]" style={{ top: '48%', left: '18%', transform: 'rotate(8deg)' }} />
            </div>

            <div className="relative w-full max-w-[480px] animate-in zoom-in-95 fade-in duration-500">

                {/* Brand mark */}
                <div className="flex flex-col items-center mb-8">
                    <div
                        className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-5 shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                    >
                        <Zap size={24} className="text-blue-400" fill="#60a5fa" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Select Data Source</h1>
                    <p className="text-sm text-slate-500 mt-1.5 font-medium">Choose where your business data is stored</p>
                </div>

                {/* Card */}
                <div
                    className="bg-white rounded-2xl p-6"
                    style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -8px rgba(0,0,0,0.08)' }}
                >
                    {/* Error */}
                    {error && (
                        <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-rose-50 rounded-xl animate-in slide-in-from-top-2 duration-200">
                            <AlertCircle size={14} className="text-rose-500 shrink-0" />
                            <span className="text-xs text-rose-700 font-medium">{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Internal */}
                        <button
                            onClick={handleInternal}
                            disabled={loading}
                            className="group relative text-left p-6 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                        >
                            <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                                <Server size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 mb-1 tracking-tight">Internal</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">Local database on this machine</p>
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight size={14} className="text-blue-500" />
                            </div>
                        </button>

                        {/* External */}
                        <button
                            onClick={handleExternal}
                            disabled={loading}
                            className="group relative text-left p-6 bg-slate-50 hover:bg-purple-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
                        >
                            <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 text-slate-500 group-hover:bg-purple-600 group-hover:text-white transition-all duration-200">
                                <HardDrive size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 mb-1 tracking-tight">External SSD</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">Portable drive via <code className="font-mono">starline/data</code></p>
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight size={14} className="text-purple-500" />
                            </div>
                        </button>
                    </div>

                    {loading && (
                        <div className="mt-5 flex items-center justify-center gap-2 text-slate-400">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-xs font-semibold uppercase tracking-widest">Initializing connection...</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-slate-400 font-medium mt-6">
                    Developed by <span className="font-bold text-slate-500">Lukmaann</span>
                </p>
            </div>
        </div>
    );
};

export default DatabaseSelector;
