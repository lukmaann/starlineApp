import React from 'react';
import { X, CheckCircle2, Loader2, Trash2, Layers, FileCheck } from 'lucide-react';

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

    return (
        <div className="mt-8 border-t border-slate-200 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Staging Area */}
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-lg text-white">
                                <Layers size={18} />
                            </div>
                            <div>
                                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-tight">Staging Buffer</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stagedItems.length} Units Prepared</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setStagedItems([])}
                            className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 border border-transparent hover:border-rose-100 group"
                        >
                            <Trash2 size={14} />
                            Clear Buffer
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                                    <tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                                        <th className="px-6 py-3">Asset Serial</th>
                                        <th className="px-6 py-3">Model Type</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stagedItems.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`group transition-all duration-200 ${item.id === lastScanned ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="text-slate-900 font-mono font-bold text-sm tracking-wider">{item.id}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{item.model}</span>
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
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-3">
                            <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                <FileCheck size={18} />
                            </div>
                            <h4 className="text-slate-900 font-bold text-sm uppercase tracking-tight">Batch Summary</h4>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                {Object.entries(batchSummary).map(([model, count]) => (
                                    <div key={model} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-slate-400">{model}</span>
                                        <span className="text-slate-900 font-mono text-xs">{count}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Payload</span>
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
                                        <span>Confirm Batch</span>
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
