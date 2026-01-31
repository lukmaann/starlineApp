
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
        ? "bg-white w-full max-w-[210mm] min-h-[297mm] relative overflow-hidden flex flex-col print-container" // Print styles
        : "bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative overflow-hidden flex flex-col"; // View styles

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
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Official Lifecycle Report</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Serial Identity</p>
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
                            {isExpired ? 'Warranty Expired' : 'Active Coverage'}
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
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Dispatched to Dealer</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Date</p>
                                <p className="font-bold text-slate-800 text-xs">{formatDate(originalBattery?.manufactureDate)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Authorized Partner</p>
                                <p className="font-bold text-slate-800 text-xs truncate">{dealers.find(d => d.id === battery.dealerId)?.name || 'Unknown'}</p>
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

                        <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 print:bg-[#eff6ff] print:border-[#eff6ff]">
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
                            <div className="mt-3 pt-2 border-t border-blue-100 flex justify-between items-center text-blue-600/70">
                                <p className="text-[9px] font-bold uppercase">Warranty Valid Until</p>
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
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Warranty Exchange #{idx + 1}</h4>
                            </div>

                            <div className="bg-amber-50/30 p-3 rounded-lg border border-amber-100 space-y-3 print:bg-[#fff7ed] print:border-[#fff7ed]">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[9px] font-bold text-amber-500 uppercase">Exchange Date</p>
                                        <p className="font-bold text-slate-900 text-xs">{formatDate(rep.replacementDate)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-amber-500 uppercase">Reason</p>
                                        <span className="text-[10px] font-bold text-amber-700 uppercase">{rep.reason}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] bg-white p-2 rounded border border-amber-100/50">
                                    <span className="font-mono text-lg text-rose-500 font-bold decoration-2 opacity-75">{rep.oldBatteryId}</span>
                                    <span className="text-slate-300 transform scale-150">→</span>
                                    <span className="font-mono text-lg text-emerald-600 font-black tracking-tight">{rep.newBatteryId}</span>
                                </div>

                                <div className="pt-2 border-t border-amber-200/30">
                                    <p className="text-[9px] font-bold text-amber-500 uppercase mb-1">Settlement Details</p>

                                    {rep.replenishmentBatteryId ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100 print:bg-indigo-50">
                                                <CheckCircle2 size={10} />
                                                <span className="text-[9px] font-bold uppercase">Replaced with New Battery to Dealer</span>
                                            </div>
                                            <p className="text-[9px] font-mono text-indigo-600 pl-1">
                                                New Unit ID: <span className="font-bold">{rep.replenishmentBatteryId}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${rep.paidInAccount ? 'text-emerald-700 bg-emerald-50/50 border-emerald-100 print:bg-emerald-50' : 'text-rose-700 bg-rose-50/50 border-rose-100 print:bg-rose-50'}`}>
                                                <CreditCard size={10} />
                                                <span className="text-[9px] font-bold uppercase">Financial Settlement</span>
                                            </div>
                                            <p className={`text-[9px] font-mono pl-1 ${rep.paidInAccount ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                Paid in Account: <span className="font-bold border-b-2 border-current">{rep.paidInAccount ? 'YES' : 'NO'}</span>
                                            </p>
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
                        Starline Power Architectures • Service Division
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
    const effectiveSaleDate = saleDate || originalBattery?.activationDate;
    const reportDate = formatDate(new Date());

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
                        
                        body {
                            margin: 0;
                            background: white;
                        }

                        /* 
                            CRITICAL ARCHITECTURAL FIX:
                            Hide the ENTIRE React App Root.
                            Only show the Portal content which is outside App Root.
                        */
                        #root, .app-root, [role="dialog"], [data-radix-portal] {
                            display: none !important;
                        }

                        /* Reset body visibility to ensure Portal is visible */
                        body {
                            visibility: visible !important;
                            overflow: visible !important;
                            height: auto !important;
                        }

                        /* Target the Portal Print Container directly */
                        #print-portal-root {
                            display: block !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            z-index: 99999 !important;
                            visibility: visible !important;
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-start justify-center">
                <BatteryReportTemplate
                    mode="view"
                    battery={battery}
                    lineage={lineage}
                    replacements={replacements}
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
                        replacements={replacements}
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
