
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Database } from '../db';
import { BatteryStatus, Replacement, Battery, Dealer } from '../types';
import {
  RefreshCw, Search, ShieldAlert, ArrowRight,
  ClipboardList, Activity, ChevronDown, CheckCircle2, History, X, Calendar,
  ShieldQuestion, Loader2
} from 'lucide-react';
import { formatDate } from '../utils';
import { StatusDisplay } from '../components/StatusDisplay';

const FAILURE_MODES = [
  "Dead Cell", "Charging Circuit Failure", "Internal Short-Circuit",
  "Excessive Plate Sulfation", "Casing Bulge / Leak", "Voltage Drop Under Load",
  "Manufacturing Defect", "Self-Discharge Issue"
];

const Replacements: React.FC = () => {
  const [db, setDb] = useState<{ batteries: Battery[], dealers: Dealer[], replacements: Replacement[] }>({
    batteries: [], dealers: [], replacements: []
  });
  const [searchId, setSearchId] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    battery: Battery;
    sale: any;
    originalSale: any;
    lineage: Battery[];
    replacements: any[];
    isValid: boolean;
    error?: string;
    blockType?: 'expired' | 'returned' | 'invalid' | 'not-sold';
  } | null>(null);

  const [newSerialSearch, setNewSerialSearch] = useState('');
  const [showNewSerialDropdown, setShowNewSerialDropdown] = useState(false);
  const serialRef = useRef<HTMLDivElement>(null);

  const [dealerSearch, setDealerSearch] = useState('');
  const [showDealerDropdown, setShowDealerDropdown] = useState(false);
  const dealerRef = useRef<HTMLDivElement>(null);

  const [reasonSearch, setReasonSearch] = useState('Dead Cell');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const reasonRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    newBatteryId: '',
    dealerId: '',
    reason: 'Dead Cell',
    problemDescription: '',
    cardReturned: false,
    soldDate: '',
    paidInAccount: false
  });

  const [step, setStep] = useState(1);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Enterprise Scale: Only load necessary data (dealers)
  const loadData = async () => {
    // Only load dealers for dropdown
    const dealers = await Database.getAll<Dealer>('dealers');
    setDb({ batteries: [], dealers, replacements: [] });
  };

  useEffect(() => {
    loadData();
    window.addEventListener('db-synced', loadData);
    const handleClickOutside = (event: MouseEvent) => {
      if (serialRef.current && !serialRef.current.contains(event.target as Node)) setShowNewSerialDropdown(false);
      if (dealerRef.current && !dealerRef.current.contains(event.target as Node)) setShowDealerDropdown(false);
      if (reasonRef.current && !reasonRef.current.contains(event.target as Node)) setShowReasonDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('db-synced', loadData);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Enterprise Scale: Search Stock Server-Side
  const [stockResults, setStockResults] = useState<Battery[]>([]);

  useEffect(() => {
    const searchStock = async () => {
      if (!newSerialSearch) {
        setStockResults([]);
        return;
      }
      // If validation passed, restrict model
      const model = validationResult?.battery?.model;
      const results = await Database.searchStock(newSerialSearch, model);
      setStockResults(results);
    };
    const timer = setTimeout(searchStock, 300);
    return () => clearTimeout(timer);
  }, [newSerialSearch, validationResult]);

  const filteredDealers = useMemo(() => {
    if (!dealerSearch) return db.dealers;
    return db.dealers.filter(d =>
      d.name.toLowerCase().includes(dealerSearch.toLowerCase()) || d.id.toLowerCase().includes(dealerSearch.toLowerCase())
    );
  }, [db.dealers, dealerSearch]);

  const filteredReasons = useMemo(() => {
    if (!reasonSearch) return FAILURE_MODES;
    return FAILURE_MODES.filter(r => r.toLowerCase().includes(reasonSearch.toLowerCase()));
  }, [reasonSearch]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setIsValidating(true);
    setSuccess('');
    setValidationResult(null);

    const result = await Database.searchBattery(searchId);
    setIsValidating(false);

    if (!result || !result.battery) {
      setValidationResult({
        battery: null as any, sale: null, originalSale: null, lineage: [], replacements: [],
        isValid: false, error: 'Serial not found in registry.'
      });
      return;
    }

    const { battery, sale, originalSale, lineage, replacements } = result;

    // Logic: A returned battery has already finished its lifecycle and been replaced. No further exchange allowed.
    if (battery.status === BatteryStatus.RETURNED) {
      setValidationResult({
        battery, sale, originalSale, lineage, replacements,
        isValid: false,
        blockType: 'returned',
        error: `Already returned to warehouse. Replaced by unit: ${battery.nextBatteryId}.`
      });
      return;
    }

    if (battery.status === BatteryStatus.MANUFACTURED) {
      setValidationResult({ battery, sale: null, originalSale: null, lineage: [], replacements: [], isValid: false, blockType: 'not-sold', error: `Unit is unactivated stock.` });
      return;
    }

    const sourceSale = originalSale || sale;
    if (!sourceSale) {
      setValidationResult({ battery, sale: null, originalSale: null, lineage, replacements, isValid: false, error: 'No sales record found.' });
      return;
    }

    const isExpired = new Date() > new Date(sourceSale.warrantyExpiry);
    if (isExpired) {
      setValidationResult({ battery, sale, originalSale, lineage, replacements, isValid: false, blockType: 'expired', error: `Expired on ${formatDate(sourceSale.warrantyExpiry)}.` });
      return;
    }

    setValidationResult({ battery, sale, originalSale, lineage, replacements, isValid: true });
    // Default soldDate to when battery was dispatched to dealer (activationDate)
    setFormData(prev => ({ ...prev, soldDate: battery.activationDate || '' }));
  };

  const handleReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationResult?.isValid || !formData.newBatteryId || !formData.dealerId) return;

    if (step === 1) {
      setStep(2);
      return;
    }

    // Validate soldDate before proceeding to confirmation
    if (!formData.soldDate || formData.soldDate.trim() === '') {
      alert('⚠️ Please select the Original Sale Date (Battery Sold by Dealer)');
      return;
    }

    setIsConfirming(true);
  };

  const executeFinalReplacement = async () => {
    if (!validationResult?.isValid) return;
    setIsActionLoading(true);

    const replacement: Replacement = {
      id: `REP-${Date.now()}`,
      oldBatteryId: validationResult.battery.id,
      newBatteryId: formData.newBatteryId,
      dealerId: formData.dealerId,
      replacementDate: new Date().toISOString().split('T')[0],
      reason: formData.reason,
      problemDescription: formData.problemDescription,
      warrantyCardStatus: formData.cardReturned ? 'RECEIVED' : 'NOT_RECEIVED',
      paidInAccount: formData.paidInAccount
    };

    const sourceSale = validationResult.originalSale || validationResult.sale;

    // Calculate new expiry based on soldDate
    let finalExpiry = validationResult.originalSale?.warrantyExpiry || validationResult.sale?.warrantyExpiry;
    if (formData.soldDate) {
      const months = validationResult.battery.warrantyMonths || 24;
      const newExp = new Date(formData.soldDate);
      newExp.setMonth(newExp.getMonth() + months);
      finalExpiry = newExp.toISOString().split('T')[0];
    }

    await Database.addReplacement(replacement, {
      customerName: sourceSale?.customerName,
      customerPhone: sourceSale?.customerPhone,
      warrantyExpiry: finalExpiry,
      correctedOriginalSaleDate: formData.soldDate
    });
    setSuccess(`New unit ${formData.newBatteryId} issued successfully.`);
    setValidationResult(null);
    setSearchId('');
    setFormData({ ...formData, newBatteryId: '', dealerId: '', problemDescription: '', reason: 'Dead Cell', soldDate: '', paidInAccount: false });
    setNewSerialSearch('');
    setDealerSearch('');
    setReasonSearch('Dead Cell');
    setStep(1);
    setIsConfirming(false);
    setIsActionLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Warranty Claims</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Authorization Console</p>
          </div>

          <form onSubmit={handleValidate} className="flex gap-2 flex-1 md:max-w-md">
            <div className="relative flex-1">
              <RefreshCw className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="FAILED SERIAL..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none font-bold text-slate-900 text-sm uppercase tracking-tight focus:border-blue-500 transition-all bg-slate-50"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              />
            </div>
            <button type="submit" disabled={isValidating} className="px-6 py-2.5 bg-slate-900 text-white font-bold text-[10px] uppercase rounded-xl tracking-widest hover:bg-black transition-all flex items-center justify-center space-x-2 disabled:bg-slate-200">
              <Activity size={14} className={isValidating ? 'animate-spin' : ''} />
              <span>{isValidating ? 'Verifying...' : 'Validate'}</span>
            </button>
          </form>
        </div>
      </div>

      {validationResult && !validationResult.isValid && (
        <div className={`p-5 rounded-2xl border flex items-center space-x-3 animate-in shake ${validationResult.blockType === 'returned' || validationResult.blockType === 'expired' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <ShieldAlert size={18} />
          <p className="text-[11px] font-bold uppercase tracking-widest">Claim Denied: {validationResult.error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between text-emerald-600 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <CheckCircle2 size={18} />
            <p className="text-[11px] font-bold uppercase tracking-widest">{success}</p>
          </div>
          <button onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}

      {validationResult?.isValid && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-500">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between h-48">
              <div>
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Claimant Identity</p>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight uppercase truncate">{validationResult.originalSale?.customerName}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{validationResult.originalSale?.customerPhone}</p>
                  </div>
                  <StatusDisplay
                    status={validationResult.battery.status}
                    isExpired={false}
                    variant="badge"
                    className="!bg-white/10 !text-white !border-white/20"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Policy Valid Until</p>
                <p className="text-sm font-bold font-mono text-rose-600">{formatDate(validationResult.originalSale?.warrantyExpiry)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Architecture Reference</p>
              <h3 className="text-sm font-bold text-slate-900 uppercase">{validationResult.battery.model}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{validationResult.battery.capacity}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm h-full">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center">
                  <ClipboardList size={16} className="mr-2 text-blue-600" /> Exchange Authorization
                </h3>
              </div>

              <form onSubmit={handleReplacement} className="space-y-6">
                {step === 1 ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative" ref={serialRef}>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Replacement Unit Identity</label>
                        <div className="relative mt-1.5">
                          <input
                            required
                            placeholder="SCAN/TYPE NEW ID..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm focus:border-blue-500 transition-all pr-10 mono uppercase"
                            value={newSerialSearch}
                            onFocus={() => setShowNewSerialDropdown(true)}
                            onChange={(e) => { setNewSerialSearch(e.target.value.toUpperCase()); setShowNewSerialDropdown(true); }}
                          />
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        {showNewSerialDropdown && (
                          <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in slide-in-from-top-1">
                            {stockResults.length > 0 ? stockResults.map(b => (
                              <button key={b.id} type="button" onClick={() => { setFormData({ ...formData, newBatteryId: b.id }); setNewSerialSearch(b.id); setShowNewSerialDropdown(false); }} className="w-full px-4 py-2.5 text-left hover:bg-slate-50 text-[11px] font-bold uppercase border-b border-slate-50 last:border-0">{b.id}</button>
                            )) : <div className="p-4 text-center text-[9px] font-bold text-slate-400 uppercase">No matching stock found</div>}
                          </div>
                        )}
                      </div>

                      <div className="relative" ref={dealerRef}>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Servicing Dealer</label>
                        <div className="relative mt-1.5">
                          <input
                            required
                            placeholder="SEARCH DEALER..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm focus:border-blue-500 transition-all pr-10"
                            value={dealerSearch}
                            onFocus={() => setShowDealerDropdown(true)}
                            onChange={(e) => { setDealerSearch(e.target.value); setShowDealerDropdown(true); }}
                          />
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        {showDealerDropdown && (
                          <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in slide-in-from-top-1">
                            {filteredDealers.length > 0 ? filteredDealers.map(d => (
                              <button key={d.id} type="button" onClick={() => { setFormData({ ...formData, dealerId: d.id }); setDealerSearch(d.name); setShowDealerDropdown(false); }} className="w-full px-4 py-2.5 text-left hover:bg-slate-50 text-[11px] font-bold border-b border-slate-50 last:border-0 uppercase">{d.name}</button>
                            )) : <div className="p-4 text-center text-[9px] font-bold text-slate-400 uppercase">No Dealer Found</div>}
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="submit" disabled={!formData.newBatteryId || !formData.dealerId} className="w-full py-5 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all disabled:opacity-20 shadow-xl flex items-center justify-center gap-3">Next Protocol Step <ArrowRight size={18} /></button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative" ref={reasonRef}>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Failure Mode</label>
                        <div className="relative mt-1.5">
                          <input
                            required
                            placeholder="SELECT REASON..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm focus:border-blue-500 transition-all pr-10"
                            value={reasonSearch}
                            onFocus={() => setShowReasonDropdown(true)}
                            onChange={(e) => { setReasonSearch(e.target.value); setShowReasonDropdown(true); }}
                          />
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        {showReasonDropdown && (
                          <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-in slide-in-from-top-1">
                            {filteredReasons.length > 0 ? filteredReasons.map(r => (
                              <button key={r} type="button" onClick={() => { setFormData({ ...formData, reason: r }); setReasonSearch(r); setShowReasonDropdown(false); }} className="w-full px-4 py-2.5 text-left hover:bg-slate-50 text-[11px] font-bold border-b border-slate-50 last:border-0 uppercase">{r}</button>
                            )) : <div className="p-4 text-center text-[9px] font-bold text-slate-400 uppercase">No Matches</div>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Internal Notes</label>
                        <input className="w-full px-4 py-2.5 mt-1.5 bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-sm focus:border-blue-500" placeholder="Technical analysis..." value={formData.problemDescription} onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })} />
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                      <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-all group">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 transition-all"
                          checked={formData.cardReturned}
                          onChange={(e) => setFormData({ ...formData, cardReturned: e.target.checked })}
                        />
                        <span className="text-[11px] font-black text-slate-900 uppercase group-hover:text-blue-600">ORIGINAL WARRANTY CARD COLLECTED</span>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-all group">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 transition-all"
                          checked={formData.paidInAccount}
                          onChange={(e) => setFormData({ ...formData, paidInAccount: e.target.checked })}
                        />
                        <span className="text-[11px] font-black text-slate-900 uppercase group-hover:text-blue-600">PAID IN ACCOUNT</span>
                      </label>

                      <div className="pt-6 border-t border-slate-200">
                        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 border-dashed">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shadow-sm"><Calendar size={18} /></div>
                            <div>
                              <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest leading-none">Original Sale Date (From Old Battery) <span className="text-rose-600">*</span></h4>
                              <p className="text-[9px] font-bold text-amber-600 mt-1 uppercase italic">Verify from warranty card</p>
                            </div>
                          </div>

                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Date <span className="text-rose-600">*</span></label>
                          <input
                            required
                            type="date"
                            className="w-full px-5 py-3.5 mt-2 bg-white border border-amber-200 rounded-2xl outline-none font-black text-lg focus:border-amber-500 text-amber-700 shadow-xl shadow-amber-900/5 transition-all"
                            value={formData.soldDate}
                            onChange={(e) => setFormData({ ...formData, soldDate: e.target.value })}
                          />
                          <p className="text-[9px] text-amber-600 font-medium mt-2 uppercase italic">New battery will inherit this date automatically for warranty calculation</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button type="submit" className="w-full py-5 bg-amber-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-amber-700 transition-all shadow-2xl shadow-amber-600/20 active:scale-[0.98]">
                        Proceed to Authorization
                      </button>
                      <button type="button" onClick={() => setStep(1)} className="w-full py-3 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-all text-center underline cursor-pointer">Back to Step 1</button>
                    </div>
                  </div>
                )}
              </form>

              {isConfirming && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                  <div className="bg-slate-900 text-white rounded-[40px] p-12 border-4 border-amber-600 shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-500 space-y-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -mr-10 -mt-10"><ShieldQuestion size={200} /></div>

                    <div className="flex items-center space-x-6 relative z-10">
                      <div className="p-5 bg-amber-600 rounded-3xl shadow-2xl shadow-amber-600/20"><ShieldQuestion size={40} /></div>
                      <div>
                        <h3 className="text-3xl font-black tracking-tighter uppercase leading-none">Authorization Required</h3>
                        <p className="text-slate-500 text-[12px] font-black uppercase tracking-[0.4em] mt-3">Final validation before committing to registry.</p>
                      </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="p-8 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between shadow-inner">
                          <div className="space-y-2"><p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Failed Unit</p><p className="text-2xl font-black mono text-slate-300 tracking-tighter">{validationResult.battery.id}</p></div>
                          <ArrowRight className="text-slate-700" size={28} />
                          <div className="space-y-2 text-right"><p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">New Unit</p><p className="text-2xl font-black mono text-blue-400 tracking-tighter">{formData.newBatteryId}</p></div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Failure</p>
                            <p className="text-xs font-black text-amber-500 uppercase">{formData.reason}</p>
                          </div>
                          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dealer</p>
                            <p className="text-xs font-black text-slate-300 uppercase truncate">{dealerSearch}</p>
                          </div>
                          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Evidence</p>
                            <p className="text-xs font-black text-blue-400 uppercase">{formData.cardReturned ? 'Original Card' : 'No Card'}</p>
                          </div>
                          <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Paid in Account</p>
                            <p className="text-xs font-black uppercase" style={{ color: formData.paidInAccount ? '#10b981' : '#ef4444' }}>{formData.paidInAccount ? 'YES' : 'NO'}</p>
                          </div>
                          <div className="p-5 bg-amber-900/30 border border-amber-600/30 rounded-2xl">
                            <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest mb-2">Sold Date</p>
                            <p className="text-xs font-black text-amber-500 mono">{formatDate(formData.soldDate)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-6">
                        <button onClick={executeFinalReplacement} disabled={isActionLoading} className="w-full py-7 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-900/20 uppercase tracking-[0.4em] text-sm flex items-center justify-center gap-6 active:scale-95">
                          {isActionLoading ? <Loader2 className="animate-spin" size={28} /> : <CheckCircle2 size={28} />} Confirm & Authorize
                        </button>
                        <button onClick={() => setIsConfirming(false)} className="w-full py-5 bg-white/5 text-slate-500 font-bold rounded-2xl hover:bg-white/10 hover:text-slate-300 uppercase tracking-widest text-[10px] transition-all">Cancel & Edit Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div >
        </div >
      )}
    </div >
  );
};

export default Replacements;
