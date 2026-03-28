import React from 'react';
import { Barcode, Search, CheckCircle2, Loader2, X, LayoutGrid, PackagePlus, MapPin, Phone, ShieldCheck, BatteryCharging, CalendarDays, Activity, TrendingUp, ShieldAlert, Percent } from 'lucide-react';
import { Database } from '../../db';
import { Dealer, BatteryModel } from '../../types';

interface ScannerHeaderProps {
    batchMode: boolean;
    setBatchMode: (mode: boolean) => void;
    lastScanned: string | null;
    stagedCount: number;
    dealers: Dealer[];
    models: BatteryModel[];
    batchConfig: {
        dealerId: string;
        modelId: string;
        date: string;
    };
    setBatchConfig: (config: any) => void;
    scanBuffer: string;
    setScanBuffer: (buffer: string) => void;
    handleSearch: (id: string) => void;
    handleClear: () => void;
    isProcessing: boolean;
    activeAsset: any;
    inputRef: React.RefObject<HTMLInputElement>;
    userRole?: string;
    onOpenDealerProfile?: (dealerId: string) => void;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
    batchMode,
    setBatchMode,
    lastScanned,
    stagedCount,
    dealers,
    models,
    batchConfig,
    setBatchConfig,
    scanBuffer,
    setScanBuffer,
    handleSearch,
    handleClear,
    isProcessing,
    activeAsset,
    inputRef,
    userRole,
    onOpenDealerProfile
}) => {
    const [showBatchConfigAlert, setShowBatchConfigAlert] = React.useState(false);
    const [dealerAnalytics, setDealerAnalytics] = React.useState<{
        activeUnitCount: number;
        last30Sales: number;
        totalClaims: number;
        claimRatio: string;
    } | null>(null);
    const isAdmin = userRole === 'ADMIN';
    const selectedDealer = dealers.find((dealer) => dealer.id === batchConfig.dealerId) || null;
    const selectedModel = models.find((model) => model.id === batchConfig.modelId) || null;
    const batchConfigReady = !!batchConfig.dealerId && !!batchConfig.modelId;
    const dealerFieldError = batchMode && showBatchConfigAlert && !batchConfig.dealerId;
    const modelFieldError = batchMode && showBatchConfigAlert && !batchConfig.modelId;

    const triggerBatchConfigAlert = () => {
        if (!batchMode || batchConfigReady) return;
        setShowBatchConfigAlert(true);
    };

    const formattedBatchDate = React.useMemo(() => {
        if (!batchConfig.date) return '--/--/----';
        const [year, month, day] = batchConfig.date.split('-');
        if (!year || !month || !day) return batchConfig.date;
        return `${day}/${month}/${year}`;
    }, [batchConfig.date]);

    React.useEffect(() => {
        let alive = true;

        const loadDealerAnalytics = async () => {
            if (!isAdmin || !selectedDealer) {
                setDealerAnalytics(null);
                return;
            }

            try {
                const data = await Database.getDealerAnalytics(selectedDealer.id);
                if (!alive) return;
                setDealerAnalytics({
                    activeUnitCount: data?.activeUnitCount || 0,
                    last30Sales: data?.last30Sales || 0,
                    totalClaims: data?.totalClaims || 0,
                    claimRatio: data?.claimRatio || '0.0',
                });
            } catch {
                if (alive) {
                    setDealerAnalytics(null);
                }
            }
        };

        loadDealerAnalytics();
        return () => {
            alive = false;
        };
    }, [isAdmin, selectedDealer]);

    React.useEffect(() => {
        if (!batchMode || !batchConfigReady) return;
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [batchMode, batchConfigReady, inputRef]);

    return (
        <div className={`transition-all duration-300 ${batchMode ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(135deg,_#312e81_0%,_#1e1b4b_60%,_#111827_100%)] border-indigo-700/70 shadow-indigo-950/20' : 'bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] border-slate-200 shadow-slate-200/50'} border rounded-2xl p-8 shadow-sm no-print`}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`rounded-2xl p-4 ${batchMode ? 'bg-white/10 text-white ring-1 ring-white/10' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5'}`}>
                            {batchMode ? <LayoutGrid size={30} /> : <Barcode size={30} />}
                        </div>
                        <div className="space-y-3">
                            <div className={`inline-flex rounded-xl p-1 ${batchMode ? 'bg-white/10 ring-1 ring-white/10' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
                                <button
                                    onClick={() => setBatchMode(false)}
                                    className={`px-4 py-2 rounded-lg font-bold text-xs tracking-[0.08em] transition-all ${!batchMode ? 'bg-white text-slate-900 shadow-sm' : 'text-white/75 hover:text-white'}`}
                                >
                                    Trace
                                </button>
                                <button
                                    onClick={() => setBatchMode(true)}
                                    className={`px-4 py-2 rounded-lg font-bold text-xs tracking-[0.08em] transition-all ${batchMode ? 'bg-white text-indigo-900 shadow-sm' : batchMode ? 'text-white/75 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Batch
                                </button>
                            </div>
                            <div>
                                <h2 className={`text-xl font-black tracking-tight ${batchMode ? 'text-white' : 'text-slate-900'}`}>
                                    {batchMode ? 'Batch Scan' : 'Trace Battery'}
                                </h2>
                                {!batchMode && (
                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                        Search any serial number to open battery status, history, and warranty details.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {batchMode && (
                    <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 md:grid-cols-3">
                        <div className={`rounded-2xl border bg-white/10 p-4 ${dealerFieldError ? 'border-rose-400 bg-rose-500/10' : 'border-white/10'}`}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black tracking-[0.18em] text-indigo-200/80">Dealer</p>
                                {batchConfig.dealerId && <CheckCircle2 size={14} className="text-emerald-300" />}
                            </div>
                            <select
                                className={`w-full rounded-xl border px-4 py-3 font-bold text-sm text-white outline-none transition-all ${dealerFieldError ? 'border-rose-400 bg-rose-950/30 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/50' : batchConfig.dealerId ? 'border-emerald-400/40 bg-indigo-950/60 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/40' : 'border-indigo-400/20 bg-indigo-950/60 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/60'}`}
                                value={batchConfig.dealerId}
                                onChange={e => {
                                    setBatchConfig({ ...batchConfig, dealerId: e.target.value });
                                    if (e.target.value && batchConfig.modelId) setShowBatchConfigAlert(false);
                                }}
                            >
                                <option value="">Select Dealer</option>
                                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className={`rounded-2xl border bg-white/10 p-4 ${modelFieldError ? 'border-rose-400 bg-rose-500/10' : 'border-white/10'}`}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black tracking-[0.18em] text-indigo-200/80">Model</p>
                                {batchConfig.modelId && <CheckCircle2 size={14} className="text-emerald-300" />}
                            </div>
                            <select
                                className={`w-full rounded-xl border px-4 py-3 font-bold text-sm text-white outline-none transition-all ${modelFieldError ? 'border-rose-400 bg-rose-950/30 focus:border-rose-300 focus:ring-2 focus:ring-rose-400/50' : batchConfig.modelId ? 'border-emerald-400/40 bg-indigo-950/60 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/40' : 'border-indigo-400/20 bg-indigo-950/60 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/60'}`}
                                value={batchConfig.modelId}
                                onChange={e => {
                                    setBatchConfig({ ...batchConfig, modelId: e.target.value });
                                    if (e.target.value && batchConfig.dealerId) setShowBatchConfigAlert(false);
                                }}
                            >
                                <option value="">Select Model</option>
                                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                            <p className="mb-3 text-[10px] font-black tracking-[0.18em] text-indigo-200/80">Date</p>
                            <input
                                type="date"
                                className="w-full rounded-xl border border-indigo-400/20 bg-indigo-950/60 px-4 py-3 font-bold text-sm text-white outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/60"
                                value={batchConfig.date}
                                onChange={e => setBatchConfig({ ...batchConfig, date: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <div className={`rounded-2xl border ${batchMode ? 'border-white/10 bg-indigo-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' : 'border-slate-200 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'} p-4 md:p-5`}>
                    {batchMode && (
                        <div className="mb-4 flex justify-end">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-indigo-100 ring-1 ring-white/10">
                                <CalendarDays size={12} />
                                <span>{formattedBatchDate}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="shrink-0 flex gap-2">
                            <div className={`${batchMode ? 'bg-white/10 text-white ring-1 ring-white/10' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'} p-4 rounded-2xl`}>
                                {batchMode ? <PackagePlus size={32} /> : <Barcode size={32} />}
                            </div>
                        </div>
                        <div className="flex-1 w-full relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${batchMode ? 'text-indigo-300' : 'text-slate-400'}`} size={20} />
                            <input
                                ref={inputRef}
                                disabled={isProcessing}
                                readOnly={batchMode && !batchConfigReady}
                                placeholder={batchMode ? (batchConfigReady ? "Scan serial..." : "Select dealer and model...") : "Enter serial..."}
                                className={`w-full rounded-xl border pl-12 pr-6 py-4 outline-none font-bold text-lg transition-all tracking-[0.08em] mono ${batchMode ? `${batchConfigReady ? 'border-indigo-400/20 bg-indigo-950/80 text-white placeholder:text-indigo-400 focus:border-indigo-300 focus:bg-indigo-950' : 'border-amber-300/30 bg-indigo-950/55 text-indigo-100 placeholder:text-indigo-300/80 cursor-not-allowed'}` : 'bg-white border-slate-200 text-slate-900 shadow-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5'}`}
                                value={scanBuffer}
                                onChange={(e) => {
                                    if (batchMode && !batchConfigReady) return;
                                    setScanBuffer(e.target.value);
                                }}
                                onFocus={triggerBatchConfigAlert}
                                onClick={triggerBatchConfigAlert}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(scanBuffer)}
                            />
                            {isProcessing && <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${batchMode ? 'text-white' : 'text-blue-600'}`} size={20} />}
                        </div>
                        <div className="flex w-full gap-3 md:w-auto">
                            <button
                                onClick={() => handleSearch(scanBuffer)}
                                disabled={isProcessing || !scanBuffer || (batchMode && (!batchConfig.dealerId || !batchConfig.modelId))}
                                className={`flex-1 px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-30 tracking-[0.08em] md:flex-none ${batchMode ? 'bg-white text-indigo-900 hover:bg-indigo-50' : 'bg-slate-900 text-white hover:bg-black shadow-slate-900/15'}`}
                            >
                                {batchMode ? 'Stage' : 'Trace'}
                            </button>

                            {(activeAsset || scanBuffer) && (
                                <button
                                    onClick={handleClear}
                                    className={`p-4 rounded-xl transition-all active:scale-95 ${batchMode ? 'bg-white/10 text-indigo-100 hover:bg-rose-400/20 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'}`}
                                    title="Clear Search"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {batchMode && (
                        <div className="mt-4 space-y-3">
                            {showBatchConfigAlert && !batchConfigReady && (
                                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                                    Select dealer and model first.
                                </div>
                            )}
                            {(selectedDealer || selectedModel || batchMode) && (
                                <div className="grid gap-2.5 md:grid-cols-3">
                                    {selectedDealer && (
                                        isAdmin ? (
                                            <div
                                                className="group [perspective:1200px] cursor-pointer"
                                                onClick={() => onOpenDealerProfile?.(selectedDealer.id)}
                                            >
                                                <div className="relative min-h-[228px] transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                                    <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [backface-visibility:hidden]">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black tracking-[0.16em] text-indigo-200/80">Dealer</p>
                                                                <p className="mt-1 truncate text-base font-black text-white">{selectedDealer.name}</p>
                                                                <p className="mt-1 truncate text-[11px] font-semibold text-indigo-100/75">{selectedDealer.location || '--'}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-white/10 p-2.5 text-cyan-100 ring-1 ring-white/10">
                                                                <ShieldCheck size={17} />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 space-y-2">
                                                            <div className="flex items-center gap-2 rounded-xl bg-indigo-950/30 px-3 py-2 text-[11px] font-semibold text-indigo-100/85 ring-1 ring-white/10">
                                                                <MapPin size={13} className="shrink-0 text-cyan-100/80" />
                                                                <p className="truncate">{selectedDealer.location || '--'}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 rounded-xl bg-indigo-950/30 px-3 py-2 text-[11px] font-semibold text-indigo-100/85 ring-1 ring-white/10">
                                                                <Phone size={13} className="shrink-0 text-cyan-100/80" />
                                                                <p className="truncate">{selectedDealer.contact || '--'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 text-[10px] font-bold text-cyan-100/80">Hover for stats</div>
                                                    </div>

                                                    <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[10px] font-black tracking-[0.16em] text-indigo-200/80">Dealer stats</p>
                                                                <p className="mt-1 truncate text-base font-black text-white">{selectedDealer.name}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-white/10 p-2.5 text-cyan-100 ring-1 ring-white/10">
                                                                <Activity size={17} />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                                <div className="flex items-center gap-2 text-indigo-200/75">
                                                                    <Activity size={12} />
                                                                    <p className="text-[10px] font-bold">Active</p>
                                                                </div>
                                                                <p className="mt-1 text-sm font-black text-white">{dealerAnalytics?.activeUnitCount ?? '--'}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                                <div className="flex items-center gap-2 text-indigo-200/75">
                                                                    <TrendingUp size={12} />
                                                                    <p className="text-[10px] font-bold">Sales</p>
                                                                </div>
                                                                <p className="mt-1 text-sm font-black text-white">{dealerAnalytics?.last30Sales ?? '--'}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                                <div className="flex items-center gap-2 text-indigo-200/75">
                                                                    <ShieldAlert size={12} />
                                                                    <p className="text-[10px] font-bold">Claims</p>
                                                                </div>
                                                                <p className="mt-1 text-sm font-black text-white">{dealerAnalytics?.totalClaims ?? '--'}</p>
                                                            </div>
                                                            <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                                <div className="flex items-center gap-2 text-indigo-200/75">
                                                                    <Percent size={12} />
                                                                    <p className="text-[10px] font-bold">Rate</p>
                                                                </div>
                                                                <p className="mt-1 text-sm font-black text-white">{dealerAnalytics?.claimRatio ?? '--'}%</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black tracking-[0.16em] text-indigo-200/80">Dealer</p>
                                                        <p className="mt-1 truncate text-base font-black text-white">{selectedDealer.name}</p>
                                                        <p className="mt-1 text-[11px] font-semibold text-indigo-100/75">Selected dealer</p>
                                                    </div>
                                                    <div className="rounded-xl bg-white/10 p-2.5 text-cyan-100 ring-1 ring-white/10">
                                                        <ShieldCheck size={17} />
                                                    </div>
                                                </div>
                                                <div className="mt-3 rounded-xl bg-indigo-950/30 px-3 py-3 text-center ring-1 ring-white/10">
                                                    <p className="text-base font-black text-white">Selected</p>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {selectedModel && (
                                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black tracking-[0.16em] text-indigo-200/80">Model</p>
                                                    <p className="mt-1 truncate text-base font-black text-white">{selectedModel.name}</p>
                                                    <p className="mt-1 text-[11px] font-semibold text-indigo-100/75">Battery specification</p>
                                                </div>
                                                <div className="rounded-xl bg-white/10 p-2.5 text-indigo-100 ring-1 ring-white/10">
                                                    <BatteryCharging size={17} />
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                    <div className="flex items-center gap-2 text-indigo-200/75">
                                                        <BatteryCharging size={12} />
                                                        <p className="text-[10px] font-bold">Capacity</p>
                                                    </div>
                                                    <p className="mt-1 text-sm font-black text-white">{selectedModel.defaultCapacity} Ah</p>
                                                </div>
                                                <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                    <div className="flex items-center gap-2 text-indigo-200/75">
                                                        <CalendarDays size={12} />
                                                        <p className="text-[10px] font-bold">Warranty</p>
                                                    </div>
                                                    <p className="mt-1 text-sm font-black text-white">{selectedModel.defaultWarrantyMonths} mo</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black tracking-[0.16em] text-indigo-200/80">Batch status</p>
                                                <p className="mt-1 truncate text-base font-black text-white">
                                                    {batchConfigReady ? (stagedCount > 0 ? `${stagedCount} queued` : 'Ready') : 'Waiting'}
                                                </p>
                                                <p className="mt-1 text-[11px] font-semibold text-indigo-100/75">
                                                    {batchConfigReady
                                                        ? (stagedCount > 0 ? 'Continue scanning' : 'Start scanning')
                                                        : 'Select dealer and model'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white/10 p-2.5 text-indigo-100 ring-1 ring-white/10">
                                                <CheckCircle2 size={17} />
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                <div className="flex items-center gap-2 text-indigo-200/75">
                                                    <Activity size={12} />
                                                    <p className="text-[10px] font-bold">Queued</p>
                                                </div>
                                                <p className="mt-1 text-sm font-black text-white">{stagedCount}</p>
                                            </div>
                                            <div className="rounded-xl bg-black/10 px-3 py-2 ring-1 ring-white/10">
                                                <div className="flex items-center gap-2 text-indigo-200/75">
                                                    <CalendarDays size={12} />
                                                    <p className="text-[10px] font-bold">Date</p>
                                                </div>
                                                <p className="mt-1 text-sm font-black text-white">{formattedBatchDate}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
