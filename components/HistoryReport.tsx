
import React from 'react';
import { Battery, Replacement, Dealer, BatteryStatus } from '../types';
import { Zap, ShieldCheck, MapPin, Store, History } from 'lucide-react';
import { formatDate } from '../utils';

interface HistoryReportProps {
    battery: Battery;
    lineage: Battery[];
    replacements: Replacement[];
    dealers: Dealer[];
    saleDate?: string;
}

const HistoryReport: React.FC<HistoryReportProps> = ({ battery, lineage, replacements, dealers, saleDate }) => {
    const getDealerName = (id?: string) => dealers.find(d => d.id === id)?.name || 'UNKNOWN DEALER';
    const getDealterLocation = (id?: string) => dealers.find(d => d.id === id)?.location || 'UNKNOWN LOCATION';


    const originalBattery = lineage.find(b => b.status === BatteryStatus.MANUFACTURED) || lineage[0];
    const isExpired = battery.warrantyExpiry ? new Date() > new Date(battery.warrantyExpiry) : false;

    return (
        <div className="hidden print:block font-serif text-slate-900 bg-white">
            <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          .no-print { display: none !important; }
          .print:block { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .print-area { padding: 0 !important; }
        }
      `}</style>

            {/* Header */}
            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white"><Zap size={32} fill="currentColor" /></div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter">Starline Batteries</h1>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Official Lifecycle Narrative Report</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Report Generated On</p>
                    <p className="font-bold font-mono">{formatDate(new Date())}</p>
                </div>
            </div>

            <div className="space-y-8 max-w-3xl">
                <h2 className="text-3xl font-bold leading-tight underline decoration-4 decoration-blue-200 decoration-skip-ink">
                    Comprehensive Asset History for Serial Identity {battery.id}
                </h2>

                <div className="prose prose-slate max-w-none text-justify leading-relaxed text-sm">
                    <p>
                        <strong>1. ORIGIN & MANUFACTURE</strong><br />
                        This Starline Batteries unit, identified by Serial ID <strong>{originalBattery?.id}</strong>, is a high-performance <strong>{originalBattery?.model}</strong> model ({originalBattery?.capacity}).
                        It was manufactured on <strong>{formatDate(originalBattery?.manufactureDate)}</strong> and entered the distribution network with a standard warranty coverage of <strong>{originalBattery?.warrantyMonths} months</strong>.
                    </p>

                    <p>
                        <strong>2. SALE & ACTIVATION</strong><br />
                        The unit was procured by <strong>{battery.customerName || 'an unregistered customer'}</strong> {battery.customerPhone ? `(Contact: ${battery.customerPhone})` : ''} from our authorized dealer, <strong>{getDealerName(battery.dealerId)}</strong> based in {getDealterLocation(battery.dealerId)}.
                        The transaction was recorded on <strong>{formatDate(saleDate || originalBattery?.activationDate)}</strong>, marking the official commencement of the warranty protection period.
                    </p>

                    {replacements.length > 0 ? (
                        <div className="my-6 pl-4 border-l-4 border-amber-500 bg-amber-50 p-4 rounded-r-xl">
                            <strong>3. REPLACEMENT HISTORY</strong><br />
                            The asset has undergone <strong>{replacements.length} warranty exchanges</strong>.
                            <ul className="list-disc pl-5 mt-2 space-y-2">
                                {replacements.map(rep => (
                                    <li key={rep.id}>
                                        On <strong>{formatDate(rep.replacementDate)}</strong>, the unit {rep.oldBatteryId} was returned to <strong>{getDealerName(rep.dealerId)}</strong>.
                                        The reported failure mode was <strong>"{rep.reason}"</strong> ({rep.problemDescription || 'No description provided'}).
                                        It was exchanged for a fresh unit, Serial <strong>{rep.newBatteryId}</strong>.
                                        Evidence status: <strong>{rep.warrantyCardStatus}</strong>.
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p>
                            <strong>3. SERVICE RECORD</strong><br />
                            According to the central registry, this unit has performed optimally and has <strong>not required any warranty replacements</strong> to date. Use has been within standard operating parameters.
                        </p>
                    )}

                    <p>
                        <strong>4. CURRENT LEGAL STATUS</strong><br />
                        As of today, the unit holds the status: <strong>{battery.status}</strong>.
                        The warranty coverage is currently <strong className={isExpired ? "text-rose-600" : "text-emerald-600"}>{isExpired ? "EXPIRED" : "ACTIVE"}</strong>.
                        {isExpired ? (
                            <span> The coverage period concluded on <strong>{formatDate(battery.warrantyExpiry)}</strong>. Any further service will be on a chargeable basis.</span>
                        ) : (
                            <span> Coverage remains valid until <strong>{formatDate(battery.warrantyExpiry)}</strong>, subject to standard warranty terms and conditions.</span>
                        )}
                    </p>
                </div>

                {/* Footer info */}
                <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-[10px] uppercase font-bold text-slate-500">
                    <div>
                        <p className="mb-2">Authorized Signatory</p>
                        <div className="h-10 border-b border-dashed border-slate-300 w-32"></div>
                    </div>
                    <div className="text-right">
                        <p>System Generated Document</p>
                        <p>Starline Secure Registry v1.0</p>
                        <p className="mt-1 font-mono text-[8px]">{battery.id} // {Date.now()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryReport;
