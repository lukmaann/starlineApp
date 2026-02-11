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
    tableType = 'ACTIVE'
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

            {/* Header */}
            <div className={reportType === 'batch' ? 'border-b border-gray-300 pb-6 mb-6' : 'flex border-b-2 border-black pb-4 mb-4'}>
                {reportType === 'batch' ? (
                    <>
                        {/* Batch Receipt Header */}
                        <div className="mb-4">
                            <h1 className="text-4xl font-black uppercase tracking-tight mb-1">{dealerName}</h1>
                            {dealerId && <div className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Dealer ID: {dealerId}</div>}
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Batch Assignment Receipt</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Date</div>
                                <div className="text-sm font-bold">{reportTitle}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Units</div>
                                <div className="text-xl font-black text-slate-900">{data.length}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Dealer Report Header */}
                        <div className="w-2/3 pr-4 border-r border-gray-300">
                            <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">{dealerName}</h1>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                                {dealerId && <div>Dealer ID: <span className="text-black">{dealerId}</span></div>}
                            </div>
                        </div>

                        <div className="w-1/3 pl-4 flex flex-col justify-between">
                            <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Report Type</div>
                                <div className="text-sm font-black uppercase leading-tight">{reportTitle}</div>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                {dateRange && (
                                    <div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date Range</div>
                                        <div className="text-[10px] font-bold uppercase">{dateRange}</div>
                                    </div>
                                )}
                                <div className="text-right">
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Printed</div>
                                    <div className="text-[10px] font-bold uppercase">{formatDate(new Date())}</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Summary Metrics for dealer reports */}
            {reportType === 'dealer' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex justify-between items-center">
                    <div className="flex gap-6">
                        <div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Total Batteries</span>
                            <span className="text-xl font-black leading-none">{data.length}</span>
                        </div>
                        {modelText !== 'All Models' && (
                            <div className="border-l border-gray-300 pl-6">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Filter Applied</span>
                                <span className="text-sm font-bold leading-tight uppercase">{modelText}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            <table className={reportType === 'batch'
                ? "w-full text-left text-[10px] text-black border-collapse border border-gray-300 mb-8"
                : "w-full text-left text-[9px] text-black border-collapse border border-gray-300"
            }>
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
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 w-1/2">Battery Serial Number</th>
                                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 w-1/2">Battery Model</th>
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
                                    <td className="py-1.5 px-3 border border-gray-300 font-semibold text-gray-900 text-[9px]">{item.model}</td>
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
