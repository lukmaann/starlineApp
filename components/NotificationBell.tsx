import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, ChevronRight, PackageCheck, Scale, X } from 'lucide-react';
import { Database } from '../db';

interface NotificationBellProps {
    onNavigate: (tab: string) => void;
}

interface Counts {
    batches: number;
    settlements: number;
    daysSinceBackup: number | null;
    daysSinceOptimize: number | null;
}

interface LowStockItem {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    alert_threshold: number;
    shortage: number;
}

const fmtQty = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toFixed(1));

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
    const [counts, setCounts] = useState<Counts>({ batches: 0, settlements: 0, daysSinceBackup: null, daysSinceOptimize: null });
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const ref = useRef<HTMLDivElement>(null);

    const getDaysSince = (isoDate: string | null) => {
        if (!isoDate) return null;
        const past = new Date(isoDate).getTime();
        const now = new Date().getTime();
        return Math.floor((now - past) / (1000 * 60 * 60 * 24));
    };

    const fetchCounts = async () => {
        try {
            const [res, lowStock, lastBackup, lastOptimize] = await Promise.all([
                Database.getNotificationCounts(),
                Database.getLowStockMaterials(200),
                Database.getConfig('last_backup_date'),
                Database.getConfig('last_optimize_date'),
            ]);

            setCounts({
                ...res,
                daysSinceBackup: getDaysSince(lastBackup),
                daysSinceOptimize: getDaysSince(lastOptimize),
            });
            setLowStockItems(lowStock);
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

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const needsBackup = counts.daysSinceBackup === null || counts.daysSinceBackup >= 6;
    const needsOptimize = counts.daysSinceOptimize === null || counts.daysSinceOptimize >= 5;

    const notifications = useMemo(() => {
        return [
            lowStockItems.length > 0 && {
                icon: <AlertTriangle size={16} className="text-red-500" />,
                label: 'Low Stock Materials',
                count: lowStockItems.length,
                note: lowStockItems
                    .slice(0, 4)
                    .map((item) => `${item.name}: ${fmtQty(item.current_stock)} ${item.unit} (min ${fmtQty(item.alert_threshold)})`)
                    .join(' • '),
                tab: 'manufacturing',
                color: 'bg-red-50',
            },
            needsBackup && {
                icon: <AlertTriangle size={16} className="text-rose-500" />,
                label: 'Action Required: Backup Registration Data',
                count: counts.daysSinceBackup === null ? 'Never backed up' : `${counts.daysSinceBackup} days since last backup`,
                note: 'Open backup center and run a fresh backup.',
                tab: 'backup',
                color: 'bg-rose-50',
            },
            needsOptimize && {
                icon: <AlertTriangle size={16} className="text-orange-500" />,
                label: 'Maintenance: Optimize Database',
                count: counts.daysSinceOptimize === null ? 'Never optimized' : `${counts.daysSinceOptimize} days since last optimization`,
                note: 'Optimize database for smoother performance.',
                tab: 'backup',
                color: 'bg-orange-50',
            },
            counts.batches > 0 && {
                icon: <PackageCheck size={16} className="text-indigo-500" />,
                label: 'Pending Batches / Inspections',
                count: counts.batches,
                note: 'Pending items are waiting for review.',
                tab: 'batches',
                color: 'bg-indigo-50',
            },
            counts.settlements > 0 && {
                icon: <Scale size={16} className="text-amber-500" />,
                label: 'Pending Settlements',
                count: counts.settlements,
                note: 'Some replacements still need settlement.',
                tab: 'settlements',
                color: 'bg-amber-50',
            },
        ].filter(Boolean) as { icon: React.ReactNode; label: string; count: number | string; note: string; tab: string; color: string }[];
    }, [lowStockItems, needsBackup, needsOptimize, counts]);

    const total = useMemo(() => {
        return notifications.reduce((sum, n) => sum + (typeof n.count === 'number' ? n.count : 1), 0);
    }, [notifications]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => { setOpen(v => !v); if (!open) fetchCounts(); }}
                className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
                title="Notifications"
            >
                <Bell size={18} />
                {!loading && total > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                        {total > 9 ? '9+' : total}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-[500] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Bell size={14} className="text-slate-500" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Notifications ({total})</span>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                            <X size={13} />
                        </button>
                    </div>

                    <div className="p-2 max-h-96 overflow-y-auto">
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
                                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl mb-1 hover:bg-slate-50 transition-colors text-left group"
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                                        {n.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 leading-snug">{n.label}</p>
                                        <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                                            {typeof n.count === 'number' ? `${n.count} item${n.count > 1 ? 's' : ''} need attention` : n.count}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">{n.note}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                                </button>
                            ))
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Refreshes every 60s</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
