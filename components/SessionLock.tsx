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
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${isLocked
                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                    }`}
                title={isLocked ? "Click to Unlock Session" : "Click to Lock Session"}
            >
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                {/* <span>{isLocked ? 'SESSION LOCKED' : 'SESSION ACTIVE'}</span> */}
            </button>

            {showModal && (
                <>
                    <div className="fixed inset-0 z-[100] cursor-default" onClick={() => setShowModal(false)} />
                    <div className={`absolute right-0 w-80 z-[200] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${popoverDirection === 'up' ? 'bottom-full mb-3 slide-in-from-bottom-2' : 'top-full mt-3 slide-in-from-top-2'}`}>
                        <div className="bg-slate-50 p-3 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                                <ShieldCheck size={14} />
                                <span>Security Check</span>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${error ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {error ? <ShieldAlert size={20} /> : <Key size={20} />}
                                </div>
                                <div>
                                    <h3 className="text-slate-900 font-black text-sm uppercase tracking-tight">Unlock Session</h3>
                                    <p className="text-[10px] text-slate-500 font-medium">Enter admin key to proceed</p>
                                </div>
                            </div>

                            <form onSubmit={handleUnlock} className="space-y-3">
                                <div>
                                    <input
                                        id="session-lock-input"
                                        type="password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                        placeholder="ENTER KEY..."
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-center text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 uppercase tracking-widest"
                                        autoFocus
                                    />
                                    {error && <p className="text-[9px] font-bold text-rose-500 text-center mt-1 animate-pulse">{error}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !password}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Authorize Access'}
                                </button>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SessionLock;
