
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Database } from '../db';
import {
  Barcode, Search, ShieldCheck, History,
  RefreshCw, Store, Phone, Calendar,
  X, CheckCircle, ArrowRight, PackagePlus,
  Loader2, Zap, LayoutGrid, Package, ArrowDown,
  AlertCircle, ShieldAlert, BadgeCheck, Clock,
  User, ChevronRight, Layers, FileText, Smartphone, Copy,
  Printer, Download, FileSpreadsheet, FileJson, StickyNote,
  ArrowDownCircle, HelpCircle, ArrowRightLeft, AlertOctagon,
  ShieldQuestion, CheckCircle2, FileCheck, ClipboardList, Activity, ChevronDown
} from 'lucide-react';
import { formatDate } from '../utils';
import { StatusDisplay } from '../components/StatusDisplay';
import { BatteryStatus, Dealer, Battery, WarrantyCardStatus, BatteryModel } from '../types';

interface ScannerProps {
  initialSearch?: string | null;
  onSearchHandled?: () => void;
}

const TraceHub: React.FC<ScannerProps> = ({ initialSearch, onSearchHandled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);

  const [scanBuffer, setScanBuffer] = useState('');
  const [activeAsset, setActiveAsset] = useState<any>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [showAddStock, setShowAddStock] = useState(false);
  const [missingSerial, setMissingSerial] = useState('');
  const [stockForm, setStockForm] = useState({ modelId: '', capacity: '', warranty: 0 });

  // Batch Assignment Mode State
  const [batchMode, setBatchMode] = useState(false);
  const [batchConfig, setBatchConfig] = useState({ dealerId: '', modelId: '' });
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [stagedItems, setStagedItems] = useState<any[]>([]);

  // Calculate summary for batch mode
  const batchSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    stagedItems.forEach(item => {
      counts[item.model] = (counts[item.model] || 0) + 1;
    });
    return counts;
  }, [stagedItems]);


  const [isReplacing, setIsReplacing] = useState(false);
  const [isConfirmingReplacement, setIsConfirmingReplacement] = useState(false);
  const [replacementData, setReplacementData] = useState({
    newBatteryId: '',
    dealerId: '',
    reason: 'DEAD CELL',
    problemDescription: '',
    replacementDate: new Date().toISOString().split('T')[0],
    warrantyCardStatus: 'RECEIVED' as WarrantyCardStatus
  });

  // Name Validation State


  useEffect(() => {
    const init = async () => {
      const [d, m] = await Promise.all([
        Database.getAll<Dealer>('dealers'),
        Database.getAll<BatteryModel>('models')
      ]);
      setDealers(d);
      setModels(m);
    };
    init();
    focusMainInput();
  }, []);

  useEffect(() => {
    if (initialSearch) {
      handleSearch(initialSearch);
      if (onSearchHandled) onSearchHandled();
    }
  }, [initialSearch]);

  useEffect(() => {
    if (isReplacing && activeAsset?.battery?.dealerId) {
      setReplacementData(prev => ({ ...prev, dealerId: activeAsset.battery.dealerId }));
      setTimeout(() => replacementInputRef.current?.focus(), 150);
    }
  }, [isReplacing, activeAsset]);

  const focusMainInput = () => {
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message, type } }));
  };

  const handleSearch = async (id: string, isAutoScan = false) => {
    if (!id) return;
    const cleanId = id.toUpperCase().trim();

    // BATCH MODE LOGIC
    if (batchMode && batchConfig.dealerId && batchConfig.modelId) {
      if (stagedItems.find(i => i.id === cleanId)) {
        notify(`${cleanId} already staged`, 'error');
        setScanBuffer('');
        return;
      }

      setIsProcessing(true);
      try {
        const selectedModel = models.find(m => m.id === batchConfig.modelId);
        if (!selectedModel) throw new Error("Invalid Model");

        const data = await Database.searchBattery(cleanId);

        // BUG FIX: Prevent batch usage of Sold/Dead units
        if (data && data.battery && data.battery.status !== BatteryStatus.MANUFACTURED) {
          notify(`Cannot stage ${data.battery.status} unit`, 'error');
          setScanBuffer('');
          return;
        }

        const newItem = {
          id: cleanId,
          model: selectedModel.name,
          dealerId: batchConfig.dealerId,
          dealerName: dealers.find(d => d.id === batchConfig.dealerId)?.name || 'DEALER',
          exists: !!(data && data.battery),
          capacity: selectedModel.defaultCapacity,
          manufactureDate: new Date().toISOString().split('T')[0],
          status: BatteryStatus.ACTIVE,
          warrantyMonths: selectedModel.defaultWarrantyMonths
        };

        setStagedItems(prev => [newItem, ...prev]);
        setLastScanned(cleanId);
        notify(`${cleanId} staged`);

      } catch (e) {
        notify('Batch Scan Failed', 'error');
      } finally {
        setIsProcessing(false);
        setScanBuffer('');
        focusMainInput();
      }
      return;
    }


    // NORMAL MODE LOGIC
    setIsProcessing(true);
    setActiveAsset(null);
    setIsReplacing(false);
    setIsConfirmingReplacement(false);
    setShowAddStock(false);

    try {
      if (!isAutoScan) await new Promise(r => setTimeout(r, 400));
      const data = await Database.searchBattery(cleanId);
      if (data && data.battery) {
        setActiveAsset(data);
        if (data.battery.dealerId) {
          // Auto-fill registration form is no longer needed as units are auto-activated
        }
        notify(`${cleanId} traced successfully`);
      } else {
        setMissingSerial(cleanId);
        setShowAddStock(true);
        notify(`${cleanId} not found in registry`, 'error');
      }
    } catch (e) {
      notify('Trace Interrupted', 'error');
    } finally {
      setIsProcessing(false);
      setScanBuffer('');
      focusMainInput();
    }
  };

  const handlePrintReport = () => window.print();

  const removeStagedItem = (id: string) => {
    setStagedItems(prev => prev.filter(item => item.id !== id));
    if (lastScanned === id) setLastScanned(null);
    notify(`${id} removed from stage`);
  };




  const handleReplacementRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;

    const newUnitId = replacementData.newBatteryId.toUpperCase().trim();

    // Check for empty
    if (!newUnitId) return;

    // Check if the unit exists (Should NOT exist for fresh replacement)
    const newUnitCheck = await Database.searchBattery(newUnitId);

    if (newUnitCheck && newUnitCheck.battery) {
      notify(`Stock Conflict: ID ${newUnitId} is already registered. Use a fresh stamp.`, 'error');
      return;
    }

    // 3. LOGIC: Model validation (e.g., SL30 to SL30 only) - This check is no longer needed here as the new unit doesn't exist yet.
    // The new unit will be created with the same model as the old unit.

    setIsConfirmingReplacement(true);
  };

  const executeReplacement = async () => {
    if (!activeAsset) return;
    setIsActionLoading(true);
    setIsConfirmingReplacement(false);
    const newUnitId = replacementData.newBatteryId.toUpperCase().trim();

    try {
      // 1. Create the new battery record first (Fresh Stock)
      // We clone the physical specs (Model/Capacity) from the old unit
      await Database.addBattery({
        id: newUnitId,
        model: activeAsset.battery.model,
        capacity: activeAsset.battery.capacity,
        manufactureDate: new Date().toISOString().split('T')[0],
        status: BatteryStatus.MANUFACTURED,
        replacementCount: 0,
        warrantyMonths: activeAsset.battery.warrantyMonths, // Inherit policy duration
        dealerId: activeAsset.battery.dealerId || 'CENTRAL' // Assign to same dealer immediately (QA FIX: Normalized fallback)
      });

      // 2. Execute the official Swap Protocol
      await Database.addReplacement({
        id: `REP-${Date.now()}`,
        oldBatteryId: activeAsset.battery.id,
        newBatteryId: newUnitId,
        dealerId: activeAsset.battery.dealerId || 'CENTRAL',
        replacementDate: replacementData.replacementDate,
        reason: replacementData.reason,
        problemDescription: '',
        warrantyCardStatus: replacementData.warrantyCardStatus
      }, {
        customerName: activeAsset.battery.customerName,
        customerPhone: activeAsset.battery.customerPhone,
        warrantyExpiry: activeAsset.battery.warrantyExpiry
      });

      notify('Exchange Sequence Complete. New Unit Active.', 'success');
      setReplacementData({
        newBatteryId: '',
        dealerId: '',
        reason: 'DEAD CELL',
        problemDescription: '',
        replacementDate: new Date().toISOString().split('T')[0],
        warrantyCardStatus: 'RECEIVED' as WarrantyCardStatus
      });
      setIsReplacing(false);

      // Reload to show the new state
      handleSearch(activeAsset.battery.id);
    } catch (e) {
      console.error(e);
      notify('Exchange failed during write protocol', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const isExpired = activeAsset?.battery?.warrantyExpiry ? new Date() > new Date(activeAsset.battery.warrantyExpiry) : false;

  const getStatusBadge = (status: BatteryStatus, expired: boolean) => {
    if (expired && status !== BatteryStatus.MANUFACTURED) return "bg-rose-50 text-rose-700 border-rose-200";
    switch (status) {
      case BatteryStatus.ACTIVE: return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case BatteryStatus.REPLACEMENT: return "bg-amber-50 text-amber-700 border-amber-200";
      case BatteryStatus.RETURNED: return "bg-slate-100 text-slate-700 border-slate-300";
      default: return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const formatReference = (status: WarrantyCardStatus | string) => {
    switch (status) {
      case 'RECEIVED': return 'Original Card';
      case 'XEROX': return 'Xerox Copy';
      case 'WHATSAPP': return 'WhatsApp/Digital';
      case 'NOT_RECEIVED': return 'Not Received';
      default: return status || 'N/A';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 tracking-tight">
      <div className={`transition-all duration-300 ${batchMode ? 'bg-indigo-900 border-indigo-700' : 'bg-white border-slate-200'} border rounded-2xl p-8 shadow-sm no-print`}>
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => setBatchMode(!batchMode)} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${batchMode ? 'bg-white text-indigo-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {batchMode ? 'Batch Mode Active' : 'Normal Trace'}
              </button>
              {batchMode && <span className="text-indigo-200 text-xs font-bold uppercase animate-pulse">Ready for rapid assignment</span>}
            </div>
            {batchMode && lastScanned && <div className="text-white font-mono text-sm">Last: {lastScanned} <CheckCircle2 className="inline text-emerald-400" size={16} /></div>}
          </div>

          {batchMode && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <select className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400" value={batchConfig.dealerId} onChange={e => setBatchConfig({ ...batchConfig, dealerId: e.target.value })}>
                <option value="">Select Target Dealer</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="px-4 py-3 bg-indigo-800 border-indigo-700 text-white rounded-xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-400" value={batchConfig.modelId} onChange={e => setBatchConfig({ ...batchConfig, modelId: e.target.value })}>
                <option value="">Select Default Model</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0"><div className={`${batchMode ? 'bg-white/10 text-white' : 'bg-blue-600/10 text-blue-600'} p-4 rounded-2xl`}><Barcode size={32} /></div></div>
            <div className="flex-1 w-full relative">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${batchMode ? 'text-indigo-300' : 'text-slate-400'}`} size={20} />
              <input ref={inputRef} disabled={isProcessing} placeholder={batchMode ? "SCAN TO STAGE..." : "Input serial identifier..."} className={`w-full pl-12 pr-6 py-4 rounded-xl outline-none font-bold text-lg transition-all uppercase tracking-widest mono ${batchMode ? 'bg-indigo-950/50 border-indigo-700 text-white placeholder:text-indigo-400 focus:bg-indigo-950 focus:border-indigo-400' : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500'}`} value={scanBuffer} onChange={(e) => setScanBuffer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(scanBuffer)} />
              {isProcessing && <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${batchMode ? 'text-white' : 'text-blue-600'}`} size={20} />}
            </div>
            <button onClick={() => handleSearch(scanBuffer)} disabled={isProcessing || !scanBuffer || (batchMode && (!batchConfig.dealerId || !batchConfig.modelId))} className={`px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-30 uppercase tracking-widest ${batchMode ? 'bg-white text-indigo-900 hover:bg-indigo-50' : 'bg-slate-900 text-white hover:bg-black'}`}>{batchMode ? 'Stage' : 'Trace Unit'}</button>
          </div>

          {batchMode && stagedItems.length > 0 && (
            <div className="border-t border-indigo-800 pt-6 animate-in slide-in-from-top-2">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center text-indigo-200 text-[10px] font-bold uppercase tracking-widest">
                    <span>Staging Log ({stagedItems.length})</span>
                    <button onClick={() => setStagedItems([])} className="hover:text-white transition-colors">Clear All</button>
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {stagedItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-indigo-950/50 rounded-lg border border-indigo-800/50 group/item">
                        <div className="flex flex-col">
                          <span className="text-white font-mono font-bold text-xs">{item.id}</span>
                          <span className="text-[10px] font-bold text-indigo-400">{item.model}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.exists ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">UPDATE</span> : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">NEW</span>}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeStagedItem(item.id); }}
                            className="p-1.5 text-indigo-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover/item:opacity-100"
                            title="Remove from stage"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-64 bg-indigo-950 rounded-xl p-6 flex flex-col justify-between shrink-0 border border-indigo-800">
                  <div className="space-y-4">
                    <h4 className="text-white font-bold text-sm uppercase tracking-tight">Batch Summary</h4>
                    <div className="space-y-2">
                      {Object.entries(batchSummary).map(([model, count]) => (
                        <div key={model} className="flex justify-between text-xs font-bold text-indigo-200 uppercase">
                          <span>{model}</span>
                          <span className="text-white mono">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setIsActionLoading(true);
                      await Database.batchAssign(stagedItems);
                      notify(`Processed ${stagedItems.length} items`);
                      setStagedItems([]);
                      setIsActionLoading(false);
                    }}
                    disabled={isActionLoading}
                    className="mt-6 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isActionLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Confirm Process
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddStock && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl animate-in zoom-in-95 no-print text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldQuestion size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Unregistered Unit Found</h3>
          <p className="text-slate-500 font-medium mb-8">
            The identifier <span className="font-mono font-bold text-slate-900">{missingSerial}</span> is not in the registry.
            To add new stock and assign it to a partner, please switch to Batch Mode.
          </p>

          <button
            onClick={() => {
              setBatchMode(true);
              setShowAddStock(false);
              setScanBuffer('');
              setMissingSerial('');
            }}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-3 group"
          >
            <Layers size={18} className="group-hover:scale-110 transition-transform" />
            Switch to Batch Mode
          </button>
        </div>
      )}

      {activeAsset && (() => {
        const isExp = activeAsset.battery.warrantyExpiry ? new Date() > new Date(activeAsset.battery.warrantyExpiry) : false;
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

            {/* Status Banner System */}
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
                  <div className="flex items-center space-x-4"><h1 className="text-4xl font-black tracking-tight text-slate-900 mono uppercase">{activeAsset.battery.id}</h1></div>
                  <p className="text-slate-500 font-bold text-lg uppercase">{activeAsset.battery.model} • {activeAsset.battery.capacity}</p>
                </div>
                <button onClick={handlePrintReport} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 no-print flex items-center gap-2">
                  <Printer size={20} />
                  <span className="text-xs font-bold uppercase">Print Details</span>
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ownership record</p><div className="flex items-center space-x-3">{activeAsset.battery.customerName ? <><div className="p-2 bg-slate-50 rounded-lg"><User size={18} /></div><span className="font-bold text-slate-900 uppercase">{activeAsset.battery.customerName}</span></> : <p className="text-sm font-bold text-slate-300 italic">Inventory Stock</p>}</div></div>
                <div className="space-y-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lifecycle timeline</p><div className="space-y-2 text-xs font-bold"><div className="flex justify-between"><span className="text-slate-400">Sold On</span><span className="mono">{formatDate(activeAsset.battery.activationDate)}</span></div><div className="flex justify-between"><span className="text-slate-400">Expiry</span><span className="mono text-rose-600 font-black">{formatDate(activeAsset.battery.warrantyExpiry)}</span></div></div></div>
                <div className="space-y-4"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dispatch metadata</p><div className="space-y-2 text-xs font-bold"><div className="flex justify-between"><span className="text-slate-400">Dealer</span><span className="text-blue-600 truncate max-w-[120px] uppercase">{dealers.find(d => d.id === activeAsset.battery.dealerId)?.name || 'Central'}</span></div><div className="flex justify-between"><span className="text-slate-400">Swap count</span><span className="mono">{activeAsset.battery.replacementCount}</span></div></div></div>
              </div>
            </div>

            <div className="no-print">
              {activeAsset.battery.status === BatteryStatus.MANUFACTURED ? (
                <div className="bg-blue-600 p-8 rounded-2xl shadow-xl flex justify-between items-center text-white"><div><h3 className="text-xl font-bold uppercase tracking-tight mb-2">Central Stock Unit</h3><p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">This unit is currently in central stock. Use Batch Mode to dispatch and activate.</p></div><Package size={32} className="opacity-40" /></div>
              ) : !isExpired && activeAsset.battery.status !== BatteryStatus.RETURNED ? (
                <div className="space-y-6">
                  {!isReplacing && !isConfirmingReplacement && (
                    <button onClick={() => setIsReplacing(true)} className="w-full py-5 bg-slate-950 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 hover:bg-black transition-all shadow-2xl active:scale-[0.98] uppercase tracking-widest"><RefreshCw size={20} /><span>Initialize warranty exchange</span></button>
                  )}

                  {isReplacing && !isConfirmingReplacement && (
                    <div className="bg-white border-2 border-amber-100 rounded-2xl p-8 shadow-2xl animate-in slide-in-from-top-4 space-y-8">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Exchange Protocol</h3>
                          <p className="text-[10px] font-bold text-amber-600 uppercase">Swapping {activeAsset.battery.model} Identity</p>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                          <Store size={14} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Assigning to: <span className="text-slate-900">{dealers.find(d => d.id === replacementData.dealerId)?.name || 'Central Stock'}</span></span>
                        </div>
                        <button onClick={() => setIsReplacing(false)}><X size={24} className="text-slate-300 hover:text-slate-900" /></button>
                      </div>
                      <form onSubmit={handleReplacementRequest} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">New Unit ID</label>
                          <input ref={replacementInputRef} required placeholder="Serial ID" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-blue-600 uppercase mono" value={replacementData.newBatteryId} onChange={e => setReplacementData({ ...replacementData, newBatteryId: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Failure Mode</label>
                          <select required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm uppercase" value={replacementData.reason} onChange={e => setReplacementData({ ...replacementData, reason: e.target.value })}><option value="DEAD CELL">Dead Cell</option><option value="INTERNAL SHORT">Internal Short</option><option value="BULGE">Casing Bulge</option></select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Evidence Status</label>
                          <select required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm uppercase" value={replacementData.warrantyCardStatus} onChange={e => setReplacementData({ ...replacementData, warrantyCardStatus: e.target.value as WarrantyCardStatus })}><option value="RECEIVED">Original card collected</option><option value="XEROX">Xerox copy</option><option value="WHATSAPP">Digital evidence</option></select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Exchange Date</label>
                          <input required type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm" value={replacementData.replacementDate} onChange={e => setReplacementData({ ...replacementData, replacementDate: e.target.value })} />
                        </div>
                        <div className="flex items-end">
                          <button type="submit" className="w-full bg-amber-600 text-white font-bold py-4 rounded-xl hover:bg-amber-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2">Verify <ArrowRight size={16} /></button>
                        </div>
                      </form>
                    </div>
                  )}

                  {isConfirmingReplacement && (
                    <div className="bg-slate-900 text-white rounded-3xl p-10 border-4 border-amber-600 shadow-2xl animate-in zoom-in-95 duration-300 space-y-10">
                      <div className="flex items-center space-x-5 border-b border-white/10 pb-8"><div className="p-4 bg-amber-600 rounded-2xl"><ShieldQuestion size={32} /></div><div><h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Authorization Required</h3><p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">Validate asset mapping before committing to registry.</p></div></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                          <div className="space-y-1"><p className="text-[10px] font-bold text-slate-500 uppercase">Old Serial ({activeAsset.battery.model})</p><p className="text-xl font-black mono text-slate-300">{activeAsset.battery.id}</p></div>
                          <ArrowRight className="text-slate-700" size={24} />
                          <div className="space-y-1 text-right"><p className="text-[10px] font-bold text-slate-500 uppercase">New Serial ({activeAsset.battery.model})</p><p className="text-xl font-black mono text-blue-400">{replacementData.newBatteryId}</p></div>
                        </div>
                        <div className="flex gap-4 items-center">
                          <button onClick={() => setIsConfirmingReplacement(false)} className="flex-1 py-5 bg-white/5 text-slate-400 font-bold rounded-xl hover:bg-white/10 uppercase tracking-widest text-xs">Back</button>
                          <button onClick={executeReplacement} disabled={isActionLoading} className="flex-[2] py-5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-3">{isActionLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Finalize Swap</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><h3 className="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight"><History size={18} className="text-slate-400" /> Asset Audit History</h3><span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Protocol Segments: {activeAsset.lineage.length}</span></div>
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100"><th className="px-8 py-4">Identity</th><th className="px-8 py-4">State</th><th className="px-8 py-4">Sale Date</th><th className="px-8 py-4">Outcome / Evidence</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {activeAsset.lineage.map((item: any) => {
                    const next = activeAsset.replacements.find((r: any) => r.oldBatteryId === item.id);
                    const isCurrent = item.id === activeAsset.battery.id;

                    const itemExpired = item.warrantyExpiry ? new Date() > new Date(item.warrantyExpiry) : false;

                    return (
                      <tr key={item.id} className={`${isCurrent ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-all`}>
                        <td className="px-8 py-6 font-bold text-slate-900 mono text-sm flex items-center gap-3">
                          {item.id}
                          {isCurrent && <span className="bg-blue-100 text-blue-700 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                        </td>
                        <td className="px-8 py-6"><span className={`px-2 py-1 text-[10px] font-bold border rounded-full uppercase tracking-wide ${getStatusBadge(item.status, itemExpired)}`}>{itemExpired ? 'EXPIRED' : item.status}</span></td>
                        <td className="px-8 py-6 font-bold text-slate-500 text-xs mono">{formatDate(item.activationDate)}</td>
                        <td className="px-8 py-6">
                          {next ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs font-bold text-amber-700 flex items-center gap-1 uppercase"><AlertCircle size={14} /> FAILED: {next.reason}</div>
                              <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase pl-5"><ArrowRight size={10} className="text-blue-500" /> Replaced by: <span className="font-mono text-blue-600 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleSearch(next.newBatteryId); }}>{next.newBatteryId}</span></div>
                              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase pl-5"><FileText size={10} /> Doc: {formatReference(next.warrantyCardStatus)}</div>
                            </div>
                          ) : item.status === BatteryStatus.ACTIVE ? (
                            itemExpired ? (
                              <div className="text-xs font-bold text-rose-600 flex items-center gap-1 uppercase"><X size={14} /> Warranty Expired</div>
                            ) : (
                              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 size={14} /> Healthy / Active</div>
                            )
                          ) : <span className="text-slate-300 font-bold text-xs">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  );
};

export default TraceHub;
