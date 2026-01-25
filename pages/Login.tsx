
import React, { useState } from 'react';
import { Zap, Lock, User, ArrowRight, ShieldAlert, ShieldCheck, Fingerprint, Loader2, Cpu, Globe, Server, Activity } from 'lucide-react';
import { Database } from '../db';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Authentication Protocol Logic
    setTimeout(async () => {
      const storedUser = await Database.getConfig('starline_admin_user') || 'admin';
      const storedPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';

      if (username.trim().toLowerCase() === storedUser.toLowerCase() && password === storedPass) {
        localStorage.setItem('starline_auth', 'true');
        onLogin();
      } else {
        setError('Verification failed: The credentials provided do not match our records.');
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 antialiased selection:bg-blue-100">
      <div className="max-w-[850px] w-full flex flex-col md:flex-row bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500">

        {/* Technical Side Panel */}
        <div className="md:w-[320px] bg-[#0f172a] p-8 flex flex-col justify-between relative overflow-hidden text-white shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Cpu size={240} />
          </div>

          <div className="relative z-10 space-y-8">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight leading-none uppercase">Starline</h1>
                <p className="text-[9px] font-bold text-blue-500 mt-1 tracking-widest uppercase">Enterprise OS</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Diagnostics</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-2"><Server size={12} /> Node Status</span>
                  <span className="text-emerald-400 font-mono uppercase">Operational</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-2"><Globe size={12} /> API Latency</span>
                  <span className="text-blue-400 font-mono uppercase">24ms</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-2"><Activity size={12} /> Registry Up</span>
                  <span className="text-slate-300 font-mono uppercase">99.9%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10">
            <div className="flex items-center space-x-2 text-slate-500">
              <ShieldCheck size={14} />
              <p className="text-[10px] font-medium leading-none uppercase tracking-wider">Secure Kernel v4.2.0</p>
            </div>
          </div>
        </div>

        {/* Access Interface */}
        <div className="flex-1 p-10 md:p-14 bg-white flex flex-col justify-center">
          <div className="max-w-[320px] mx-auto w-full space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Access</h2>
              <p className="text-slate-500 text-xs font-medium">Please enter your administrative credentials.</p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-3 text-rose-700 animate-in slide-in-from-top-2 duration-300">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span className="text-[11px] font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Identity UID</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                  <input
                    required
                    autoFocus
                    placeholder="Enter username"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Access Key</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={isLoading}
                  className="w-full py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin text-blue-500" size={18} />
                  ) : (
                    <>
                      <span>Initialize Session</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-6 flex items-center justify-center space-x-4 opacity-40">
              <div className="h-px bg-slate-300 flex-1" />
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Encryption Active</p>
              <div className="h-px bg-slate-300 flex-1" />
            </div>

            <p className="text-center text-[9px] text-slate-400 font-medium">
              Authorized personnel only. Sessions are logged.<br />
              © 2025 Starline Power Architectures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
