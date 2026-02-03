
import React from 'react';
import { createPortal } from 'react-dom';
import { Battery, Replacement, Dealer, BatteryStatus } from '../types';
import { formatDate } from '../utils';
import { Printer, Calendar, ShieldCheck, History, Store, User, Zap, AlertTriangle, ArrowRightLeft, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from './ui/button';

interface BatteryReportSheetProps {
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    dealers: Dealer[];
    saleDate?: string;
    onPrint?: () => void;
}

// 1. Separate the content component to be reused
const BatteryReportTemplate: React.FC<{
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    dealers: Dealer[];
    reportDate: string;
    isExpired: boolean;
    originalBattery: Battery;
    effectiveSaleDate?: string;
    mode: 'view' | 'print';
}> = ({ battery, lineage, replacements, dealers, reportDate, isExpired, originalBattery, effectiveSaleDate, mode }) => {

    // Conditional classes based on mode
    const containerClasses = mode === 'print'
        ? "bg-white w-full max-w-[210mm] relative overflow-visible flex flex-col print-container" // Print: Visible overflow, natural height
        : "bg-white w-full h-full relative overflow-y-auto flex flex-col"; // View: Full width/height, scrollable

    const headerClasses = mode === 'print'
        ? "bg-slate-900 text-white p-6 border-b-4 border-amber-500 relative shrink-0 print-header"
        : "bg-slate-900 text-white p-6 border-b-4 border-amber-500 relative shrink-0";

    const decorClasses = mode === 'print' ? "print-no-decor hidden" : "absolute";

    return (
        <div id={mode === 'print' ? 'report-printable' : undefined} className={containerClasses}>
            {/* Header */}
            <div className={headerClasses}>
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-500 rounded-lg text-slate-900 shadow-lg shadow-amber-500/20">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Starline Batteries</h1>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Battery History Report</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Serial Number</p>
                        <p className="text-2xl font-black mono text-emerald-400 tracking-tight leading-none">{battery.id}</p>
                    </div>
                </div>

                {/* Abstract Background Decoration */}
                <div className={`${decorClasses} -right-6 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl`}></div>
                <div className={`${decorClasses} -left-6 -bottom-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl`}></div>
            </div>


            {/* Content Body */}
            <div className="p-8 flex-1">

                {/* Report Meta */}
                <div className="flex justify-between items-end border-b border-slate-100 pb-6 mb-8">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Model Specification</p>
                            <p className="font-bold text-slate-900">{battery.model} ({battery.capacity})</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Generated On</p>
                            <p className="font-bold text-slate-900">{reportDate}</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${isExpired ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                        {isExpired ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
                        <span className="text-[10px] font-black uppercase tracking-wider">
                            {isExpired ? 'Warranty Expired' : 'Active Warranty'}
                        </span>
                    </div>
                </div>


                {/* Timeline */}
                <div className="relative border-l-2 border-slate-200 ml-2 space-y-8 pl-8">

                    {/* Step 1: Dispatched to Dealer */}
                    <div className="relative print-break-avoid break-inside-avoid">
                        <div className="absolute -left-[41px] top-1 p-1 bg-white border-4 border-slate-200 rounded-full text-slate-400">
                            <Store size={14} />
                        </div>
                        <div className="mb-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Sent to Shop</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Date</p>
                                <p className="font-bold text-slate-800 text-xs">{formatDate(originalBattery?.manufactureDate)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Shop Name</p>
                                <p className="font-bold text-slate-800 text-xs truncate">{dealers.find(d => d.id === originalBattery?.dealerId)?.name || 'Unknown'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Sold to Customer */}
                    <div className="relative print-break-avoid break-inside-avoid">
                        <div className="absolute -left-[41px] top-1 p-1 bg-white border-4 border-blue-100 rounded-full text-blue-500">
                            <User size={14} />
                        </div>
                        <div className="mb-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Sold to Customer</h4>
                        </div>

                        <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-bold text-blue-400 uppercase">Sale Date</p>
                                    <p className="font-bold text-slate-900 text-sm">{formatDate(effectiveSaleDate)}</p>
                                </div>
                                {battery.customerName && (
                                    <div>
                                        <p className="text-[9px] font-bold text-blue-400 uppercase">Customer Name</p>
                                        <p className="font-bold text-slate-700 uppercase text-xs truncate">{battery.customerName}</p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 pt-2 border-t border-blue-100 flex justify-between items-center text-red-600/70">
                                <p className="text-[9px] font-bold uppercase">Expiry Date</p>
                                <p className="font-mono font-bold text-xs">{formatDate(battery.warrantyExpiry)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Replacements (if any) */}
                    {replacements.map((rep, idx) => (
                        <div key={rep.id} className="relative print-break-avoid break-inside-avoid">
                            <div className="absolute -left-[41px] top-1 p-1 bg-white border-4 border-amber-100 rounded-full text-amber-500">
                                <ArrowRightLeft size={14} />
                            </div>
                            <div className="mb-1">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Exchange #{idx + 1}</h4>
                            </div>

                            <div className="bg-amber-50/30 p-3 rounded-lg border border-amber-100 space-y-3">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-[9px] font-bold text-amber-500 uppercase">Exchange Date</p>
                                        <p className="font-bold text-slate-900 text-xs">{formatDate(rep.replacementDate)}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-bold text-amber-700 uppercase">{rep.reason}</span>
                                        {rep.settlementType === 'DIRECT' ? (
                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-white text-slate-900 uppercase tracking-wider border border-slate-300 shadow-sm">
                                                GIVEN BY FACTORY
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-white text-amber-700 uppercase tracking-wider border border-amber-200 shadow-sm">
                                                GIVEN BY DEALER
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-amber-100/60 shadow-sm">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">OLD BATTERY</span>
                                        <span className="font-mono text-lg text-rose-500 font-bold decoration-2 opacity-75">{rep.oldBatteryId}</span>
                                    </div>
                                    <div className="flex-1 flex justify-center">
                                        <ArrowRightLeft size={20} className="text-slate-300" />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">NEW BATTERY</span>
                                        <span className="font-mono text-lg text-emerald-600 font-black tracking-tight">{rep.newBatteryId}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-amber-200/50 bg-white/50 rounded-lg p-2">
                                    <p className="text-[9px] font-black text-amber-600 uppercase mb-2">Exchange Info</p>

                                    {rep.settlementType === 'DIRECT' ? (
                                        <div className="flex items-center gap-2 text-emerald-700">
                                            <CheckCircle2 size={12} />
                                            <span className="text-[10px] font-bold">Handled directly by Factory (Stock) on {formatDate(rep.replacementDate)}</span>
                                        </div>
                                    ) : rep.replenishmentBatteryId ? (
                                        <div className="flex items-center gap-2 text-indigo-700">
                                            <CheckCircle2 size={12} />
                                            <span className="text-[10px] font-bold">Factory sent unit <span className="font-mono bg-indigo-50 px-1 rounded">{rep.replenishmentBatteryId}</span> to Shop on {formatDate(rep.settlementDate || rep.replacementDate)}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {rep.paidInAccount ? (
                                                <div className="flex items-center gap-2 text-emerald-700">
                                                    <CreditCard size={12} />
                                                    <span className="text-[10px] font-bold">Factory added credit to Shop's account on {formatDate(rep.settlementDate || rep.replacementDate)}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-rose-600">
                                                    <CreditCard size={12} />
                                                    <span className="text-[10px] font-bold">Pending Payment/Credit to Shop</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="mt-auto pt-16 text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Starline Batteries
                    </p>
                    <div className="h-1 w-8 bg-slate-200 mx-auto mt-2 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};


const BatteryReportSheet: React.FC<BatteryReportSheetProps> = ({ battery, lineage, replacements, dealers, saleDate, onPrint }) => {
    const isExpired = battery.warrantyExpiry ? new Date() > new Date(battery.warrantyExpiry) : false;
    const originalBattery = lineage.find(b => b.status === BatteryStatus.MANUFACTURED) || lineage[0];
    const effectiveSaleDate = battery.actualSaleDate || originalBattery?.actualSaleDate || saleDate || originalBattery?.activationDate;
    const reportDate = formatDate(new Date());

    // Sort replacements topologically based on lineage order (A -> B -> C)
    const sortedReplacements = [...replacements].sort((a, b) => {
        const idxA = lineage.findIndex(l => l.id === a.oldBatteryId);
        const idxB = lineage.findIndex(l => l.id === b.oldBatteryId);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = `${battery.id}_report`;
        window.print();
        document.title = originalTitle;
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 font-sans relative">
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 12mm;
                        }
                        
                        /* HIDE EVERYTHING ELSE */
                        body > *:not(#print-portal-root) {
                            display: none !important;
                        }

                        /* Reset Body for Print */
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            height: auto !important;
                            overflow: visible !important;
                        }

                        /* Ensure Portal is Visible and positioned correctly */
                        #print-portal-root {
                            display: block !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            z-index: 9999 !important;
                            background-color: white !important;
                        }

                        /* Force white background on the report container */
                        #report-printable {
                            background-color: white !important;
                            box-shadow: none !important;
                            border: none !important;
                            width: 100% !important;
                            max-width: none !important; /* Allow full width */
                            min-height: 0 !important;
                            height: auto !important;
                            overflow: visible !important;
                            margin: 0 auto !important;
                        }
                        
                        /* Explicit print styles for the content */
                        .print-header {
                            background-color: #0f172a !important;
                            color: #ffffff !important;
                            border-bottom: 4px solid #f59e0b !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .print-header * {
                            color: #ffffff !important;
                        }

                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .print-break-avoid {
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                    }
                    
                    /* Hide Print Portal on Screen */
                    #print-portal-root {
                        display: none;
                    }
                `}
            </style>

            {/* View Mode (Interactive, inside Sheet) */}
            <div className="flex-1 overflow-hidden flex flex-col relative h-full">
                <BatteryReportTemplate
                    mode="view"
                    battery={battery}
                    lineage={lineage}
                    replacements={sortedReplacements}
                    dealers={dealers}
                    reportDate={reportDate}
                    isExpired={isExpired}
                    originalBattery={originalBattery}
                    effectiveSaleDate={effectiveSaleDate}
                />
            </div>

            {/* Print Mode (Detached Portal) */}
            {createPortal(
                <div id="print-portal-root">
                    <BatteryReportTemplate
                        mode="print"
                        battery={battery}
                        lineage={lineage}
                        replacements={sortedReplacements}
                        dealers={dealers}
                        reportDate={reportDate}
                        isExpired={isExpired}
                        originalBattery={originalBattery}
                        effectiveSaleDate={effectiveSaleDate}
                    />
                </div>,
                document.body
            )}

            {/* Floating Action Button */}
            <div className="absolute bottom-6 right-6 z-20 print:hidden">
                <Button onClick={handlePrint} className="h-14 w-14 rounded-full bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center">
                    <Printer size={24} />
                </Button>
            </div>
        </div>
    );
};

export default BatteryReportSheet;
