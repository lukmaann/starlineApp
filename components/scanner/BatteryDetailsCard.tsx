import React from 'react';
import {
    ShieldAlert, Calendar, Edit, FileText,
    Store, ShieldCheck, Activity, RefreshCw, X
} from 'lucide-react';
import { formatDate } from '../../utils';
import { BatteryStatus, Dealer, BatteryModel } from '../../types';
import { StatusDisplay } from '../StatusDisplay';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import BatteryReportSheet from '../BatteryReportSheet';
import { AuthSession } from '../../utils/AuthSession';
import BatteryEdit from '../BatteryEdit';

interface BatteryDetailsCardProps {
    activeAsset: any;
    dealers: Dealer[];
    isLocked: boolean;
    isSessionValid: boolean;
    isExpired: boolean;
    showEdit: boolean;
    setShowEdit: (show: boolean) => void;
    setPendingAction: (action: 'EXCHANGE' | 'EDIT' | null) => void;
    setIsLocked: (locked: boolean) => void;
    handleSearch: (id: string) => void;
    handlePrintReport: () => void;
    setIsInspecting: (inspecting: boolean) => void;
    setIsReplacing: (replacing: boolean) => void;
    setReplacementStep: (step: number) => void;
    showDateCorrection: boolean;
    setShowDateCorrection: (show: boolean) => void;
    userRole?: string;
}

export const BatteryDetailsCard: React.FC<BatteryDetailsCardProps> = ({
    activeAsset,
    dealers,
    isLocked,
    isSessionValid,
    isExpired,
    showEdit,
    setShowEdit,
    setPendingAction,
    setIsLocked,
    handleSearch,
    handlePrintReport,
    setIsInspecting,
    setIsReplacing,
    setReplacementStep,
    showDateCorrection,
    setShowDateCorrection,
    userRole
}) => {
    const isExp = isExpired;
    const isAdmin = userRole === 'ADMIN';

    const getCardColor = () => {
        if (isExp && activeAsset.battery.status !== BatteryStatus.MANUFACTURED) return 'border-rose-200 bg-rose-50';
        switch (activeAsset.battery.status) {
            case BatteryStatus.ACTIVE: return 'border-emerald-200 bg-emerald-50';
            case BatteryStatus.RETURNED: return 'border-slate-300 bg-slate-100 opacity-75';
            case BatteryStatus.REPLACEMENT: return 'border-amber-200 bg-amber-50';
            case BatteryStatus.MANUFACTURED: return activeAsset.battery.dealerId ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white';
            default: return 'border-slate-200 bg-white';
        }
    };

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            {activeAsset.battery.status === BatteryStatus.RETURNED_PENDING && (
                <div className="bg-orange-600 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <RefreshCw size={32} />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-white">Exchange is Pending</h2>
                            <p className="text-xs font-bold text-orange-100 uppercase tracking-widest mt-1">
                                Resume This Warranty Exchange
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (AuthSession.isValid()) {
                                setIsReplacing(true);
                                setReplacementStep(1);
                            } else {
                                setPendingAction('EXCHANGE');
                                setIsLocked(true);
                            }
                        }}
                        className="bg-white text-orange-600 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg hover:bg-orange-50 transition-all active:scale-95 flex items-center gap-2"
                    >
                        Resume Exchange
                    </button>
                </div>
            )}

            {isExp && (
                <div className="bg-rose-600 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <ShieldAlert size={32} />
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Warranty Expired</h2>
                            <p className="text-xs font-bold opacity-90 uppercase tracking-widest">Coverage ended on {formatDate(activeAsset.battery.warrantyExpiry)}</p>
                        </div>
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                        <span className="text-xs font-black uppercase tracking-widest">No Claims Allowed</span>
                    </div>
                </div>
            )}

            {isExp && !showDateCorrection && isSessionValid && isAdmin && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-amber-600" size={24} />
                            <div>
                                <h4 className="font-bold text-amber-900 text-sm">Warranty Date Correction Available</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    If the dealer sold this battery later than the activation date, you can correct the warranty period.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDateCorrection(true)}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            Correct Date
                        </button>
                    </div>
                </div>
            )}

            {/* Date Correction Form is extracted separately but could be triggered here */}

            {!isExp && (
                <StatusDisplay
                    status={activeAsset.battery.status}
                    isExpired={isExp}
                    dealerId={activeAsset.battery.dealerId}
                    variant="banner"
                    className="rounded-t-2xl"
                />
            )}

            <div className={`border rounded-2xl rounded-t-none shadow-sm overflow-hidden transition-colors duration-500 ${getCardColor()}`}>
                <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 mono uppercase">{activeAsset.battery.id}</h1>
                        </div>
                        <p className="text-slate-500 font-bold text-lg uppercase">{activeAsset.battery.model} • {activeAsset.battery.capacity}</p>
                    </div>
                    <div className="flex gap-2">
                        {!isLocked && isAdmin && (
                            <button
                                onClick={() => {
                                    if (AuthSession.isValid()) {
                                        setShowEdit(true);
                                    } else {
                                        setPendingAction('EDIT');
                                        setIsLocked(true);
                                    }
                                }}
                                className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-100 no-print flex items-center gap-2"
                            >
                                <Edit size={20} />
                                <span className="text-xs font-bold uppercase">Edit Record</span>
                            </button>
                        )}
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 no-print flex items-center gap-2">
                                    <FileText size={20} />
                                    <span className="text-xs font-bold uppercase">Create Report</span>
                                </button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-[50vw] p-0">
                                <BatteryReportSheet
                                    battery={activeAsset.battery}
                                    lineage={activeAsset.lineage}
                                    replacements={activeAsset.replacements}
                                    activityLogs={activeAsset.activityLogs}
                                    dealers={dealers}
                                    saleDate={activeAsset.lineageSales?.find((s: any) => s.batteryId === activeAsset.battery.id)?.saleDate}
                                    onPrint={handlePrintReport}
                                />
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lifecycle timeline</p>
                        <div className="space-y-2 text-xs font-bold">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Sold On</span>
                                <span className="mono">{formatDate(activeAsset.battery.activationDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Expiry</span>
                                <span className="mono text-rose-600 font-black">{formatDate(activeAsset.battery.warrantyExpiry)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dispatch metadata</p>
                        <div className="space-y-2 text-xs font-bold">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Dealer</span>
                                <span className="text-blue-600 truncate max-w-[120px] uppercase">
                                    {isAdmin ? (dealers.find(d => d.id === activeAsset.battery.dealerId)?.name || 'Central') : 'HIDDEN'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Swap count</span>
                                <span className="mono">{activeAsset.battery.replacementCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="no-print">
                {activeAsset.battery.status === BatteryStatus.MANUFACTURED ? (
                    <div className="bg-blue-600 p-8 rounded-2xl shadow-xl flex justify-between items-center text-white">
                        <div>
                            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">Central Stock Unit</h3>
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">
                                This unit is currently in central stock. Use Batch Mode to dispatch and activate.
                            </p>
                        </div>
                        <Activity size={32} className="opacity-40" />
                    </div>
                ) : !isExpired && activeAsset.battery.status !== BatteryStatus.RETURNED ? (
                    <div className="space-y-4">
                        {/* Battery Inspection Section */}
                        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${activeAsset.battery.inspectionStatus === 'FAULTY' ? 'bg-rose-100 text-rose-600' :
                                        activeAsset.battery.inspectionStatus === 'GOOD' ? 'bg-emerald-100 text-emerald-600' :
                                            activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                                                'bg-blue-100 text-blue-600'
                                        }`}>
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm uppercase">Technical Inspection</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {activeAsset.battery.inspectionStatus === 'FAULTY' ? 'Unit verified as faulty.' :
                                                activeAsset.battery.inspectionStatus === 'GOOD' ? `Unit verified as healthy. Returned on ${formatDate(activeAsset.battery.inspectionReturnDate)}` :
                                                    activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? `Assessing unit... Started on ${formatDate(activeAsset.battery.inspectionStartDate)}` :
                                                        'Inspection required before exchange.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsInspecting(true)}
                                    className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 ${activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    {activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? 'Resume Status' : activeAsset.battery.inspectionStatus ? 'Re-Inspect' : 'Inspect Unit'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
