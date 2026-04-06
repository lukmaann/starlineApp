import React from 'react';
import { X, CheckCircle2, Loader2, Trash2, FileCheck } from 'lucide-react';

interface BatchStagingAreaProps {
    stagedItems: any[];
    setStagedItems: (items: any[] | ((prev: any[]) => any[])) => void;
    batchSummary: Record<string, number>;
    removeStagedItem: (id: string) => void;
    handleConfirmBatch: () => void;
    isActionLoading: boolean;
    lastScanned: string | null;
}

export const BatchStagingArea: React.FC<BatchStagingAreaProps> = ({
    stagedItems,
    setStagedItems,
    batchSummary,
    removeStagedItem,
    handleConfirmBatch,
    isActionLoading,
    lastScanned
}) => {
    if (stagedItems.length === 0) return null;

    const summaryEntries = Object.entries(batchSummary).sort((a, b) => b[1] - a[1]);

    return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Staging Area */}
                <div className="flex-1 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Queue</p>
                            <button
                                onClick={() => setStagedItems([])}
                                className="flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-[0.18em] transition-all active:scale-95 border border-rose-100 bg-white"
                            >
                                <Trash2 size={13} />
                                Delete all
                            </button>
                        </div>
                        <div className="max-h-[430px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                                    <tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                                        <th className="px-6 py-3">Serial</th>
                                        <th className="px-6 py-3">Model</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right"> </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stagedItems.map((item) => (
                                        <tr
                                            key={item.id}
                                                className={`group transition-all duration-200 ${item.id === lastScanned ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                                                }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`h-2.5 w-2.5 rounded-full ${item.exists ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                                        <span className="text-slate-900 font-mono font-bold text-sm tracking-wider">{item.id}</span>
                                                    </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wide">{item.model}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black border tracking-widest uppercase ${item.exists
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                    {item.exists ? 'Update' : 'New'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeStagedItem(item.id); }}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all group-hover:opacity-100 opacity-60"
                                                    title="Remove"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="w-full lg:w-72 shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                        <div className="bg-[linear-gradient(135deg,_#f8fafc_0%,_#ecfeff_100%)] p-4 border-b border-slate-200 flex items-center gap-3">
                            <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg shadow-emerald-500/20">
                                <FileCheck size={18} />
                            </div>
                            <div>
                                <h4 className="text-slate-900 font-bold text-sm uppercase tracking-tight">Summary</h4>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    <span>Model</span>
                                    <span>Qty</span>
                                </div>
                                <div>
                                    {summaryEntries.map(([model, count], index) => (
                                        <div
                                            key={model}
                                            className={`grid grid-cols-[1fr_auto] items-center px-3 py-2.5 text-[11px] font-bold ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                        >
                                            <span className="truncate text-slate-700">{model}</span>
                                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-900 font-mono text-[10px]">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total batteries</span>
                                    <span className="text-xl font-black text-slate-900 mono">{stagedItems.length}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmBatch}
                                disabled={isActionLoading}
                                className={`w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-sm ${isActionLoading
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 hover:bg-black text-white active:scale-95'
                                    }`}
                            >
                                {isActionLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} />
                                        <span>Processing</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={14} />
                                        <span>Confirm</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
