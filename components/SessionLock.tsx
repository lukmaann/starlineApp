import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Key, Loader2, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { AuthSession } from '../utils/AuthSession';
import { Database } from '../db';

const SessionLock: React.FC<{
    isLocked?: boolean;
    onToggle?: (locked: boolean) => void;
    className?: string;
    popoverDirection?: 'up' | 'down';
}> = ({ isLocked: propIsLocked, onToggle, className, popoverDirection = 'down' }) => {
    const [internalIsLocked, setInternalIsLocked] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isLocked = propIsLocked !== undefined ? propIsLocked : internalIsLocked;

    useEffect(() => {
        const checkStatus = () => {
            const valid = AuthSession.isValid();
            if (propIsLocked === undefined) setInternalIsLocked(!valid);
        };

        checkStatus();

        // Listen for global session changes
        const handleSessionChange = (e: any) => {
            if (propIsLocked === undefined) {
                setInternalIsLocked(!e.detail.isAuthenticated);
            }
            if (e.detail.isAuthenticated) {
                setShowModal(false);
                if (onToggle) onToggle(false);
            }
        };

        window.addEventListener('session-changed' as any, handleSessionChange);
        return () => window.removeEventListener('session-changed' as any, handleSessionChange);
    }, []);

    const handleToggle = () => {
        if (!isLocked) {
            // If unlocked, lock it
            AuthSession.clearSession();
            window.location.reload();
        } else {
            // If locked, open modal
            setShowModal(true);
            setTimeout(() => document.getElementById('session-lock-input')?.focus(), 100);
        }
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';

            if (password === adminPass) {
                AuthSession.saveSession();
                setPassword('');
                if (onToggle) onToggle(false);
                else setInternalIsLocked(false);
                setShowModal(false);
            } else {
                setError('Invalid Access Key');
                setPassword('');
            }
        } catch (err) {
            setError('Verification Failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            <button
                onClick={handleToggle}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-bold text-[10px] tracking-widest transition-all border shadow-sm active:scale-95 ${isLocked
                    ? 'bg-white text-rose-600 border-rose-100 hover:bg-rose-50 hover:border-rose-200'
                    : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                title={isLocked ? "Click to Unlock Session" : "Click to Lock Session"}
            >
                <div className={`p-1 rounded-md ${isLocked ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                    {isLocked ? <Lock size={12} strokeWidth={3} /> : <Unlock size={12} strokeWidth={3} />}
                </div>
                <span className="uppercase">{isLocked ? 'Locked' : 'Active'}</span>
            </button>

            {showModal && (
                <>
                    <div className="fixed inset-0 z-[100] cursor-default bg-slate-900/5 backdrop-blur-[2px]" onClick={() => setShowModal(false)} />
                    <div className={`absolute right-0 w-80 z-[200] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${popoverDirection === 'up' ? 'bottom-full mb-4 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}>
                        {/* Header */}
                        <div className="bg-slate-50/50 p-4 border-b border-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm text-slate-400">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Security Control</p>
                                    <p className="text-[11px] font-bold text-slate-900 mt-1">Verified Access Required</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-inner transition-all duration-300 ${error ? 'bg-rose-50 text-rose-500 animate-shake' : 'bg-slate-50 text-slate-400'}`}>
                                    {error ? <ShieldAlert size={28} /> : <Key size={28} />}
                                </div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Unlock Session</h3>
                                <p className="text-xs text-slate-500 font-medium mt-1 px-4 leading-relaxed">Enter your master authorization key to enable restricted controls.</p>
                            </div>

                            <form onSubmit={handleUnlock} className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <input
                                            id="session-lock-input"
                                            type="password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                            placeholder="••••••••"
                                            className={`w-full px-4 py-3.5 bg-slate-50 border rounded-xl font-bold text-center text-lg text-slate-900 outline-none transition-all placeholder:text-slate-300 tracking-[0.3em] ${error ? 'border-rose-200 focus:border-rose-400 bg-rose-50/30' : 'border-slate-100 focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/5'}`}
                                            autoFocus
                                        />
                                        <div className="absolute inset-0 border border-transparent group-focus-within:border-blue-500/10 rounded-xl pointer-events-none transition-all" />
                                    </div>
                                    {error && (
                                        <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-rose-50 border border-rose-100 rounded-lg animate-in slide-in-from-top-1">
                                            <ShieldAlert size={12} className="text-rose-500" />
                                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{error}</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !password}
                                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 transition-all disabled:opacity-50 disabled:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                >
                                    {isLoading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span>Authorize Access</span>
                                            <Unlock size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Footer Info */}
                        <div className="bg-slate-50/30 px-6 py-4 border-t border-slate-50 text-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Starline Secure Protocol v4.0</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SessionLock;
