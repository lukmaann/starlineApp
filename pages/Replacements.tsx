import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, Battery as BatteryIcon, CheckCircle2,
  ClipboardCheck, Loader2, RefreshCw, RotateCcw, Search, ShieldCheck, X
} from 'lucide-react';
import { Database } from '../db';
import { Battery, BatteryStatus, Dealer, Replacement, WarrantyCardStatus } from '../types';
import { getLocalDate, formatDate } from '../utils';
import { WarrantyCalculator } from '../utils/warrantyCalculator';

const FAILURE_MODES = [
  'Dead Cell', 'Charging Circuit Failure', 'Internal Short-Circuit',
  'Excessive Plate Sulfation', 'Casing Bulge / Leak', 'Voltage Drop Under Load',
  'Manufacturing Defect', 'Self-Discharge Issue', 'Other'
];

type RegistryMatch = {
  battery: Battery;
  sale: any;
  originalSale: any;
  lineage: Battery[];
  replacements: Replacement[];
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';
const labelClass = 'mb-2 block text-xs font-bold text-slate-500';

const Replacements: React.FC = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [oldSerial, setOldSerial] = useState('');
  const [asset, setAsset] = useState<RegistryMatch | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [newBatteryId, setNewBatteryId] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [reason, setReason] = useState(FAILURE_MODES[0]);
  const [problemDescription, setProblemDescription] = useState('');
  const [cardReturned, setCardReturned] = useState(false);
  const [paidInAccount, setPaidInAccount] = useState(false);
  const [soldDate, setSoldDate] = useState('');

  useEffect(() => {
    const loadDealers = async () => {
      try {
        setDealers(await Database.getAll<Dealer>('dealers'));
      } catch (error) {
        console.error('Failed to load dealers', error);
        setFormError('Could not load dealers. Please refresh and try again.');
      }
    };
    loadDealers();
    window.addEventListener('db-synced', loadDealers);
    return () => window.removeEventListener('db-synced', loadDealers);
  }, []);

  const dealer = useMemo(() => dealers.find(item => item.id === dealerId), [dealers, dealerId]);
  const sourceSale = asset?.originalSale || asset?.sale;
  const warranty = useMemo(() => asset ? WarrantyCalculator.calculate(asset.battery) : null, [asset]);
  const oldBattery = asset?.battery;

  const resetExchange = () => {
    setAsset(null);
    setLookupError('');
    setFormError('');
    setIsConfirming(false);
    setNewBatteryId('');
    setDealerId('');
    setReason(FAILURE_MODES[0]);
    setProblemDescription('');
    setCardReturned(false);
    setPaidInAccount(false);
    setSoldDate('');
  };

  const lookupOldBattery = async (event: React.FormEvent) => {
    event.preventDefault();
    const serial = oldSerial.trim().toUpperCase();
    if (!serial) {
      setLookupError('Enter the old battery serial number.');
      return;
    }
    setIsLookingUp(true);
    setLookupError('');
    setFormError('');
    setSuccess('');
    setAsset(null);
    setIsConfirming(false);
    try {
      const match = await Database.searchBattery(serial);
      if (!match?.battery) {
        setLookupError('Battery not found in the registry. Check the serial number and try again.');
        return;
      }
      if (match.battery.status === BatteryStatus.RETURNED) {
        setLookupError(`This battery has already been replaced${match.battery.nextBatteryId ? ` by ${match.battery.nextBatteryId}` : ''}.`);
        return;
      }
      setAsset({ ...match, sale: match.sale || null, originalSale: match.originalSale || null });
      setDealerId(match.battery.dealerId || match.originalSale?.dealerId || match.sale?.dealerId || dealers[0]?.id || '');
      setSoldDate(match.battery.actualSaleDate || match.originalSale?.saleDate || match.sale?.saleDate || match.battery.activationDate || '');
    } catch (error) {
      console.error('Old battery lookup failed', error);
      setLookupError('Could not search the registry. Check the database connection and try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const reviewReplacement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!asset?.battery) return;
    setFormError('');
    const newId = newBatteryId.trim().toUpperCase();
    if (!newId) return setFormError('Enter the replacement battery serial number.');
    if (newId === asset.battery.id.toUpperCase()) return setFormError('The new battery must have a different serial number.');
    if (!dealerId || !dealers.some(item => item.id === dealerId)) return setFormError('Choose a valid servicing dealer.');
    if (!soldDate) return setFormError('Enter the original sale date shown on the warranty card.');
    if (soldDate > getLocalDate()) return setFormError('The original sale date cannot be in the future.');

    setIsCheckingStock(true);
    try {
      const stock = await Database.getBattery(newId);
      if (!stock) {
        setFormError(`Replacement battery ${newId} is not in the registry. Add or manufacture it before continuing.`);
        return;
      }
      const status = String(stock.status || '').toUpperCase();
      const isManufactured = status === BatteryStatus.MANUFACTURED.toUpperCase();
      const isDealerStock = status === BatteryStatus.ACTIVE && stock.dealerId === dealerId;
      if (stock.model !== asset.battery.model) {
        setFormError(`Replacement battery ${newId} must match the old battery model (${asset.battery.model}).`);
        return;
      }
      if (!isManufactured && !isDealerStock) {
        setFormError(`Replacement battery ${newId} is ${stock.status}${stock.dealerId && stock.dealerId !== dealerId ? ' and belongs to another dealer' : ''}. Choose unused factory stock or stock assigned to this dealer.`);
        return;
      }
      setIsConfirming(true);
    } catch (error) {
      console.error('Replacement stock validation failed', error);
      setFormError('Could not verify the replacement battery. Check the database connection and try again.');
    } finally {
      setIsCheckingStock(false);
    }
  };

  const saveReplacement = async () => {
    if (!asset?.battery) return;
    setIsSaving(true);
    setFormError('');
    const newId = newBatteryId.trim().toUpperCase();
    try {
      // Recheck both serials immediately before writing so stale form state cannot create a broken link.
      const [oldCurrent, newCurrent] = await Promise.all([
        Database.getBattery(asset.battery.id),
        Database.getBattery(newId)
      ]);
      if (!oldCurrent) throw new Error('The old battery is no longer present in the registry. Search for it again.');
      if (oldCurrent.status === BatteryStatus.RETURNED) throw new Error('This battery has already been replaced. Search again to see its latest status.');
      if (!newCurrent) throw new Error(`Replacement battery ${newId} is no longer in the registry.`);
      const newStatus = String(newCurrent.status || '').toUpperCase();
      if (newCurrent.model !== oldCurrent.model) throw new Error(`Replacement battery ${newId} must match the old battery model (${oldCurrent.model}).`);
      if (newStatus !== BatteryStatus.MANUFACTURED.toUpperCase() && !(newStatus === BatteryStatus.ACTIVE && newCurrent.dealerId === dealerId)) {
        throw new Error(`Replacement battery ${newId} is no longer available for this dealer.`);
      }

      let warrantyExpiry = sourceSale?.warrantyExpiry || oldCurrent.warrantyExpiry || '';
      if (soldDate) warrantyExpiry = WarrantyCalculator.calculateCorrectedExpiry(oldCurrent, soldDate) || warrantyExpiry;
      const replacement: Replacement = {
        id: `REP-${Date.now()}`,
        oldBatteryId: oldCurrent.id,
        newBatteryId: newId,
        dealerId,
        replacementDate: getLocalDate(),
        reason,
        problemDescription: problemDescription.trim(),
        warrantyCardStatus: cardReturned ? 'RECEIVED' as WarrantyCardStatus : 'NOT_RECEIVED' as WarrantyCardStatus,
        paidInAccount,
        soldDate
      };

      await Database.addReplacement(replacement, {
        customerName: sourceSale?.customerName || oldCurrent.customerName || '',
        customerPhone: sourceSale?.customerPhone || oldCurrent.customerPhone || '',
        warrantyExpiry,
        correctedOriginalSaleDate: soldDate
      });

      setSuccess(`Replacement completed. ${newId} is now linked to ${oldCurrent.id}.`);
      setOldSerial('');
      resetExchange();
    } catch (error) {
      console.error('Replacement save failed', error);
      setFormError(error instanceof Error ? error.message : 'Replacement could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16 animate-in fade-in duration-300">
      <header className="rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/10 p-3 text-blue-300"><RotateCcw size={24} /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Battery replacement</h1>
            <p className="mt-1 text-sm text-slate-300">Find the old battery, choose the replacement unit, and review before saving.</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">1</span><span>Find old battery</span>
          <ArrowRight size={14} className="mx-1 text-slate-500" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${asset ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>2</span><span>Enter replacement details</span>
          <ArrowRight size={14} className="mx-1 text-slate-500" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${isConfirming ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>3</span><span>Review</span>
        </div>
      </header>

      {success && <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 size={20} />{success}<button onClick={() => setSuccess('')} className="ml-auto rounded-lg p-1 hover:bg-emerald-100" aria-label="Dismiss"><X size={16} /></button></div>}

      {!asset && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Search size={20} /></div><div><h2 className="font-bold text-slate-900">Find the old battery</h2><p className="text-sm text-slate-500">Enter the serial number exactly as printed on the battery.</p></div></div>
          <form onSubmit={lookupOldBattery} className="flex flex-col gap-3 sm:flex-row">
            <input autoFocus value={oldSerial} onChange={event => setOldSerial(event.target.value.toUpperCase())} placeholder="Old battery serial number" className={`${inputClass} font-mono uppercase`} aria-label="Old battery serial number" />
            <button type="submit" disabled={isLookingUp || !oldSerial.trim()} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {isLookingUp ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}{isLookingUp ? 'Searching…' : 'Find battery'}
            </button>
          </form>
          {lookupError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{lookupError}</div>}
        </section>
      )}

      {asset && oldBattery && (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm"><BatteryIcon size={21} /></div>
                <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-lg font-black text-slate-900">{oldBattery.id}</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Found in registry</span></div>
                  <p className="mt-1 text-sm font-medium text-slate-600">{oldBattery.model} · {oldBattery.capacity} · {oldBattery.status}</p>
                  <p className="mt-1 text-xs text-slate-500">Customer: {sourceSale?.customerName || oldBattery.customerName || 'Not recorded'}{(sourceSale?.customerPhone || oldBattery.customerPhone) ? ` · ${sourceSale?.customerPhone || oldBattery.customerPhone}` : ''}</p>
                </div>
              </div>
              <button type="button" onClick={() => { resetExchange(); setOldSerial(''); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} />Start over</button>
            </div>
            {warranty?.status === 'EXPIRED' && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Warranty shows expired on {formatDate(warranty.effectiveExpiryDate)}. You can continue and record the replacement.</p>}
          </section>

          {!isConfirming ? (
            <form onSubmit={reviewReplacement} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div><h2 className="font-bold text-slate-900">Replacement details</h2><p className="mt-1 text-sm text-slate-500">The old battery’s model and customer details are carried into the new record.</p></div>
              <div className="grid gap-5 md:grid-cols-2">
                <div><label className={labelClass} htmlFor="new-battery-id">New battery serial number</label><input id="new-battery-id" required value={newBatteryId} onChange={event => setNewBatteryId(event.target.value.toUpperCase())} placeholder="Scan or type new serial" className={`${inputClass} font-mono uppercase`} /></div>
                <div><label className={labelClass} htmlFor="servicing-dealer">Servicing dealer</label><select id="servicing-dealer" required value={dealerId} onChange={event => setDealerId(event.target.value)} className={inputClass}><option value="">Choose dealer</option>{dealers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                <div><label className={labelClass} htmlFor="failure-mode">Reason for replacement</label><select id="failure-mode" value={reason} onChange={event => setReason(event.target.value)} className={inputClass}>{FAILURE_MODES.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
                <div><label className={labelClass} htmlFor="original-sale-date">Original sale date</label><input id="original-sale-date" required type="date" max={getLocalDate()} value={soldDate} onChange={event => setSoldDate(event.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-400">Used to calculate the replacement warranty.</p></div>
                <div className="md:col-span-2"><label className={labelClass} htmlFor="replacement-notes">Notes <span className="font-normal text-slate-400">(optional)</span></label><textarea id="replacement-notes" rows={3} value={problemDescription} onChange={event => setProblemDescription(event.target.value)} placeholder="Add a short note about the fault" className={`${inputClass} resize-y`} /></div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={cardReturned} onChange={event => setCardReturned(event.target.checked)} className="h-4 w-4 accent-blue-600" />Warranty card collected</label>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={paidInAccount} onChange={event => setPaidInAccount(event.target.checked)} className="h-4 w-4 accent-blue-600" />Dealer account settled</label>
              </div>
              {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{formError}</div>}
              <button type="submit" disabled={isCheckingStock} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">{isCheckingStock ? <><Loader2 size={18} className="animate-spin" />Checking serial…</> : <>Review replacement <ArrowRight size={18} /></>}</button>
            </form>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><ClipboardCheck size={21} /></div><div><h2 className="font-bold text-slate-900">Review replacement</h2><p className="text-sm text-slate-500">Confirm the serial numbers and details before saving.</p></div></div>
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-4"><p className="text-xs font-semibold text-slate-400">Old battery</p><p className="mt-1 font-mono font-bold text-slate-900">{oldBattery.id}</p></div>
                <div className="rounded-lg bg-white p-4"><p className="text-xs font-semibold text-slate-400">New battery</p><p className="mt-1 font-mono font-bold text-blue-700">{newBatteryId.trim().toUpperCase()}</p></div>
                <div className="rounded-lg bg-white p-4"><p className="text-xs font-semibold text-slate-400">Dealer</p><p className="mt-1 font-semibold text-slate-900">{dealer?.name || dealerId}</p></div>
                <div className="rounded-lg bg-white p-4"><p className="text-xs font-semibold text-slate-400">Reason · original sale</p><p className="mt-1 font-semibold text-slate-900">{reason} · {formatDate(soldDate)}</p></div>
                <div className="rounded-lg bg-white p-4 sm:col-span-2"><p className="text-xs font-semibold text-slate-400">Warranty card · dealer account</p><p className="mt-1 font-semibold text-slate-900">{cardReturned ? 'Collected' : 'Not collected'} · {paidInAccount ? 'Settled' : 'Pending'}</p></div>
              </div>
              {formError && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{formError}</div>}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={isSaving} onClick={() => { setIsConfirming(false); setFormError(''); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Back to edit</button>
                <button type="button" disabled={isSaving} onClick={saveReplacement} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{isSaving ? <><Loader2 size={18} className="animate-spin" />Saving replacement…</> : <><ShieldCheck size={18} />Confirm and save</>}</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Replacements;
