import React from 'react';
import { formatDate } from '../utils';

interface BatteryPrintTemplateProps {
    // Dealer information
    dealerName: string;
    dealerId?: string;

    // Report metadata
    reportTitle: string;
    reportType?: 'dealer' | 'batch';
    date?: string;
    dateRange?: string;
    filterModel?: string;

    // Battery data
    data: any[];

    // Table configuration for dealer reports
    tableType?: 'ACTIVE' | 'EXPIRED' | 'EXCHANGES' | 'RETURNED' | 'BATCH';

    // Data labels
    dateLabel?: string;
}

const BatteryPrintTemplate: React.FC<BatteryPrintTemplateProps> = ({
    dealerName,
    dealerId,
    reportTitle,
    reportType = 'dealer',
    date,
    dateRange,
    filterModel,
    data,
    tableType = 'ACTIVE',
    dateLabel
}) => {
    const modelText = filterModel || 'All Models';

    return (
        <div className="w-full max-w-[210mm] mx-auto bg-white p-8 font-sans text-black">
            <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
      `}</style>

            {/* Standardized Header */}
            <div className="border-b border-gray-300 pb-6 mb-6">
                <div className="mb-4">
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-1">{dealerName}</h1>
                    {dealerId && <div className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Dealer ID: {dealerId}</div>}
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {(reportType === 'batch' && !dateLabel) ? 'Batch Assignment Receipt' : reportTitle}
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                            {dateLabel || (reportType === 'batch' ? 'Processed Date' : 'Report Date')}
                        </div>
                        <div className="text-sm font-bold">{formatDate(date || new Date())}</div>
                    </div>
                    {dateRange && (
                        <div className="text-center">
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Date Range</div>
                            <div className="text-[10px] font-bold uppercase">{dateRange}</div>
                        </div>
                    )}
                    <div className="text-right">
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Units</div>
                        <div className="text-xl font-black text-slate-900">{data.length}</div>
                    </div>
                </div>
            </div>


            {/* Table */}
            <table className="w-full text-left text-[10px] text-black border-collapse border border-gray-300 mb-8">
                <thead className="bg-gray-100">
                    <tr>
                        {tableType === 'EXCHANGES' ? (
                            <>
                                <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[18%]">Old Unit</th>
                                <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider text-center w-[18%]">Dates</th>
                                <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[14%]">Replacement</th>
                                <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[18%]">New Unit</th>
                                <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[32%]">Settlement details</th>
                            </>
                        ) : tableType === 'BATCH' ? (
                            <>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 w-[35%]">Battery Serial Number</th>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 w-[30%]">Battery Model</th>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 text-right w-[35%]">Sent to Dealer</th>
                            </>
                        ) : (
                            <>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider w-1/3">Serial Number</th>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider w-1/3">Battery Model</th>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-right w-1/3">Sold to Dealer</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => (
                        <tr key={idx} className="avoid-break">
                            {tableType === 'EXCHANGES' ? (
                                <>
                                    <td className="py-1.5 px-2 border border-gray-300 align-top">
                                        <div className="font-bold text-black text-[10px]">{item.oldBatteryId}</div>
                                        <div className="text-[8px] text-gray-600 uppercase font-semibold tracking-wide">{item.batteryModel}</div>
                                    </td>
                                    <td className="py-1.5 px-2 border border-gray-300 align-top text-center leading-tight">
                                        <div className="font-bold">Sent: {formatDate(item.sentDate)}</div>
                                        <div className="text-[8px] text-gray-500 font-medium">Sold: {formatDate(item.soldDate)}</div>
                                    </td>
                                    <td className="py-1.5 px-2 border border-gray-300 align-top font-bold">
                                        {formatDate(item.replacementDate)}
                                    </td>
                                    <td className="py-1.5 px-2 border border-gray-300 align-top">
                                        <div className="font-bold text-black text-[10px]">{item.newBatteryId}</div>
                                        <div className="text-[8px] text-gray-500 uppercase font-semibold truncate max-w-[100px]">{item.reason}</div>
                                    </td>
                                    <td className="py-1.5 px-2 border border-gray-300 align-top">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800 uppercase text-[9px]">
                                                {item.settlementType === 'DIRECT' ? 'Direct Swap' : item.settlementType === 'STOCK' ? 'Stock Given' : 'Credit Note'}
                                            </span>
                                            {item.replenishmentBatteryId && (
                                                <span className="font-mono font-bold text-[9px] bg-gray-100 px-1 rounded border border-gray-200">{item.replenishmentBatteryId}</span>
                                            )}
                                        </div>
                                    </td>
                                </>
                            ) : tableType === 'BATCH' ? (
                                <>
                                    <td className="py-1.5 px-3 border border-gray-300 font-mono font-bold text-[9px] text-black">{item.id}</td>
                                    <td className="py-1.5 px-3 border border-gray-300 font-semibold text-gray-900 text-[9px] uppercase">{item.model}</td>
                                    <td className="py-1.5 px-3 border border-gray-300 font-black text-black text-[9px] text-right">
                                        {formatDate(item.manufactureDate || new Date())}
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="py-1.5 px-3 border border-gray-300 align-top font-bold text-black mono text-[10px]">{item.id}</td>
                                    <td className="py-1.5 px-3 border border-gray-300 align-top font-semibold text-gray-700">{item.model}</td>
                                    <td className="py-1.5 px-3 border border-gray-300 align-top font-medium text-black text-right">
                                        {formatDate(item.manufactureDate)}
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            {reportType === 'batch' ? (
                <div className="flex justify-end items-end border-t border-gray-300 pt-6">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-12">Factory Stamp and Signature</div>
                    </div>
                </div>
            ) : (
                <div className="mt-4 pt-2 border-t-2 border-black flex justify-between items-end text-[8px] font-bold uppercase text-gray-400">
                    <span>Computer Generated Record</span>
                </div>
            )}
        </div>
    );
};

export default BatteryPrintTemplate;
