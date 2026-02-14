import React, { useState, useEffect } from 'react';
import {
    Search,
    Scale,
    RefreshCw,
    History,
    Play,
    Layers,
    Loader2
} from 'lucide-react';
import { Database } from '../db';
import { formatDate } from '../utils';
import { AuthSession } from '../utils/AuthSession';
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

    if (isLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-slate-900 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200">
                    <Scale size={32} className="text-slate-400" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Settlements Locked</h2>
                <p className="text-slate-400 font-medium text-sm mb-8">Unlock the session from the top bar to access the registry.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto p-4 lg:p-6">
            {/* Simple Header - Scanner Style */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                        <Scale size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settlement Registry</h1>
                        <p className="text-[10px] font-bold text-slate-400  tracking-widest mt-0.5">Dealer Claims & Exchanges</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab('SETTLEMENTS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'SETTLEMENTS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <History size={14} />
                            Pending Settlements
                            {settlementsCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-slate-900 text-white rounded-full text-[8px] leading-none">{settlementsCount}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('EXCHANGES')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'EXCHANGES' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Layers size={14} />
                            Pending Exchanges
                            {exchangesCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[8px] leading-none">{exchangesCount}</span>
                            )}
                        </button>
                    </div>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <button
                        onClick={loadData}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition-all hover:text-slate-900"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Simple Search Bar - Exactly like Scanner */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group/search max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={`Search in ${activeTab === 'SETTLEMENTS' ? 'Settlements' : 'Exchanges'}...`}
                            className="w-full bg-white border border-slate-200 rounded-lg py-3.5 pl-12 pr-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none uppercase tracking-wide"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Professional Minimal Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-slate-400 text-[10px] font-bold border-b border-slate-100 uppercase tracking-[0.1em]">
                                <th className="px-6 py-4 font-black">Event Date</th>
                                <th className="px-6 py-4 font-black">Dealer</th>
                                <th className="px-6 py-4 font-black">Claim Unit</th>
                                {activeTab === 'SETTLEMENTS' && <th className="px-6 py-4 font-black">Replaced With</th>}
                                <th className="px-6 py-4 font-black">Status</th>
                                <th className="px-6 py-4 text-right font-black">Action</th>
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
                                    <tr key={record.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-900">{formatDate(record.replacementDate)}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{record.type === 'PENDING_SWAP' ? 'Received Date' : 'Exchanged On'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-slate-900 transition-colors uppercase">{record.dealerName}</span>
                                                <span className="text-[10px] text-slate-400 uppercase mt-0.5">{record.dealerLocation}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-700 font-mono tracking-wider">{record.oldBatteryId}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 px-1.5 py-0.5 bg-slate-100 rounded inline-block w-fit">{record.oldModel}</span>
                                            </div>
                                        </td>
                                        {activeTab === 'SETTLEMENTS' && (
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-900 font-mono">{record.newBatteryId}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{record.newModel}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-6">
                                            {record.type === 'PENDING_SWAP' ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase">Wait for Swap</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Awaiting Settlement</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            {record.type === 'PENDING_SWAP' ? (
                                                <button
                                                    onClick={() => onNavigateToHub?.(record.oldBatteryId)}
                                                    className="px-4 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2 ml-auto"
                                                >
                                                    <Play size={12} fill="currentColor" />
                                                    Resume Exchange
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setResolvingRecord({
                                                        id: record.id,
                                                        dealerName: record.dealerName,
                                                        oldBatteryId: record.oldBatteryId
                                                    })}
                                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 whitespace-nowrap"
                                                >
                                                    Settle Now
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
