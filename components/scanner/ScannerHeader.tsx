import React from 'react';
import { Barcode, Search, CheckCircle2, Loader2, X, LayoutGrid, PackagePlus, MapPin, Phone, ShieldCheck, BatteryCharging, CalendarDays, Activity, TrendingUp, ShieldAlert, Percent } from 'lucide-react';
import { Database } from '../../db';
import { formatDate } from '../../utils';
import { Dealer, BatteryModel } from '../../types';

interface ScannerHeaderProps {
    scanMode: 'TRACE' | 'BATCH' | 'REPLACEMENT';
    replacementNewSerial?: string;
    setReplacementNewSerial?: (val: string) => void;
    handleStartReplacement?: () => void;
    replacementOldAsset?: any;
    replacementOldLookupResult?: 'idle' | 'notFound' | 'error';
    isReplacementSearching?: boolean;
    replacementOldSerial?: string;
    setReplacementOldSerial?: (val: string) => void;
    onOldBatteryInput?: () => void;
    onOldBatteryBlur?: () => void;
    setScanMode: (mode: 'TRACE' | 'BATCH' | 'REPLACEMENT') => void;
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
    scanMode,
    replacementNewSerial = "",
    setReplacementNewSerial = () => {},
    handleStartReplacement = () => {},
    replacementOldAsset = null,
    replacementOldLookupResult = 'idle',
    isReplacementSearching = false,
    replacementOldSerial = '',
    setReplacementOldSerial = () => {},
    onOldBatteryInput = () => {},
    onOldBatteryBlur = () => {},
    setScanMode,
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

    const isBatch = scanMode === 'BATCH';
    const isReplacement = scanMode === 'REPLACEMENT';
    const isDarkTheme = isBatch || isReplacement;

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
    const tabClass = (mode: 'TRACE' | 'BATCH' | 'REPLACEMENT') => isBatch
        ? `px-4 py-2 rounded-lg font-bold text-xs tracking-[0.08em] transition-all ${scanMode === mode ? (mode === 'BATCH' ? 'bg-white text-indigo-900 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-white/75 hover:text-white'}`
        : `px-4 py-2 rounded-lg font-semibold text-sm transition-all ${scanMode === mode ? (mode === 'REPLACEMENT' ? 'bg-white text-amber-900 shadow-sm' : 'bg-white text-slate-900 shadow-sm') : isReplacement ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`;

    const oldDealerId = replacementOldAsset?.battery?.dealerId
        || replacementOldAsset?.originalSale?.dealerId
        || replacementOldAsset?.sale?.dealerId;
    const oldDealer = oldDealerId ? (dealers.find(d => d.id === oldDealerId)?.name || oldDealerId) : 'Unknown dealer';
    const rawSaleDate = replacementOldAsset ? (replacementOldAsset.battery?.actualSaleDate ||
        replacementOldAsset.lineageSales?.find((s: any) => s.batteryId === replacementOldAsset.battery?.id && s.customerPhone !== 'STOCK')?.saleDate ||
        replacementOldAsset.sale?.saleDate ||
        replacementOldAsset.originalSale?.saleDate ||
        replacementOldAsset.battery?.activationDate) : null;
    const oldSaleDate = rawSaleDate ? formatDate(rawSaleDate) : 'Not Sold';
    const dealerFieldError = isBatch && showBatchConfigAlert && !batchConfig.dealerId;
    const modelFieldError = isBatch && showBatchConfigAlert && !batchConfig.modelId;

    const triggerBatchConfigAlert = () => {
        if (!isBatch || batchConfigReady) return;
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
        if (!isBatch || !batchConfigReady) return;
        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [isDarkTheme, batchConfigReady, inputRef]);

    return (
        <div className={`transition-all duration-300 border rounded-2xl shadow-sm no-print ${isBatch
            ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(135deg,_#312e81_0%,_#1e1b4b_60%,_#111827_100%)] border-indigo-700/70 shadow-indigo-950/20 p-8'
            : isReplacement
                ? 'bg-gradient-to-r from-amber-800 via-amber-700 to-orange-800 border-amber-700 shadow-amber-950/15 p-5 sm:p-6 text-white'
                : 'bg-white border-slate-200 p-6 sm:p-7 text-slate-900'}`}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`rounded-2xl p-4 ${isBatch ? 'bg-white/10 text-white ring-1 ring-white/10' : isReplacement ? 'bg-white/15 text-white ring-1 ring-white/15' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5'}`}>
                            {isBatch ? <LayoutGrid size={30} /> : isReplacement ? <PackagePlus size={30} /> : <Barcode size={30} />}
                        </div>
                        <div className="space-y-3">
                            <div className={`inline-flex rounded-xl p-1 ${isDarkTheme ? 'bg-white/10 ring-1 ring-white/10' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
                                <button
                                    onClick={() => setScanMode('TRACE')}
                                    className={tabClass('TRACE')}
                                >
                                    Trace
                                </button>
                                <button
                                    onClick={() => setScanMode('BATCH')}
                                    className={tabClass('BATCH')}
                                >
                                    Batch
                                </button>
                                <button
                                    onClick={() => setScanMode('REPLACEMENT')}
                                    className={tabClass('REPLACEMENT')}
                                >
                                    Replacement
                                </button>
                            </div>
                            <div>
                                <h2 className={`text-xl ${isBatch ? 'font-black' : 'font-bold'} tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                                    {scanMode === 'BATCH' ? 'Batch Scan' : scanMode === 'REPLACEMENT' ? 'Battery Replacement' : 'Trace Battery'}
                                </h2>
                                {!isBatch && <p className={`mt-1 max-w-2xl text-sm ${isReplacement ? 'text-amber-50' : 'text-slate-500'}`}>
                                    {scanMode === 'TRACE' ? 'Search a serial number to view battery status, history, and warranty details.' : 'Enter the old and new serial numbers to start a battery replacement.'}
                                </p>}
                            </div>
                        </div>
                    </div>

                </div>

                {isBatch && (
                    <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 md:grid-cols-3">
                        <div className={`rounded-2xl border bg-white/10 p-4 ${dealerFieldError ? 'border-rose-400 bg-rose-500/10' : 'border-white/10'}`}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-[10px] font-black tracking-[0.18em] text-indigo-200/80">Dealer</p>
                                {batchConfig.dealerId && <CheckCircle2 size={14} className="text-emerald-300" />}
                            </div>
                            <select
                                className={`w-full rounded-xl border px-4 py-3 font-bold text-sm text-white outline-none transition-all ${dealerFieldError ? 'border-rose-400 bg-rose-950/30 focus:border-indigo-300 focus:ring-2 focus:ring-rose-400/50' : batchConfig.dealerId ? 'border-emerald-400/40 bg-indigo-950/60 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/40' : 'border-indigo-400/20 bg-indigo-950/60 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/60'}`}
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
                                className={`w-full rounded-xl border px-4 py-3 font-bold text-sm text-white outline-none transition-all ${modelFieldError ? 'border-rose-400 bg-rose-950/30 focus:border-indigo-300 focus:ring-2 focus:ring-rose-400/50' : batchConfig.modelId ? 'border-emerald-400/40 bg-indigo-950/60 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/40' : 'border-indigo-400/20 bg-indigo-950/60 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/60'}`}
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


                {isReplacement && replacementOldAsset?.battery && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <article className="w-full overflow-hidden rounded-2xl border border-white/80 bg-white shadow-lg shadow-orange-950/10">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><BatteryCharging size={20} /></div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Old battery</p>
                                        <p className="truncate font-mono text-base font-bold text-slate-900">{replacementOldAsset.battery.id}</p>
                                    </div>
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-4 py-3 text-xs font-bold uppercase text-emerald-700">
                                    <CheckCircle2 size={17} /> Replacement
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
                                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                                    <span className="shrink-0 rounded-full bg-sky-100 p-2.5 text-sky-700"><MapPin size={19} /></span>
                                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dealer</p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-800" title={oldDealer}>{oldDealer}</p></div>
                                </div>
                                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                                    <span className="shrink-0 rounded-full bg-violet-100 p-2.5 text-violet-600"><Activity size={19} /></span>
                                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Model</p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{replacementOldAsset.battery.model || 'Unknown'}{replacementOldAsset.battery.capacity ? ` · ${replacementOldAsset.battery.capacity}` : ''}</p></div>
                                </div>
                                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                                    <span className="shrink-0 rounded-full bg-emerald-100 p-2.5 text-emerald-600"><PackagePlus size={19} /></span>
                                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sent to dealer</p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{replacementOldAsset.battery.activationDate ? formatDate(replacementOldAsset.battery.activationDate) : 'Not recorded'}</p></div>
                                </div>
                                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                                    <span className="shrink-0 rounded-full bg-orange-100 p-2.5 text-orange-600"><CalendarDays size={19} /></span>
                                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Original sale</p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{oldSaleDate}</p></div>
                                </div>
                            </div>
                        </article>
                    </div>
                )}
                {isReplacement && !isReplacementSearching && replacementOldLookupResult !== 'idle' && !replacementOldAsset?.battery && (
                    <div role="status" className={`flex max-w-3xl items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold animate-in fade-in slide-in-from-top-2 ${replacementOldLookupResult === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        <ShieldAlert size={16} />
                        {replacementOldLookupResult === 'error' ? 'Could not look up this battery. Please try again.' : 'Battery not found. Check the old serial number and try again.'}
                    </div>
                )}

                <div className={`rounded-2xl border p-4 md:p-5 ${isBatch
                    ? 'border-white/10 bg-indigo-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                    : isReplacement ? 'border-white/80 bg-white/95 shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
                    {isBatch && (
                        <div className="mb-4 flex justify-end">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-indigo-100 ring-1 ring-white/10">
                                <CalendarDays size={12} />
                                <span>{formattedBatchDate}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className={`shrink-0 flex gap-2 ${isReplacement ? 'hidden' : ''}`}>
                            <div className={isBatch
                                ? 'rounded-2xl bg-white/10 p-4 text-white ring-1 ring-white/10'
                                : isReplacement
                                    ? 'rounded-xl bg-amber-100 p-3 text-amber-900 ring-1 ring-amber-200'
                                    : 'rounded-xl bg-white p-3 text-slate-600 ring-1 ring-slate-200'}>
                                {isBatch ? <PackagePlus size={32} /> : isReplacement ? <PackagePlus size={32} /> : <Barcode size={32} />}
                            </div>
                        </div>
                        {isReplacement ? (
                            <div className="flex-1 w-full grid md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Old Battery Serial Number</label>
                                    {isReplacementSearching
                                        ? <Loader2 className="absolute left-4 top-[3.1rem] -translate-y-1/2 animate-spin text-orange-600" size={19} />
                                        : <Search className="absolute left-4 top-[3.1rem] -translate-y-1/2 text-slate-400" size={20} />}
                                    <input
                                        ref={inputRef}
                                        disabled={isProcessing}
                                        placeholder="Enter old battery serial number..."
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 outline-none text-sm font-semibold tracking-wide text-slate-900 transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
                                        value={replacementOldSerial}
                                        onChange={(e) => {
                                            onOldBatteryInput();
                                            setReplacementOldSerial(e.target.value);
                                        }}
                                        onBlur={onOldBatteryBlur}
                                        onKeyDown={(e) => e.key === 'Enter' && onOldBatteryBlur()}
                                    />
                                </div>
                                <div className="relative">
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">New Battery Serial Number</label>
                                    <Search className="absolute left-4 top-[3.1rem] -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        disabled={isProcessing}
                                        placeholder="Enter new battery serial number..."
                                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 outline-none text-sm font-semibold tracking-wide text-slate-900 transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 placeholder:text-slate-400"
                                        value={replacementNewSerial}
                                        onChange={(e) => setReplacementNewSerial(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleStartReplacement()}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 w-full relative">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`} size={20} />
                                <input
                                    ref={inputRef}
                                    disabled={isProcessing}
                                    readOnly={isBatch && !batchConfigReady}
                                    placeholder={isBatch ? (batchConfigReady ? "Scan serial..." : "Select dealer and model...") : "Enter serial..."}
                                    className={`w-full rounded-xl border pl-12 pr-6 py-4 outline-none font-bold text-lg transition-all tracking-[0.08em] mono ${isDarkTheme ? `${batchConfigReady || !isBatch ? 'border-white/10 bg-indigo-950/80 text-white placeholder:text-indigo-400 focus:border-indigo-300 focus:bg-indigo-950' : 'border-indigo-300/30 bg-indigo-950/55 text-indigo-100 placeholder:text-slate-400/80 cursor-not-allowed'}` : 'bg-white border-slate-200 text-slate-900 shadow-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/5'}`}
                                    value={scanBuffer}
                                    onChange={(e) => {
                                        if (isBatch && !batchConfigReady) return;
                                        setScanBuffer(e.target.value);
                                    }}
                                    onFocus={triggerBatchConfigAlert}
                                    onClick={triggerBatchConfigAlert}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(scanBuffer)}
                                />
                                {isProcessing && <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${isDarkTheme ? 'text-white' : 'text-blue-600'}`} size={20} />}
                            </div>
                        )}
                        <div className="flex w-full gap-3 md:w-auto">
                            <button
                                onClick={isReplacement ? handleStartReplacement : () => handleSearch(scanBuffer)}
                                disabled={isProcessing || (isReplacement
                                    ? (!replacementOldSerial.trim() || !replacementNewSerial.trim())
                                    : (!scanBuffer || (isBatch && (!batchConfig.dealerId || !batchConfig.modelId))))}
                                className={isBatch
                                    ? 'flex-1 rounded-xl bg-white px-8 py-4 text-sm font-bold tracking-[0.08em] text-indigo-900 shadow-lg transition-all hover:bg-indigo-50 active:scale-95 disabled:opacity-30 md:flex-none'
                                    : `inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 md:flex-none ${isReplacement ? 'bg-gradient-to-r from-orange-500 to-orange-700 text-white hover:from-orange-600 hover:to-orange-800' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                {isBatch ? 'Stage' : isProcessing ? <><Loader2 className="animate-spin" size={16} />{isReplacement ? 'Checking…' : 'Searching…'}</> : isReplacement ? 'Start Exchange' : 'Trace'}
                            </button>

                            {(isReplacement ? (replacementOldSerial || replacementNewSerial) : (activeAsset || scanBuffer)) && (
                                <button
                                    onClick={handleClear}
                                    className={`p-4 rounded-xl transition-all active:scale-95 ${isBatch ? 'bg-white/10 text-indigo-100 hover:bg-rose-400/20 hover:text-white' : isReplacement ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'}`}
                                    title="Clear Search"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {isBatch && (
                        <div className="mt-4 space-y-3">
                            {showBatchConfigAlert && !batchConfigReady && (
                                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                                    Select dealer and model first.
                                </div>
                            )}
                            {(selectedDealer || selectedModel || isBatch) && (
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
