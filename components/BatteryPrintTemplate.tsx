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
    const safeDealerName = dealerName || 'Unknown Dealer';
    const safeDealerId = dealerId || 'N/A';
    const safeReportDate = formatDate(date || new Date());
    const normalizedData = Array.isArray(data) ? data : [];
    const renderEmptyState = normalizedData.length === 0;

    const renderTableHeader = () => {
        if (tableType === 'EXCHANGES') {
            return (
                <tr>
                    <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider text-center w-[8%]">No.</th>
                    <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[16%]">Old Unit</th>
                    <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider text-center w-[16%]">Dates</th>
                    <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[14%]">Replacement</th>
                    <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[16%]">New Unit</th>
                    <th className="py-2 px-2 border border-gray-300 font-extrabold uppercase tracking-wider w-[30%]">Settlement details</th>
                </tr>
            );
        }

        if (tableType === 'BATCH') {
            return (
                <tr>
                    <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 text-center w-[10%]">No.</th>
                    <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 w-[35%]">Battery Serial Number</th>
                    <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 w-[25%]">Battery Model</th>
                    <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-gray-700 text-right w-[30%]">Sent to Dealer</th>
                </tr>
            );
        }

        return (
            <tr>
                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-center w-[10%]">No.</th>
                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider w-[40%]">Serial Number</th>
                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider w-[22%]">Battery Model</th>
                <th className="py-2 px-3 border border-gray-300 font-extrabold uppercase tracking-wider text-right w-[28%]">Sold to Dealer</th>
            </tr>
        );
    };

    const renderTableRow = (item: any, idx: number) => {
        const rowNumber = idx + 1;

        if (tableType === 'EXCHANGES') {
            return (
                <tr key={`${item?.oldBatteryId || 'exchange'}-${idx}`} className="avoid-break">
                    <td className="py-1.5 px-2 border border-gray-300 align-top text-center font-black text-[9px] text-black">{rowNumber}</td>
                    <td className="py-1.5 px-2 border border-gray-300 align-top">
                        <div className="font-bold text-black text-[10px] break-all">{item?.oldBatteryId || 'N/A'}</div>
                        <div className="text-[8px] text-gray-600 uppercase font-semibold tracking-wide break-words">{item?.batteryModel || 'Unknown Model'}</div>
                    </td>
                    <td className="py-1.5 px-2 border border-gray-300 align-top text-center leading-tight">
                        <div className="font-bold">Sent: {formatDate(item?.sentDate)}</div>
                        <div className="text-[8px] text-gray-500 font-medium">Sold: {formatDate(item?.soldDate)}</div>
                    </td>
                    <td className="py-1.5 px-2 border border-gray-300 align-top font-bold">
                        {formatDate(item?.replacementDate)}
                    </td>
                    <td className="py-1.5 px-2 border border-gray-300 align-top">
                        <div className="font-bold text-black text-[10px] break-all">{item?.newBatteryId || 'N/A'}</div>
                        <div className="text-[8px] text-gray-500 uppercase font-semibold break-words">{item?.reason || 'No reason provided'}</div>
                    </td>
                    <td className="py-1.5 px-2 border border-gray-300 align-top">
                        <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-gray-800 uppercase text-[9px] break-words">
                                {item?.settlementType === 'DIRECT' ? 'Direct Swap' : item?.settlementType === 'STOCK' ? 'Stock Given' : 'Credit Note'}
                            </span>
                            {item?.replenishmentBatteryId && (
                                <span className="font-mono font-bold text-[9px] bg-gray-100 px-1 rounded border border-gray-200 break-all">{item.replenishmentBatteryId}</span>
                            )}
                        </div>
                    </td>
                </tr>
            );
        }

        if (tableType === 'BATCH') {
            return (
                <tr key={`${item?.id || 'batch'}-${idx}`} className="avoid-break">
                    <td className="py-1.5 px-3 border border-gray-300 text-center font-black text-[9px] text-black">{rowNumber}</td>
                    <td className="py-1.5 px-3 border border-gray-300 font-mono font-bold text-[9px] text-black break-all">{item?.id || 'N/A'}</td>
                    <td className="py-1.5 px-3 border border-gray-300 font-semibold text-gray-900 text-[9px] uppercase break-words">{item?.model || 'Unknown Model'}</td>
                    <td className="py-1.5 px-3 border border-gray-300 font-black text-black text-[9px] text-right">
                        {formatDate(item?.manufactureDate || date || new Date())}
                    </td>
                </tr>
            );
        }

        return (
            <tr key={`${item?.id || 'default'}-${idx}`} className="avoid-break">
                <td className="py-1.5 px-3 border border-gray-300 align-top text-center font-black text-[10px] text-black">{rowNumber}</td>
                <td className="py-1.5 px-3 border border-gray-300 align-top font-bold text-black mono text-[10px] break-all">{item?.id || 'N/A'}</td>
                <td className="py-1.5 px-3 border border-gray-300 align-top font-semibold text-gray-700 break-words">{item?.model || 'Unknown Model'}</td>
                <td className="py-1.5 px-3 border border-gray-300 align-top font-medium text-black text-right">
                    {formatDate(item?.manufactureDate)}
                </td>
            </tr>
        );
    };

    return (
        <div id="battery-printable" className="w-full max-w-[190mm] mx-auto bg-white px-[12mm] py-[10mm] font-sans text-black">
            <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .avoid-break { page-break-inside: avoid; }
          #battery-printable {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr,
          td,
          th {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
            <div className="border-b border-gray-300 pb-6 mb-6">
                <div className="mb-4">
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-1 break-words">{safeDealerName}</h1>
                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-2">Dealer ID: {safeDealerId}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {(reportType === 'batch' && !dateLabel) ? 'Batch Assignment Receipt' : reportTitle}
                    </div>
                </div>
                <div className="flex justify-between items-end gap-4">
                    <div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                            {dateLabel || (reportType === 'batch' ? 'Processed Date' : 'Report Date')}
                        </div>
                        <div className="text-sm font-bold">{safeReportDate}</div>
                    </div>
                    {dateRange && (
                        <div className="text-center">
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Date Range</div>
                            <div className="text-[10px] font-bold uppercase break-words">{dateRange}</div>
                        </div>
                    )}
                    <div className="text-right">
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Units</div>
                        <div className="text-xl font-black text-slate-900">{normalizedData.length}</div>
                    </div>
                </div>
            </div>

            <table className="w-full text-left text-[10px] text-black border-collapse border border-gray-300 mb-8">
                <thead className="bg-gray-100">
                    {renderTableHeader()}
                </thead>
                <tbody>
                    {renderEmptyState ? (
                        <tr>
                            <td
                                colSpan={tableType === 'EXCHANGES' ? 6 : 4}
                                className="py-8 px-4 border border-gray-300 text-center font-bold uppercase tracking-widest text-gray-500"
                            >
                                No records available for this report
                            </td>
                        </tr>
                    ) : (
                        normalizedData.map((item, idx) => renderTableRow(item, idx))
                    )}
                </tbody>
            </table>

            {reportType === 'batch' && (
                <div className="pt-6">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-12">Factory Stamp and Signature</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatteryPrintTemplate;
