import React, { useState, useEffect } from 'react';
import {
    Search,
    Scale,
    RefreshCw,
    History,
    Play,
    Layers,
    Loader2,
    Lock,
    KeyRound
} from 'lucide-react';
import { Database } from '../db';
import { formatDate } from '../utils';
import { AuthSession } from '../utils/AuthSession';
import { toast } from 'sonner';
import { SettlementModal, SettlementTarget } from '../components/SettlementModal';

interface SettlementRecord {
    id: string;
    dealerId: string;
    dealerName: string;
    dealerLocation: string;
    oldBatteryId: string;
    newBatteryId: string | null;
    replacementDate: string;
    oldModel: string;
    newModel: string | null;
    originalPrice: number;
    type: 'EXCHANGED' | 'PENDING_SWAP';
}

interface SettlementsProps {
    onNavigateToHub?: (serial: string) => void;
}

const Settlements: React.FC<SettlementsProps> = ({ onNavigateToHub }) => {
    const [ledger, setLedger] = useState<SettlementRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'SETTLEMENTS' | 'EXCHANGES'>('SETTLEMENTS');
    const [isLocked, setIsLocked] = useState(!AuthSession.isValid());
    const [lockPassword, setLockPassword] = useState('');
    const [lockError, setLockError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Listen for session changes (Global Unlock)
    useEffect(() => {
        const handleSessionChange = (e: any) => {
            setIsLocked(!e.detail.isAuthenticated);
        };
        window.addEventListener('session-changed' as any, handleSessionChange);
        return () => window.removeEventListener('session-changed' as any, handleSessionChange);
    }, []);

    // Resolution State
    const [resolvingRecord, setResolvingRecord] = useState<SettlementTarget | null>(null);

    useEffect(() => {
        if (!isLocked) {
            loadData();
        }
    }, [isLocked]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await Database.getSettlementLedger();
            setLedger(data);
        } catch (error) {
            console.error('Failed to load ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLedger = ledger.filter(r => {
        const searchLower = searchQuery.toLowerCase();

        // 1. Tab Filtering
        if (activeTab === 'SETTLEMENTS' && r.type !== 'EXCHANGED') return false;
        if (activeTab === 'EXCHANGES' && r.type !== 'PENDING_SWAP') return false;

        // 2. Search Filtering
        const matchesSearch =
            r.dealerName.toLowerCase().includes(searchLower) ||
            r.oldBatteryId.toLowerCase().includes(searchLower) ||
            (r.newBatteryId && r.newBatteryId.toLowerCase().includes(searchLower)) ||
            r.oldModel.toLowerCase().includes(searchLower);

        return matchesSearch;
    });

    const settlementsCount = ledger.filter(r => r.type === 'EXCHANGED').length;
    const exchangesCount = ledger.filter(r => r.type === 'PENDING_SWAP').length;

    const handleLocalUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUnlocking(true);
        setLockError('');

        try {
            const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';
            if (lockPassword === adminPass) {
                AuthSession.saveSession();
                setIsLocked(false);
                setLockPassword('');
                toast.success('Registry Unlocked');
            } else {
                setLockError('Incorrect Access Key');
                setLockPassword('');
                toast.error('Incorrect Access Key');
            }
        } catch (err) {
            toast.error('Verification Failed');
        } finally {
            setIsUnlocking(false);
        }
    };

    if (isLocked) {
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
                            Security Clearance Required. Please enter the administrator access key to proceed with settlement records.
                        </p>
                    </div>

                    <form onSubmit={handleLocalUnlock} className="space-y-4">
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="password"
                                autoFocus
                                placeholder="Access Key"
                                className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-300
                                    ${lockError
                                        ? 'border-rose-300 bg-rose-50 text-rose-600 focus:border-rose-500 shadow-sm shadow-rose-100'
                                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                                    }`}
                                value={lockPassword}
                                onChange={e => { setLockPassword(e.target.value); setLockError(''); }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isUnlocking || !lockPassword}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isUnlocking ? <Loader2 size={16} className="animate-spin text-white/50" /> : 'Authorize Access'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">Settlement Registry</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dealer Claims & Exchanges</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab('SETTLEMENTS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'SETTLEMENTS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <History size={14} />
                            Settlements
                            {settlementsCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-slate-900 text-white rounded-full text-[8px] leading-none">{settlementsCount}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('EXCHANGES')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'EXCHANGES' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Layers size={14} />
                            Exchanges
                            {exchangesCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[8px] leading-none">{exchangesCount}</span>
                            )}
                        </button>
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <button
                        onClick={loadData}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm active:scale-95"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search Bar Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                    <input
                        placeholder={`Search ${activeTab === 'SETTLEMENTS' ? 'Settlements' : 'Exchanges'} by Dealer, ID or Model...`}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-sm transition-all uppercase tracking-wide mono text-slate-900 focus:bg-white focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Registry Area */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

                {/* Professional Minimal Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold border-b border-slate-200 uppercase tracking-widest">
                                <th className="px-6 py-4">Event Date</th>
                                <th className="px-6 py-4">Dealer</th>
                                <th className="px-6 py-4">Claim Unit</th>
                                {activeTab === 'SETTLEMENTS' && <th className="px-6 py-4">Replaced With</th>}
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right pr-10">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={activeTab === 'SETTLEMENTS' ? 6 : 5} className="py-24 text-center">
                                        <Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fetching Registry...</span>
                                    </td>
                                </tr>
                            ) : filteredLedger.length > 0 ? (
                                filteredLedger.map((record) => (
                                    <tr key={record.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-900 font-mono">{formatDate(record.replacementDate)}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">{record.type === 'PENDING_SWAP' ? 'Received' : 'Exchanged'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{record.dealerName}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wide">{record.dealerLocation}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-700 font-mono tracking-wider">{record.oldBatteryId}</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase mt-1 px-1.5 py-0.5 bg-slate-100 rounded inline-block w-fit">{record.oldModel}</span>
                                            </div>
                                        </td>
                                        {activeTab === 'SETTLEMENTS' && (
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-900 font-mono">{record.newBatteryId}</span>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{record.newModel}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-5">
                                            {record.type === 'PENDING_SWAP' ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Pending Swap</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Awaiting Settle</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            {record.type === 'PENDING_SWAP' ? (
                                                <button
                                                    onClick={() => onNavigateToHub?.(record.oldBatteryId)}
                                                    className="px-4 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2 ml-auto shadow-sm"
                                                >
                                                    <Play size={12} fill="currentColor" />
                                                    Resume
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setResolvingRecord({
                                                        id: record.id,
                                                        dealerName: record.dealerName,
                                                        oldBatteryId: record.oldBatteryId
                                                    })}
                                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 whitespace-nowrap shadow-sm"
                                                >
                                                    Settle Case
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={activeTab === 'SETTLEMENTS' ? 6 : 5} className="py-24 text-center bg-slate-50/50">
                                        <p className="font-bold text-[10px]  tracking-widest text-slate-400">
                                            No pending {activeTab.toLowerCase()} found
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <SettlementModal
                isOpen={!!resolvingRecord}
                target={resolvingRecord}
                onClose={() => setResolvingRecord(null)}
                onSuccess={() => {
                    setResolvingRecord(null);
                    loadData();
                }}
            />
        </div>
    );
};

export default Settlements;
