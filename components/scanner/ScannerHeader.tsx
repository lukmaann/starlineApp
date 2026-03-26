import React from 'react';
import { Barcode, Search, CheckCircle2, Loader2, X, LayoutGrid, PackagePlus } from 'lucide-react';
import { Dealer, BatteryModel } from '../../types';
import DealerInlineSummary from '../DealerInlineSummary';

interface ScannerHeaderProps {
    batchMode: boolean;
    setBatchMode: (mode: boolean) => void;
    lastScanned: string | null;
    dealers: Dealer[];
    models: BatteryModel[];
    batchConfig: {
        dealerId: string;
        modelId: string;
        date: string;
    };
    setBatchConfig: (config: any) => void;
    scanBuffer: string;
    setScanBuffer: (buffer: string) => void;
    handleSearch: (id: string) => void;
    handleClear: () => void;
    isProcessing: boolean;
    activeAsset: any;
    inputRef: React.RefObject<HTMLInputElement>;
    userRole?: string;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
    batchMode,
    setBatchMode,
    lastScanned,
    dealers,
    models,
    batchConfig,
    setBatchConfig,
    scanBuffer,
    setScanBuffer,
    handleSearch,
    handleClear,
    isProcessing,
    activeAsset,
    inputRef,
    userRole
}) => {
    const isAdmin = userRole === 'ADMIN';
    const selectedDealer = dealers.find((dealer) => dealer.id === batchConfig.dealerId) || null;

    return (
        <div className={`transition-all duration-300 ${batchMode ? 'bg-indigo-900 border-indigo-700' : 'bg-white border-slate-200'} border rounded-2xl p-8 shadow-sm no-print`}>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setBatchMode(!batchMode)}
                            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${batchMode ? 'bg-white text-indigo-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {batchMode ? 'Batch Mode Active' : 'Normal Trace'}
                        </button>
                        {batchMode && <span className="text-indigo-200 text-xs font-bold uppercase animate-pulse">{isAdmin ? 'Ready for rapid assignment' : 'Ready for staging'}</span>}
                    </div>
                    {batchMode && lastScanned && (
                        <div className="text-white font-mono text-sm">
                            Last: {lastScanned} <CheckCircle2 className="inline text-emerald-400" size={16} />
                        </div>
                    )}
                </div>

                {batchMode && (
                    <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                        <select
                            className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400"
                            value={batchConfig.dealerId}
                            onChange={e => setBatchConfig({ ...batchConfig, dealerId: e.target.value })}
                        >
                            <option value="">Select Target Dealer</option>
                            {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select
                            className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400"
                            value={batchConfig.modelId}
                            onChange={e => setBatchConfig({ ...batchConfig, modelId: e.target.value })}
                        >
                            <option value="">Select Default Model</option>
                            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <input
                            type="date"
                            className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400"
                            value={batchConfig.date}
                            onChange={e => setBatchConfig({ ...batchConfig, date: e.target.value })}
                        />
                    </div>
                )}

                {batchMode && selectedDealer && (
                    <DealerInlineSummary
                        dealerId={selectedDealer.id}
                        dealer={selectedDealer}
                        tone="dark"
                        compact
                    />
                )}

                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="shrink-0 flex gap-2">
                        <div className={`${batchMode ? 'bg-white/10 text-white' : 'bg-blue-600/10 text-blue-600'} p-4 rounded-2xl`}>
                            <Barcode size={32} />
                        </div>
                    </div>
                    <div className="flex-1 w-full relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${batchMode ? 'text-indigo-300' : 'text-slate-400'}`} size={20} />
                        <input
                            ref={inputRef}
                            disabled={isProcessing}
                            placeholder={batchMode ? "SCAN TO STAGE..." : "Input serial identifier..."}
                            className={`w-full pl-12 pr-6 py-4 rounded-xl outline-none font-bold text-lg transition-all uppercase tracking-widest mono ${batchMode ? 'bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400 focus:bg-indigo-950 focus:border-indigo-400' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'}`}
                            value={scanBuffer}
                            onChange={(e) => setScanBuffer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(scanBuffer)}
                        />
                        {isProcessing && <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${batchMode ? 'text-white' : 'text-blue-600'}`} size={20} />}
                    </div>
                    <button
                        onClick={() => handleSearch(scanBuffer)}
                        disabled={isProcessing || !scanBuffer || (batchMode && (!batchConfig.dealerId || !batchConfig.modelId))}
                        className={`px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-30 uppercase tracking-widest ${batchMode ? 'bg-white text-indigo-900 hover:bg-indigo-50' : 'bg-slate-900 text-white hover:bg-black'}`}
                    >
                        {batchMode ? 'Stage' : 'Trace Unit'}
                    </button>

                    {(activeAsset || scanBuffer) && (
                        <button
                            onClick={handleClear}
                            className="p-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-95"
                            title="Clear Search"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
