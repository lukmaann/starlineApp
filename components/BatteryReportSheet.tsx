
import React from 'react';
import { createPortal } from 'react-dom';
import { Battery, Replacement, Dealer, BatteryStatus } from '../types';
import { Database } from '../db';
import { formatDate } from '../utils';
import { Printer, Calendar, ShieldCheck, History, Store, User, Zap, AlertTriangle, ArrowRightLeft, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from './ui/button';

interface BatteryReportSheetProps {
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    activityLogs?: any[];
    dealers: Dealer[];
    saleDate?: string;
    onPrint?: () => void;
}

// 1. Separate the content component to be reused
const BatteryReportTemplate: React.FC<{
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    activityLogs?: any[];
    dealers: Dealer[];
    reportDate: string;
    isExpired: boolean;
    originalBattery: Battery;
    effectiveSaleDate?: string;
    mode: 'view' | 'print';
}> = ({ battery, lineage, replacements, activityLogs, dealers, reportDate, isExpired, originalBattery, effectiveSaleDate, mode }) => {

    // Conditional classes based on mode
    const containerClasses = mode === 'print'
        ? "bg-white w-full max-w-[210mm] relative overflow-visible flex flex-col print-container"
        : "bg-white w-full h-full relative overflow-x-hidden overflow-y-auto flex flex-col";

    const headerClasses = mode === 'print'
        ? "bg-slate-900 text-white px-8 py-7 border-b border-slate-800 relative shrink-0 print-header"
        : "bg-slate-900 text-white px-8 py-7 border-b border-slate-800 relative shrink-0 overflow-hidden";

    const decorClasses = mode === 'print' ? "print-no-decor hidden" : "absolute";

    return (
        <div id={mode === 'print' ? 'report-printable' : undefined} className={containerClasses}>
            {/* Header */}
            <div className={headerClasses}>
                <div className="relative z-10 flex items-start justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-blue-300">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight leading-none">Starline Batteries</h1>
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Battery History Report</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Serial Number</p>
                        <p className="text-2xl font-black mono text-blue-300 tracking-tight leading-none">{battery.id}</p>
                    </div>
                </div>

                <div className={`${decorClasses} -right-10 -top-12 h-32 w-32 rounded-full bg-white/5 blur-3xl`}></div>
            </div>


            {/* Content Body */}
            <div className="flex-1 p-8">

                {/* Report Meta */}
                <div className="mb-8 overflow-hidden rounded-xl border border-slate-300 bg-white">
                    <div className="grid grid-cols-1 divide-y divide-slate-200 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Battery model</p>
                            <p className="mt-1.5 font-semibold text-slate-900">{battery.model}</p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Capacity</p>
                            <p className="mt-1.5 font-semibold text-slate-900">{battery.capacity}</p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Current status</p>
                            <p className={`mt-1.5 font-semibold ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isExpired ? 'Expired' : (battery.status || 'Active')}
                            </p>
                        </div>
                    </div>
                </div>


                {/* Timeline */}
                <div className="relative ml-2 space-y-7 border-l-2 border-slate-300 pl-8">

                    {/* Step 1: Dispatched to Dealer */}
                    <div className="relative print-break-avoid break-inside-avoid">
                        <div className="absolute -left-[41px] top-1 rounded-full border-4 border-slate-300 bg-white p-1 text-slate-500">
                            <Store size={14} />
                        </div>
                        <div className="mb-3 flex items-center justify-between pr-2">
                            <h4 className="text-sm font-semibold text-slate-900">Sent to shop</h4>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Dispatch</span>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
                            <div className="grid grid-cols-1 divide-y divide-slate-100 text-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Date</p>
                                    <p className="mt-1.5 font-semibold text-slate-900">{formatDate(originalBattery?.manufactureDate)}</p>
                                </div>
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Shop</p>
                                    <p className="mt-1.5 truncate font-semibold text-slate-900">{dealers.find(d => d.id === originalBattery?.dealerId)?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Sold to Customer */}
                    <div className="relative print-break-avoid break-inside-avoid">
                        <div className="absolute -left-[41px] top-1 rounded-full border-4 border-blue-200 bg-white p-1 text-blue-500">
                            <User size={14} />
                        </div>
                        <div className="mb-3 flex items-center justify-between pr-2">
                            <h4 className="text-sm font-semibold text-slate-900">Sold to customer</h4>
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">Sale</span>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
                            <div className="grid grid-cols-1 divide-y divide-slate-100 text-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Sale date</p>
                                    <p className="mt-1.5 font-semibold text-slate-900">{formatDate(effectiveSaleDate)}</p>
                                </div>
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Expiry date</p>
                                    <p className="mt-1.5 font-semibold text-rose-600">{formatDate(battery.warrantyExpiry)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Inspections (Multiple Sessions) */}
                    {(() => {
                        // Group activity logs into assessment sessions
                        const sessions: any[] = [];

                        if (activityLogs && activityLogs.length > 0) {
                            const sortedLogs = [...activityLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                            let currentSession: any = null;

                            sortedLogs.forEach(log => {
                                let meta: any = {};
                                try {
                                    meta = log.metadata ? JSON.parse(log.metadata) : {};
                                } catch (e) {
                                    console.error('Failed to parse log metadata:', e);
                                }

                                if (log.type === 'BATTERY_INSPECTION_START') {
                                    if (currentSession) sessions.push(currentSession);
                                    currentSession = {
                                        batteryId: meta.id,
                                        startDate: meta.startDate,
                                        status: 'IN_PROGRESS',
                                        notes: meta.notes,
                                        timestamp: log.timestamp
                                    };
                                } else if (log.type === 'BATTERY_INSPECTION_COMPLETE') {
                                    if (currentSession && currentSession.batteryId === meta.id) {
                                        currentSession.completionDate = meta.completionDate;
                                        currentSession.status = meta.status;
                                        currentSession.returnDate = meta.returnDate;
                                        currentSession.notes = meta.notes;
                                        sessions.push(currentSession);
                                        currentSession = null;
                                    } else {
                                        // Orphaned completion log
                                        sessions.push({
                                            batteryId: meta.id,
                                            completionDate: meta.completionDate,
                                            status: meta.status,
                                            returnDate: meta.returnDate,
                                            notes: meta.notes,
                                            timestamp: log.timestamp
                                        });
                                    }
                                }
                            });
                            if (currentSession) sessions.push(currentSession);
                        }

                        // Fallback: If no logs but battery has status, add the current one
                        if (sessions.length === 0 && battery.inspectionStatus && battery.inspectionStatus !== 'PENDING') {
                            sessions.push({
                                batteryId: battery.id,
                                startDate: battery.inspectionStartDate,
                                completionDate: battery.inspectionDate,
                                status: battery.inspectionStatus,
                                returnDate: battery.inspectionReturnDate,
                                notes: battery.inspectionNotes
                            });
                        }

                        return sessions.map((session, sidx) => (
                            <div key={sidx} className="relative print-break-avoid break-inside-avoid">
                                <div className={`absolute -left-[41px] top-1 rounded-full border-4 bg-white p-1 ${session.status === 'FAULTY' ? 'border-rose-200 text-rose-500' :
                                    session.status === 'GOOD' ? 'border-emerald-200 text-emerald-500' :
                                        'border-amber-200 text-amber-500 animate-pulse'
                                    }`}>
                                    <ShieldCheck size={14} />
                                </div>
                                <div className="mb-3 flex items-center justify-between pr-2">
                                    <h4 className="text-sm font-semibold text-slate-900">
                                        Technical Assessment {sessions.length > 1 ? `#${sidx + 1}` : ''}
                                    </h4>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${session.status === 'FAULTY' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                                        session.status === 'GOOD' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                            'border-amber-200 bg-amber-50 text-amber-700'
                                        }`}>
                                        {session.status === 'IN_PROGRESS' ? 'Checking' : session.status}
                                    </span>
                                </div>

                                    <div className={`space-y-3 rounded-xl border bg-white px-4 py-4 ${session.status === 'FAULTY' ? 'border-rose-200' :
                                    session.status === 'GOOD' ? 'border-emerald-200 bg-emerald-50/30' :
                                        'border-amber-200'
                                    }`}>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Unit serial</p>
                                            <p className="mt-1.5 font-mono text-xs font-semibold text-slate-800">{session.batteryId}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Outcome</p>
                                            <p className={`mt-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${session.status === 'FAULTY' ? 'text-rose-600' :
                                                session.status === 'GOOD' ? 'text-emerald-600' :
                                                    'text-amber-600'
                                                }`}>
                                                {session.status === 'IN_PROGRESS' ? 'Assessing Unit...' : session.status}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Started on</p>
                                            <p className="mt-1.5 text-xs font-semibold text-slate-800">{formatDate(session.startDate) || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {(session.completionDate || session.returnDate) && (
                                        <div className={`mt-1 flex items-center justify-between border-t pt-3 ${session.status === 'FAULTY' ? 'border-rose-200' : 'border-slate-200'}`}>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                                {session.status === 'GOOD' ? 'Returned to Shop' : 'Verification Date'}
                                            </p>
                                            <p className="text-xs font-semibold text-slate-800">
                                                {formatDate(session.status === 'GOOD' ? session.returnDate : session.completionDate)}
                                            </p>
                                        </div>
                                    )}

                                    {session.notes && (
                                        <div className="mt-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Technician notes</p>
                                            <p className="text-xs font-medium leading-relaxed text-slate-600">
                                                {session.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ));
                    })()}

                    {/* Step 4: Replacements (if any) */}
                    {replacements.map((rep, idx) => (
                        <div key={rep.id} className="relative print-break-avoid break-inside-avoid">
                            <div className="absolute -left-[41px] top-1 rounded-full border-4 border-amber-200 bg-white p-1 text-amber-500">
                                <ArrowRightLeft size={14} />
                            </div>
                            <div className="mb-3 pr-2">
                                <h4 className="text-sm font-semibold text-slate-900">Exchange #{idx + 1}</h4>
                            </div>

                            <div className="space-y-3 rounded-xl border border-amber-200 bg-white px-4 py-4">
                                <div className="mb-1 flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Exchange date</p>
                                        <p className="mt-1.5 text-xs font-semibold text-slate-900">{formatDate(rep.replacementDate)}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">{rep.reason}</span>
                                        {rep.settlementType === 'DIRECT' ? (
                                            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                                                GIVEN BY FACTORY
                                            </span>
                                        ) : (
                                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                                GIVEN BY DEALER
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 rounded-xl border border-slate-300 bg-slate-50 px-4 py-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Old battery</span>
                                        <span className="font-mono text-base font-semibold text-rose-500">{rep.oldBatteryId}</span>
                                    </div>
                                    <div className="flex-1 flex justify-center">
                                        <ArrowRightLeft size={20} className="text-slate-300" />
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">New battery</span>
                                        <span className="font-mono text-base font-semibold tracking-tight text-emerald-600">{rep.newBatteryId}</span>
                                    </div>
                                </div>
                                <div className="mt-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Exchange info</p>

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
                                                    <span className="text-[10px] font-bold">Paid in account on {formatDate(rep.settlementDate || rep.replacementDate)}</span>
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
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Starline Batteries
                    </p>
                    <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200"></div>
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
        Database.logActivity('PRINT_REPORT', `Printed battery report for ${battery.id}`, { batteryId: battery.id });
        window.print();
        document.title = originalTitle;
    };

    return (
        <div className="relative flex h-full flex-col bg-slate-50 font-sans">
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
            <div className="relative flex h-full flex-1 flex-col overflow-hidden rounded-none">
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
                <Button onClick={handlePrint} className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/20 transition-all hover:bg-black active:scale-95">
                    <Printer size={24} />
                </Button>
            </div>
        </div>
    );
};

export default BatteryReportSheet;
