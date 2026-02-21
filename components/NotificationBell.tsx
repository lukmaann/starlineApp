import React, { useState, useEffect, useRef } from 'react';
import { Bell, PackageCheck, Scale, X, ChevronRight } from 'lucide-react';
import { Database } from '../db';

interface NotificationBellProps {
    onNavigate: (tab: string) => void;
}

interface Counts {
    batches: number;
    settlements: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
    const [counts, setCounts] = useState<Counts>({ batches: 0, settlements: 0 });
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    const total = counts.batches + counts.settlements;

    const fetchCounts = async () => {
        try {
            const res = await Database.getNotificationCounts();
            setCounts(res);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounts();
        const interval = setInterval(fetchCounts, 60_000);
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const notifications = [
        counts.batches > 0 && {
            icon: <PackageCheck size={16} className="text-indigo-500" />,
            label: 'Pending Batches / Inspections',
            count: counts.batches,
            tab: 'batches',
            color: 'bg-indigo-50',
        },
        counts.settlements > 0 && {
            icon: <Scale size={16} className="text-amber-500" />,
            label: 'Pending Settlements',
            count: counts.settlements,
            tab: 'settlements',
            color: 'bg-amber-50',
        },
    ].filter(Boolean) as { icon: React.ReactNode; label: string; count: number; tab: string; color: string }[];

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => { setOpen(v => !v); if (!open) fetchCounts(); }}
                className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                title="Notifications"
            >
                <Bell size={18} />
                {!loading && total > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none animate-in zoom-in duration-200">
                        {total > 9 ? '9+' : total}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-[500] animate-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden"
                    style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Bell size={14} className="text-slate-500" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Notifications</span>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                            <X size={13} />
                        </button>
                    </div>

                    {/* Items */}
                    <div className="p-2">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                                <Bell size={24} strokeWidth={1.5} />
                                <span className="text-xs font-bold uppercase tracking-wider">All clear</span>
                                <span className="text-[10px] font-medium text-slate-400">No pending actions</span>
                            </div>
                        ) : (
                            notifications.map((n, i) => (
                                <button
                                    key={i}
                                    onClick={() => { onNavigate(n.tab); setOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 hover:bg-slate-50 transition-colors text-left group`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                                        {n.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 leading-snug">{n.label}</p>
                                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{n.count} item{n.count > 1 ? 's' : ''} need attention</p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                            Refreshes every 60s
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
