import React, { useState } from 'react';
import { Lock, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { AuthSession } from '../utils/AuthSession';
import { Database } from '../db';
import { toast } from 'sonner';

interface UnlockPageProps {
    onUnlock?: () => void;
    onBack?: () => void;
}

const UnlockPage: React.FC<UnlockPageProps> = ({ onUnlock, onBack }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';

            if (password === adminPass) {
                AuthSession.saveSession();
                setPassword('');
                toast.success('Unlocked');
                if (onUnlock) onUnlock();
            } else {
                setError('Incorrect Password');
                setPassword('');
                toast.error('Incorrect Password');
            }
        } catch (err) {
            setError('Error');
            toast.error('Verification Failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-slate-50/50">
            <div className="w-full max-w-sm text-center">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                    <Lock size={32} className="text-slate-900" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Registry Locked</h2>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">Authorization Required</p>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-left mb-6">
                    <p className="text-blue-700 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                        Security Clearance Required. Please enter the administrator access key to proceed with system records.
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="relative group">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="password"
                            autoFocus
                            placeholder="Access Key"
                            className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-300
                                ${error
                                    ? 'border-rose-300 bg-rose-50 text-rose-600 focus:border-rose-500 shadow-sm shadow-rose-100'
                                    : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                                }`}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !password}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin text-white/50" /> : 'Authorize Access'}
                    </button>

                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="mt-4 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest transition-colors"
                        >
                            Cancel Access
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default UnlockPage;
