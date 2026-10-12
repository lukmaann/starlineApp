import React from 'react';
import { createPortal } from 'react-dom';
import { Battery, Replacement, Dealer, BatteryStatus, Sale } from '../types';
import { Database } from '../db';
import { AuthSession } from '../utils/AuthSession';
import { WarrantyCalculator } from '../utils/warrantyCalculator';
import { formatDate } from '../utils';
import { Printer, Store, User, Zap, ArrowRightLeft, CheckCircle2, CreditCard } from 'lucide-react';
import { Button } from './ui/button';

interface BatteryReportSheetProps {
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    activityLogs?: any[];
    lineageSales?: Sale[];
    dealers: Dealer[];
    saleDate?: string;
    onPrint?: () => void;
}

// 1. Separate the content component to be reused
const BatteryReportTemplate: React.FC<{
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    lineageSales?: Sale[];
    dealers: Dealer[];
    reportDate: string;
    isExpired: boolean;
    originalBattery: Battery;
    effectiveSaleDate?: string;
    mode: 'view' | 'print';
}> = ({ battery, lineage, replacements, lineageSales = [], dealers, reportDate, isExpired, originalBattery, effectiveSaleDate, mode }) => {
    // Centralized Warranty Logic
    const warrantyResult = React.useMemo(() => WarrantyCalculator.calculate(battery), [battery]);
    const lifecycleStartDate = warrantyResult.effectiveStartDate;
    const lifecycleExpiryDate = warrantyResult.effectiveExpiryDate;

    // Derived flags for UI
    const isReplacement = !!battery.previousBatteryId;
    const sentToShopDate = (isReplacement && originalBattery && originalBattery.id !== battery.id) 
        ? originalBattery.activationDate 
        : battery.activationDate;
    const showSoldToCustomer = !!battery.activationDate && !!effectiveSaleDate;
    const shopDealer = dealers.find(d => d.id === (originalBattery?.dealerId || battery.dealerId));
    const shopName = shopDealer?.name || 'Shop not recorded';
    const lineageRows = lineage.length ? lineage : [battery];
    const saleForBattery = (item: Battery) => item.actualSaleDate || lineageSales.find(sale => sale.batteryId === item.id && sale.customerPhone !== 'STOCK')?.saleDate || (item.id === battery.id ? effectiveSaleDate : undefined);
    const replacementByBattery = new Map(replacements.map(item => [item.oldBatteryId, item]));

    // Conditional classes based on mode
    const containerClasses = mode === 'print'
        ? "bg-white w-full max-w-[210mm] relative overflow-visible flex flex-col print-container"
        : "bg-white w-full h-full relative overflow-x-hidden overflow-y-auto flex flex-col";

    const headerClasses = mode === 'print'
        ? "bg-slate-900 text-white px-8 py-7 border-b border-slate-800 relative shrink-0 print-header"
        : "bg-slate-900 text-white px-8 py-7 border-b border-slate-800 relative shrink-0 overflow-hidden";

    const decorClasses = mode === 'print' ? "print-no-decor hidden" : "absolute";

    if (mode === 'print') {
        return (
            <article id="report-printable" className="battery-history-print">
                <style>{`
                    .battery-history-print { color: #172033; font: 10px/1.4 Arial, Helvetica, sans-serif; display: flex; flex-direction: column; }
                    .battery-history-print * { box-sizing: border-box; }
                    .battery-history-print .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                    .battery-history-print .report-table th { background: #eef3f9; color: #53647d; font-size: 8px; font-weight: 700; letter-spacing: .07em; text-align: left; text-transform: uppercase; }
                    .battery-history-print .report-table th, .battery-history-print .report-table td { border: 1px solid #d8e0eb; padding: 7px 8px; vertical-align: top; overflow-wrap: anywhere; }
                    .battery-history-print .report-table tbody tr:nth-child(even) { background: #f8fafc; }
                    .battery-history-print .section-title { color: #172033; font-size: 11px; font-weight: 700; margin: 0 0 7px; }
                    .battery-history-print .muted { color: #64748b; }
                    .battery-history-print .avoid-row { break-inside: avoid; page-break-inside: avoid; }
                    .battery-history-print .report-footer { position: static; margin-top: auto; padding: 5px 0 0; border-top: 1px solid #d8e0eb; background: white; break-inside: avoid; page-break-inside: avoid; }
                    @media print {
                        @page { size: A4 portrait; margin: 12mm; }
                        html, body { width: auto !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: white !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        #print-portal-root { display: block !important; position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; height: auto !important; background: white !important; }
                        #report-printable { width: 100% !important; min-height: 273mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
                        .battery-history-print .report-section { break-inside: auto; page-break-inside: auto; }
                        .battery-history-print .report-table thead { display: table-header-group; }
                        .battery-history-print .report-table tr { break-inside: avoid; page-break-inside: avoid; }
                    }
                `}</style>

                <header style={{ borderBottom: '1px solid #172033', paddingBottom: '9px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div>
                            <div style={{ color: '#b45309', fontSize: '9px', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase' }}>Starline Batteries</div>
                            <h1 style={{ margin: '4px 0 2px', fontSize: '21px', lineHeight: 1.15, letterSpacing: '-.02em' }}>Battery Asset History</h1>
                            <div className="muted" style={{ fontSize: '8px' }}>Battery asset history report</div>
                        </div>
                        <div style={{ minWidth: '145px', textAlign: 'right' }}>
                            <div className="muted" style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Serial number</div>
                            <div style={{ marginTop: '3px', fontSize: '17px', fontWeight: 800, fontFamily: 'monospace' }}>{battery.id}</div>
                        </div>
                    </div>
                </header>

                <section className="report-section" style={{ marginBottom: '11px' }}>
                    <h2 className="section-title" style={{ textTransform: 'uppercase', fontSize: '9px', letterSpacing: '.04em' }}>Receipt details</h2>
                    <table className="report-table">
                        <thead><tr>
                            <th style={{ width: '25%' }}>Shop</th>
                            <th style={{ width: '25%' }}>Processed date</th>
                            <th style={{ width: '25%' }}>Battery model</th>
                            <th style={{ width: '25%' }}>Capacity</th>
                        </tr></thead>
                        <tbody><tr>
                            <td>{shopName}{shopDealer?.location ? <div className="muted" style={{ fontSize: '8px' }}>{shopDealer.location}</div> : null}</td>
                            <td>{formatDate(effectiveSaleDate) || 'Not recorded'}</td>
                            <td>{battery.model || 'Not recorded'}</td>
                            <td>{battery.capacity || 'Not recorded'}</td>
                        </tr></tbody>
                    </table>
                </section>

                <section className="report-section" style={{ marginBottom: '11px' }}>
                    <h2 className="section-title">Battery movement &amp; replacement history</h2>
                    <table className="report-table">
                        <thead><tr>
                            <th style={{ width: '24%' }}>Battery ID</th>
                            <th style={{ width: '15%' }}>Sent to dealer</th>
                            <th style={{ width: '15%' }}>Sold to customer</th>
                            <th style={{ width: '14%' }}>Replaced on</th>
                            <th style={{ width: '32%' }}>Outcome / evidence</th>
                        </tr></thead>
                        <tbody>
                            {lineageRows.map((unit, index) => {
                                const exchange = replacementByBattery.get(unit.id);
                                const isCurrent = unit.id === battery.id;
                                const failureReason = exchange?.reason ? exchange.reason.toLowerCase() : 'reason not recorded';
                                const outcome = isCurrent ? 'Current unit' : exchange ? `Failed: ${failureReason}` : String(unit.status || 'History recorded').replaceAll('_', ' ');
                                return <tr className="avoid-row" key={`${unit.id}-${index}`}>
                                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{unit.id}{isCurrent ? ' (current)' : ''}</td>
                                    <td>{formatDate(unit.activationDate)}</td>
                                    <td>{formatDate(saleForBattery(unit))}</td>
                                    <td>{exchange ? formatDate(exchange.replacementDate) : '—'}</td>
                                    <td><div style={{ fontWeight: exchange ? 700 : 500 }}>{outcome}</div>{exchange ? <div className="muted" style={{ marginTop: '2px', fontSize: '8px' }}>Replacement given by {exchange.settlementType === 'DIRECT' ? 'factory' : 'dealer'}</div> : null}{exchange?.problemDescription ? <div className="muted" style={{ marginTop: '2px', fontSize: '8px' }}>Notes: {exchange.problemDescription}</div> : null}</td>
                                </tr>;
                            })}
                        </tbody>
                    </table>
                </section>

                <section className="report-section" style={{ marginBottom: '0' }}>
                    <h2 className="section-title">Replacement transactions</h2>
                    <table className="report-table">
                        <thead><tr><th style={{ width: '36%' }}>Battery exchange</th><th style={{ width: '18%' }}>Replaced on</th><th style={{ width: '18%' }}>Given by</th><th style={{ width: '28%' }}>Settlement / evidence</th></tr></thead>
                        <tbody>
                            {replacements.length ? replacements.map((rep, index) => {
                                const givenBy = rep.settlementType === 'DIRECT' ? 'Factory' : 'Dealer';
                                const settlement = rep.settlementType === 'DIRECT' ? 'Direct factory exchange' : rep.settlementType === 'STOCK' ? `Dealer stock${rep.replenishmentBatteryId ? ` · ${rep.replenishmentBatteryId}` : ''}` : `${rep.paidInAccount ? 'Credit settled' : 'Credit pending'}${rep.settlementDate ? ` · ${formatDate(rep.settlementDate)}` : ''}`;
                                return <tr className="avoid-row" key={`${rep.id}-${index}`}>
                                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{rep.oldBatteryId}</span><span className="muted"> → </span><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{rep.newBatteryId}</span></td>
                                    <td>{formatDate(rep.replacementDate)}</td><td>{givenBy}</td><td>{settlement}</td>
                                </tr>;
                            }) : <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>No replacement transactions recorded.</td></tr>}
                        </tbody>
                    </table>
                </section>

                <footer className="report-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d8e0eb', marginTop: '10px', paddingTop: '5px', color: '#64748b', fontSize: '7px', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    <span>Starline Batteries · Battery Asset History</span><span>Generated {reportDate}</span>
                </footer>
            </article>
        );
    }

    return (
        <div className={containerClasses}>
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
                                    <p className="mt-1.5 font-semibold text-slate-900">{formatDate(sentToShopDate)}</p>
                                </div>
                                <div className="px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Shop</p>
                                    <p className="mt-1.5 truncate font-semibold text-slate-900">{dealers.find(d => d.id === originalBattery?.dealerId)?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>



                    {showSoldToCustomer && (
                        <div className="relative print-break-avoid break-inside-avoid">
                            <div className="absolute -left-[41px] top-1 rounded-full border-4 border-blue-200 bg-white p-1 text-blue-500">
                                <User size={14} />
                            </div>
                            <div className="mb-3 flex items-center justify-between pr-2">
                                <h4 className="text-sm font-semibold text-slate-900">Sold to customer</h4>
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">Sale</span>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
                                <div className="grid grid-cols-1 divide-y divide-slate-100 text-sm sm:grid-cols-1 sm:divide-x-0 sm:divide-y-0">
                                    <div className="px-4 py-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Sale date</p>
                                        <p className="mt-1.5 font-semibold text-slate-900">{formatDate(effectiveSaleDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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


const BatteryReportSheet: React.FC<BatteryReportSheetProps> = ({ battery, lineage, replacements, lineageSales, dealers, saleDate, onPrint }) => {
    const isExpired = battery.warrantyExpiry ? new Date() > new Date(battery.warrantyExpiry) : false;
    const isReplacement = !!battery.previousBatteryId;
    const originalBattery = lineage.find(b => b.status === BatteryStatus.MANUFACTURED) || lineage[0];
    const effectiveSaleDate = battery.actualSaleDate || originalBattery?.actualSaleDate || (saleDate !== 'STOCK' ? saleDate : null);
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
        window.electronAPI ? window.electronAPI.printOrPdf() : window.print();
        document.title = originalTitle;
    };

    return (
        <div className="relative flex h-full flex-col bg-slate-50 font-sans">
            <style>
                {`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 12mm;
                        }
                        
                        /* HIDE EVERYTHING ELSE */
                        body > *:not(#print-portal-root):not(#batch-print-portal-root) {
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
                            padding: 0 !important;
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
                    lineageSales={lineageSales}
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
                        lineageSales={lineageSales}
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
