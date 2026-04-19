import React from 'react';
import {
    ShieldAlert, Calendar, Edit, FileText,
    Activity, RefreshCw, Store, ChevronRight, MapPin, Landmark, Copy, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../utils';
import { BatteryStatus, Dealer, Replacement } from '../../types';
import { StatusDisplay } from '../StatusDisplay';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import BatteryReportSheet from '../BatteryReportSheet';
import { AuthSession } from '../../utils/AuthSession';
import { WarrantyCalculator } from '../../utils/warrantyCalculator';

interface BatteryDetailsCardProps {
    activeAsset: any;
    dealers: Dealer[];
    isLocked: boolean;
    isSessionValid: boolean;
    isExpired: boolean;
    showEdit: boolean;
    setShowEdit: (show: boolean) => void;
    setPendingAction: (action: 'EXCHANGE' | 'EDIT' | 'MOVE' | null) => void;
    setIsLocked: (locked: boolean) => void;
    handleSearch: (id: string) => void;
    handlePrintReport: () => void;
    setIsInspecting: (inspecting: boolean) => void;
    setIsReplacing: (replacing: boolean) => void;
    setReplacementStep: (step: number) => void;
    showDateCorrection: boolean;
    setShowDateCorrection: (show: boolean) => void;
    userRole?: string;
    onOpenDealers?: (dealerId: string, batteryId: string, status: BatteryStatus, isExpired: boolean) => void;
    pendingSettlement?: Replacement | null;
    onSettleHere?: () => void;
    onMoveDealer?: () => void;
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
    userRole,
    onOpenDealers,
    pendingSettlement,
    onSettleHere,
    onMoveDealer
}) => {
    const isExp = isExpired;
    const isAdmin = userRole === 'ADMIN';
    
    // Centralized Warranty Logic
    const warrantyResult = React.useMemo(() => WarrantyCalculator.calculate(activeAsset.battery), [activeAsset.battery]);
    const lifecycleStartDate = warrantyResult.effectiveStartDate;
    const lifecycleExpiryDate = new Date(warrantyResult.effectiveExpiryDate);

    const canInspectBattery =
        activeAsset.battery.status !== BatteryStatus.RETURNED &&
        activeAsset.battery.status !== BatteryStatus.RETURNED_PENDING;
    const dealerRecord = dealers.find(d => d.id === activeAsset.battery.dealerId);
    const dealerName = dealerRecord?.name || 'Central';
    const expiryDate = lifecycleExpiryDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryCountdownDays = expiryDate
        ? Math.ceil((new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const hasLifecycleLinks = !!activeAsset.battery.previousBatteryId || !!activeAsset.battery.nextBatteryId;
    const reflectsCustomerSale = !!activeAsset.battery.actualSaleDate && activeAsset.battery.actualSaleDate !== '';
    const canMoveDealer =
        isAdmin &&
        !hasLifecycleLinks &&
        !reflectsCustomerSale &&
        activeAsset.battery.status !== BatteryStatus.RETURNED &&
        activeAsset.battery.status !== BatteryStatus.RETURNED_PENDING &&
        (activeAsset.battery.status === BatteryStatus.MANUFACTURED || activeAsset.battery.status === BatteryStatus.ACTIVE);
    const getStatusPill = () => {
        if (isExp && activeAsset.battery.status !== BatteryStatus.MANUFACTURED) return 'bg-rose-100 text-rose-700';
        switch (activeAsset.battery.status) {
            case BatteryStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700';
            case BatteryStatus.REPLACEMENT: return 'bg-amber-100 text-amber-700';
            case BatteryStatus.RETURNED_PENDING: return 'bg-orange-100 text-orange-700';
            case BatteryStatus.RETURNED: return 'bg-slate-200 text-slate-600';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

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
                <div
                    className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_40px_-26px_rgba(15,23,42,0.22)]"
                >
                    <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_#fff7ed_0%,_#ffffff_100%)] px-6 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
                                <RefreshCw size={22} />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-black tracking-tight text-slate-900">Exchange already in progress</p>
                                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                                            Pending
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">
                                        This battery is already inside an active exchange workflow. Resume that process to continue.
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
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-amber-600 active:scale-95"
                            >
                                Resume exchange
                            </button>
                        </div>
                    </div>
                    <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Current state</p>
                            <p className="mt-1 text-sm font-black text-slate-900">Exchange pending</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Next step</p>
                            <p className="mt-1 text-sm font-black text-slate-900">Resume exchange flow</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Inspection</p>
                            <p className="mt-1 text-sm font-black text-slate-900">Not needed again</p>
                        </div>
                    </div>
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

            <div
                className={`rounded-2xl rounded-t-none overflow-hidden transition-colors duration-500 border ${getCardColor()}`}
                style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04), 0 18px 32px -12px rgba(15,23,42,0.08)' }}
            >
                <div className="p-8 border-b border-slate-200/70">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-semibold text-slate-700">Battery profile</span>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusPill()}`}>
                                    {isExp && activeAsset.battery.status !== BatteryStatus.MANUFACTURED ? 'Expired' : activeAsset.battery.status}
                                </span>
                            </div>

                            <div className="mt-5 flex items-start justify-between group">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tight text-slate-900 mono sm:text-[2.8rem]">{activeAsset.battery.id}</h1>
                                    <p className="mt-2 text-lg font-semibold text-slate-600">
                                        {activeAsset.battery.model} <span className="text-slate-300">•</span> {activeAsset.battery.capacity}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(activeAsset.battery.id);
                                        toast.success('Battery serial copied to clipboard');
                                    }}
                                    className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors shadow-sm opacity-50 group-hover:opacity-100 active:scale-95"
                                    title="Copy System ID"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Manufactured</span>
                                    <span className="font-semibold text-slate-900">{formatDate(activeAsset.battery.manufactureDate)}</span>
                                </div>
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Warranty</span>
                                    <span className="font-semibold text-slate-900">{activeAsset.battery.warrantyMonths || 0} months</span>
                                </div>
                                {activeAsset.battery.originalBatteryId && activeAsset.battery.originalBatteryId !== activeAsset.battery.id && (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-slate-500">Source</span>
                                            <span className="font-semibold text-slate-900 mono truncate">{activeAsset.battery.originalBatteryId}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="w-full max-w-md no-print">
                            <div className="flex flex-col gap-2 xl:items-end">
                                <div className="flex flex-col gap-2 sm:flex-row xl:justify-end w-full">
                                {!isLocked && isAdmin && (
                                    <button
                                        onClick={() => {
                                            if (AuthSession.isValid()) {
                                                setShowEdit(true);
                                            } else {
                                                AuthSession.clearSession();
                                                window.alert('Your session has expired. Please log in again to edit this record.');
                                                window.location.reload();
                                            }
                                        }}
                                        className="group flex-1 rounded-2xl border border-slate-800/40 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] px-4 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-105 flex items-center justify-center gap-2"
                                        style={{ boxShadow: '0 12px 24px -14px rgba(15,23,42,0.42)' }}
                                    >
                                        <Edit size={17} className="transition-transform group-hover:-rotate-6 group-hover:scale-105" />
                                        <span>Edit record</span>
                                    </button>
                                )}
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <button className="group flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-700 flex items-center justify-center gap-2 shadow-sm">
                                            <FileText size={17} className="transition-transform group-hover:translate-y-[-1px] group-hover:scale-105" />
                                            <span>Create report</span>
                                        </button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full sm:max-w-[50vw] p-0 border-l border-slate-200 bg-slate-50 shadow-[0_18px_40px_-14px_rgba(15,23,42,0.18)] data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=open]:duration-0 data-[state=closed]:duration-0">
                                        <BatteryReportSheet
                                            battery={activeAsset.battery}
                                            lineage={activeAsset.lineage}
                                            replacements={activeAsset.replacements}
                                            activityLogs={activeAsset.activityLogs}
                                            dealers={dealers}
                                            saleDate={activeAsset.lineageSales?.find((s: any) => s.batteryId === activeAsset.battery.id && s.customerPhone !== 'STOCK')?.saleDate}
                                            onPrint={handlePrintReport}
                                        />
                                    </SheetContent>
                                </Sheet>
                                </div>
                                {pendingSettlement && activeAsset.battery.status !== BatteryStatus.RETURNED_PENDING && (
                                    <div className="w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-sm">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                                                    <Landmark size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-semibold text-amber-700">
                                                        Settlement pending
                                                    </p>
                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                        Complete dealer settlement for {pendingSettlement.oldBatteryId}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={onSettleHere}
                                                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-amber-600 active:scale-95"
                                            >
                                                Complete settlement
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 bg-white/70 p-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <p className="text-sm font-semibold text-slate-700">Lifecycle</p>
                        <div className="mt-4 space-y-3">
                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-slate-500">Start date</span>
                                <span className="mono text-sm font-semibold text-slate-900">{lifecycleStartDate ? formatDate(lifecycleStartDate) : 'Not started'}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-sm text-slate-500">End date</span>
                                <span className="mono text-sm font-semibold text-rose-600">{lifecycleExpiryDate ? formatDate(lifecycleExpiryDate.toISOString().split('T')[0]) : 'Not available'}</span>
                            </div>
                            {expiryCountdownDays !== null && (
                                <div className="rounded-xl bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-medium text-slate-500">Countdown</p>
                                    <p className={`mt-1 text-sm font-semibold ${expiryCountdownDays < 0 ? 'text-rose-600' : expiryCountdownDays <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {expiryCountdownDays < 0
                                            ? `Expired ${Math.abs(expiryCountdownDays)} days ago`
                                            : expiryCountdownDays === 0
                                                ? 'Expires today'
                                                : `Battery expires in ${expiryCountdownDays} days`}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => {
                            if (!isAdmin) return;
                            if (activeAsset.battery.dealerId) {
                                onOpenDealers?.(
                                    activeAsset.battery.dealerId,
                                    activeAsset.battery.id,
                                    activeAsset.battery.status,
                                    isExp
                                );
                            }
                        }}
                        className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all ${isAdmin ? 'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/60 cursor-pointer' : 'cursor-default opacity-90'}`}
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.12),_transparent_42%)] opacity-80 pointer-events-none" />
                        <div className="relative flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-sm">
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">Dealer</p>
                                        <p className="text-xs text-slate-500">{isAdmin ? 'Tap to open partner profile' : 'Assigned partner'}</p>
                                    </div>
                                </div>

                                <p className="mt-4 truncate text-[1.35rem] font-bold tracking-tight text-slate-900">{dealerName}</p>

                                {isAdmin && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                        <MapPin size={14} className="shrink-0 text-slate-400" />
                                        <span className="truncate">{dealerRecord?.location || 'Dealer record available in directory'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end gap-3">
                                <div className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700">
                                    {activeAsset.battery.replacementCount || 0} swaps
                                </div>
                                {isAdmin && (
                                    <div className="flex items-center gap-1 text-sm font-semibold text-blue-700 transition-transform group-hover:translate-x-0.5">
                                        <span>Open</span>
                                        <ChevronRight size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                    {isAdmin && (
                        <button
                            type="button"
                            disabled={!canMoveDealer}
                            onClick={() => {
                                if (!canMoveDealer) return;
                                onMoveDealer?.();
                            }}
                            className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
                                canMoveDealer
                                    ? 'border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/70'
                                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${canMoveDealer ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-400'}`}>
                                        <ArrowRightLeft size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800">Move To Other Dealer</p>
                                        <p className="text-xs text-slate-500">
                                            {canMoveDealer
                                                ? 'Change dealer ownership from a separate admin flow.'
                                                : 'Available only for eligible unsold batteries without replacement links.'}
                                        </p>
                                    </div>
                                </div>
                                {canMoveDealer && (
                                    <div className="flex items-center gap-1 text-sm font-semibold text-indigo-700">
                                        <span>Open</span>
                                        <ChevronRight size={16} />
                                    </div>
                                )}
                            </div>
                        </button>
                    )}
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
                ) : !isExpired && canInspectBattery ? (
                    <div className="space-y-4">
                        {/* Battery Inspection Section */}
                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_40px_-26px_rgba(15,23,42,0.25)]">
                            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${activeAsset.battery.inspectionStatus === 'FAULTY' ? 'bg-rose-100 text-rose-600' :
                                            activeAsset.battery.inspectionStatus === 'GOOD' ? 'bg-emerald-100 text-emerald-600' :
                                                activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                                                    'bg-blue-100 text-blue-600'
                                            }`}>
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-slate-900 text-base tracking-tight">Technical Inspection</h4>
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                    activeAsset.battery.inspectionStatus === 'FAULTY'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : activeAsset.battery.inspectionStatus === 'GOOD'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : activeAsset.battery.inspectionStatus === 'IN_PROGRESS'
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {activeAsset.battery.inspectionStatus === 'FAULTY'
                                                        ? 'Fault verified'
                                                        : activeAsset.battery.inspectionStatus === 'GOOD'
                                                            ? 'Healthy'
                                                            : activeAsset.battery.inspectionStatus === 'IN_PROGRESS'
                                                                ? 'Session active'
                                                                : 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {activeAsset.battery.inspectionStatus === 'FAULTY' ? 'This unit failed inspection and is ready for exchange handling.' :
                                                    activeAsset.battery.inspectionStatus === 'GOOD' ? `This unit passed inspection and was returned on ${formatDate(activeAsset.battery.inspectionReturnDate)}` :
                                                        activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? `Inspection session opened on ${formatDate(activeAsset.battery.inspectionStartDate)}` :
                                                            'Inspect this battery before processing an exchange.'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsInspecting(true)}
                                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
                                            activeAsset.battery.inspectionStatus === 'IN_PROGRESS'
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                : 'bg-slate-900 hover:bg-blue-600 text-white'
                                        }`}
                                    >
                                        {activeAsset.battery.inspectionStatus === 'IN_PROGRESS' ? 'Resume Verdict' : activeAsset.battery.inspectionStatus ? 'Open Inspection' : 'Start Inspection'}
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Status</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">
                                        {activeAsset.battery.inspectionStatus === 'FAULTY'
                                            ? 'Faulty battery'
                                            : activeAsset.battery.inspectionStatus === 'GOOD'
                                                ? 'Healthy battery'
                                                : activeAsset.battery.inspectionStatus === 'IN_PROGRESS'
                                                    ? 'Session started'
                                                    : 'Awaiting inspection'}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Started</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">
                                        {activeAsset.battery.inspectionStartDate ? formatDate(activeAsset.battery.inspectionStartDate) : 'Not started'}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Outcome</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">
                                        {activeAsset.battery.inspectionStatus === 'GOOD'
                                            ? 'Returned to dealer'
                                            : activeAsset.battery.inspectionStatus === 'FAULTY'
                                                ? 'Ready for exchange'
                                                : 'Pending final verdict'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
