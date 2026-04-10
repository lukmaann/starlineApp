import React from 'react';
import { History, AlertCircle, FileText, CheckCircle2, Clock, X } from 'lucide-react';
import { formatDate } from '../../utils';
import { BatteryStatus, Dealer } from '../../types';

interface AuditHistoryTableProps {
    activeAsset: any;
    dealers: Dealer[];
    handleSearch: (id: string) => void;
    formatReference: (status: string) => string;
    getStatusBadge: (status: BatteryStatus, expired: boolean) => string;
}

export const AuditHistoryTable: React.FC<AuditHistoryTableProps> = ({
    activeAsset,
    dealers,
    handleSearch,
    formatReference,
    getStatusBadge
}) => {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                    <History size={18} className="text-slate-400" /> Asset Audit History
                </h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Protocol Segments: {activeAsset.lineage.length}
                </span>
            </div>

            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4 whitespace-nowrap">Battery ID</th>
                            <th className="px-6 py-4 whitespace-nowrap">Replaced By</th>
                            <th className="px-6 py-4 whitespace-nowrap">Dispatched to Dealer</th>
                            <th className="px-6 py-4 whitespace-nowrap">Sold to Customer</th>
                            <th className="px-6 py-4 whitespace-nowrap">Replaced On</th>
                            <th className="px-6 py-4 whitespace-nowrap">Settlement</th>
                            <th className="px-6 py-4 whitespace-nowrap">Status</th>
                            <th className="px-6 py-4 whitespace-nowrap">Outcome / Evidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {activeAsset.lineage.map((item: any, index: number) => {
                            const next = activeAsset.replacements.find((r: any) => r.oldBatteryId === item.id);
                            const incoming = activeAsset.replacements.find((r: any) => r.newBatteryId === item.id);
                            const sale = activeAsset.lineageSales?.find((s: any) => s.batteryId === item.id);
                            const isCurrent = item.id === activeAsset.battery.id;
                            const isFirst = index === 0;
                            const isLast = index === activeAsset.lineage.length - 1;

                            const itemExpired = item.warrantyExpiry ? new Date() > new Date(item.warrantyExpiry) : false;

                            // Determine when customer received this battery
                            let customerReceivedDate;
                            if (incoming) {
                                customerReceivedDate = incoming.replacementDate;
                            } else if (item.actualSaleDate) {
                                customerReceivedDate = item.actualSaleDate;
                            } else if (sale) {
                                customerReceivedDate = sale.saleDate;
                            } else {
                                customerReceivedDate = item.activationDate;
                            }

                            return (
                                <tr key={item.id} className={`${isCurrent ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-all text-xs`}>
                                    <td className="px-6 py-5 font-bold text-slate-900 mono text-sm flex items-center gap-3 whitespace-nowrap">
                                        {!isFirst && <span className="text-slate-300 mr-2">↳</span>}
                                        {item.id}
                                        {isCurrent && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                                    </td>

                                    <td className="px-6 py-5 font-bold text-blue-600 mono text-sm whitespace-nowrap cursor-pointer hover:underline" onClick={(e) => {
                                        if (next) { e.stopPropagation(); handleSearch(next.newBatteryId); }
                                    }}>
                                        {next ? (
                                            <div className="flex items-center gap-2">
                                                {next.newBatteryId}
                                                <span className="text-slate-400">→</span>
                                            </div>
                                        ) : isLast ? (
                                            <span className="text-emerald-600 font-bold text-xs uppercase">Current Unit</span>
                                        ) : '-'}
                                    </td>

                                    <td className="px-6 py-5 font-bold text-slate-500 text-xs mono whitespace-nowrap">
                                        {formatDate(item.activationDate)}
                                    </td>

                                    <td className="px-6 py-5 text-xs whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            {item.actualSaleDate && item.warrantyCalculationBase === 'ACTUAL_SALE' ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-emerald-600 mono">{formatDate(item.actualSaleDate)}</span>
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase border border-amber-200">
                                                            Corrected
                                                        </span>
                                                    </div>
                                                    <span className="text-slate-400 text-[10px] line-through">{formatDate(item.activationDate)}</span>
                                                </>
                                            ) : (
                                                <span className="font-bold text-slate-900 mono">{customerReceivedDate ? formatDate(customerReceivedDate) : '-'}</span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-5 font-bold text-slate-500 text-xs mono whitespace-nowrap">
                                        {next ? formatDate(next.replacementDate) : '-'}
                                    </td>

                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            {next ? (
                                                <>
                                                    {next.settlementType === 'DIRECT' ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                                                                <CheckCircle2 size={10} /> Direct Settlement
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-700 mono">{next.newBatteryId}</span>
                                                        </div>
                                                    ) : next.replenishmentBatteryId ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">Stock Given</span>
                                                            <span className="text-xs font-bold text-slate-700 mono">{next.replenishmentBatteryId}</span>
                                                        </div>
                                                    ) : (
                                                        <span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide flex w-fit items-center gap-1 ${next.paidInAccount ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                            {next.paidInAccount ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                            {next.paidInAccount ? 'PAID' : 'PENDING'}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (sale && !incoming) ? (
                                                <span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide flex w-fit items-center gap-1 ${sale.paidInAccount ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                    {sale.paidInAccount ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                    {sale.paidInAccount ? 'PAID' : 'PENDING'}
                                                </span>
                                            ) : <span className="text-slate-300 font-bold text-xs">-</span>}

                                            {next && (next.settlementDate || next.settlementType === 'DIRECT') && (
                                                <span className="text-[9px] font-bold text-slate-400 mono pl-1">
                                                    {formatDate(next.settlementType === 'DIRECT' ? next.replacementDate : next.settlementDate)}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide ${getStatusBadge(item.status, itemExpired)}`}>
                                            {itemExpired ? 'EXPIRED' : item.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-5 whitespace-nowrap">
                                        {next ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-bold text-amber-700 flex items-center gap-1 uppercase"><AlertCircle size={14} /> FAILED: {next.reason}</div>
                                                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase pl-5"><FileText size={10} /> Doc: {formatReference(next.warrantyCardStatus)}</div>
                                            </div>
                                        ) : item.status === BatteryStatus.ACTIVE ? (
                                            itemExpired ? (
                                                <div className="text-xs font-bold text-rose-600 flex items-center gap-1 uppercase"><X size={14} /> Warranty Expired</div>
                                            ) : (
                                                <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 size={14} /> Healthy / Active</div>
                                            )
                                        ) : <span className="text-slate-300 font-bold text-xs">-</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
