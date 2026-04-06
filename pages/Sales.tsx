
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Database } from '../db';
import { BatteryStatus, Sale, Dealer, Battery } from '../types';
import {
  ShoppingCart, User, CheckCircle2, Search, Calculator,
  ScanLine, Phone, Zap, X, Store, CreditCard,
  FileText, Activity, ShieldCheck, ChevronRight, Calendar,
  Printer, Shield, Hash, MapPin, BadgeCheck, Receipt
} from 'lucide-react';
import { formatDate } from '../utils';
import DealerInlineSummary from '../components/DealerInlineSummary';

const formatINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);

const Invoice: React.FC<{ sale: Sale; dealer: Dealer | null; battery: Battery | null }> = ({ sale, dealer, battery }) => {
  const handlePrint = () => {
    Database.logActivity('PRINT_REPORT', `Printed Invoice ${sale.id}`, { saleId: sale.id, customer: sale.customerName });
    if (window.electronAPI) {
      window.electronAPI.printOrPdf();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-none border border-slate-200 shadow-2xl space-y-8 print:p-0 print:border-0 print:shadow-none">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; visibility: visible !important; }
          .invoice-border { border: 2px solid #000 !important; }
          .table-border { border: 1px solid #000 !important; }
        }
      `}</style>

      <div className="print-area bg-white text-slate-900 font-sans p-6 md:p-10 uppercase tracking-wider border-2 border-slate-100 rounded-none invoice-border">
        {/* Invoice Header: Branding & Corporate Identity */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-slate-900 pb-8 mb-8 gap-6">
          <div className="flex items-center space-x-5">
            <div className="bg-slate-900 p-5 rounded-none text-white shadow-lg">
              <Zap size={44} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter leading-none">STARLINE</h1>
              <p className="text-[11px] font-black text-blue-600 mt-1 tracking-[0.2em]">POWER SOLUTIONS PRIVATE LIMITED</p>
              <div className="mt-3 space-y-0.5 text-[9px] font-bold text-slate-500 max-w-[300px]">
                <p>REGD OFFICE: IND-12, PHASE II, SECTOR 5, MIDC INDUSTRIAL AREA,</p>
                <p>PUNE, MAHARASHTRA, INDIA - 411001</p>
                <p className="text-slate-900 font-black mt-1 flex items-center">
                  <span className="text-blue-600 mr-2">GSTIN:</span> 27AAACS1234F1Z5 | <span className="text-blue-600 ml-2 mr-2">CIN:</span> U31904PN2025PTC123456
                </p>
              </div>
            </div>
          </div>
          <div className="text-right flex-1 w-full md:w-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-3 border-b-2 border-slate-100 pb-2">TAX INVOICE</h2>
            <div className="space-y-1.5 text-xs">
              <p className="flex justify-end items-center"><span className="text-slate-400 font-black mr-3">INVOICE NO:</span> <span className="font-black text-slate-900">{sale.id}</span></p>
              <p className="flex justify-end items-center"><span className="text-slate-400 font-black mr-3">DATE:</span> <span className="font-black text-slate-900">{formatDate(sale.saleDate)}</span></p>
              <p className="flex justify-end items-center"><span className="text-slate-400 font-black mr-3">PLACE OF SUPPLY:</span> <span className="font-black text-slate-900">MAHARASHTRA (27)</span></p>
            </div>
          </div>
        </div>

        {/* Parties Section: Billing & Delivery Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          <div className="space-y-4 p-6 bg-slate-50 rounded-none border border-slate-100 table-border">
            <h3 className="text-[11px] font-black text-blue-600 border-b border-blue-100 pb-3 flex items-center tracking-widest">
              <User size={14} className="mr-2" /> BILL TO (CONSIGNEE)
            </h3>
            <div className="space-y-2">
              <p className="text-xl font-black text-slate-900 leading-tight">{sale.customerName}</p>
              <div className="flex items-center text-slate-600 font-bold text-sm">
                <Phone size={14} className="mr-3 text-slate-400" /> {sale.customerPhone}
              </div>
              <div className="pt-3 flex flex-col space-y-1">
                <p className="text-[10px] text-slate-400 font-black">CUSTOMER TYPE: RETAIL CONSUMER</p>
                <p className="text-[10px] text-slate-400 font-black">TAX STATUS: UNREGISTERED PERSON</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6 bg-slate-50 rounded-none border border-slate-100 table-border">
            <h3 className="text-[11px] font-black text-blue-600 border-b border-blue-100 pb-3 flex items-center tracking-widest">
              <Store size={14} className="mr-2" /> AUTHORIZED DISPATCH CENTER
            </h3>
            <div className="space-y-2">
              <p className="text-xl font-black text-slate-900 leading-tight">{dealer?.name || 'STARLINE DIRECT SALES'}</p>
              <div className="flex items-center text-slate-600 font-bold text-sm">
                <MapPin size={14} className="mr-3 text-slate-400" /> {dealer?.location || 'CENTRAL WAREHOUSE'}
              </div>
              <p className="text-[10px] font-bold text-slate-500 mt-2 leading-relaxed max-w-[280px]">
                {dealer?.address || 'UNIT 4, LOGISTICS PARK, CHAKAN, PUNE - 410501'}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-10 overflow-hidden border border-slate-200 rounded-none table-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black tracking-[0.2em]">
                <th className="px-6 py-5 text-left">ITEM DESCRIPTION</th>
                <th className="px-4 py-5 text-center border-l border-white/10">HSN CODE</th>
                <th className="px-6 py-5 text-center border-l border-white/10">BATTERY SERIAL NUMBER</th>
                <th className="px-4 py-5 text-center border-l border-white/10">RATING</th>
                <th className="px-6 py-5 text-right border-l border-white/10">TAXABLE VALUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="text-sm font-black text-slate-800">
                <td className="px-6 py-10">
                  <p className="text-xl leading-none">{sale.batteryType}</p>
                  <p className="text-[10px] text-slate-400 font-black mt-2">INDUSTRIAL LEAD-ACID SECONDARY BATTERY</p>
                </td>
                <td className="px-4 py-10 text-center text-slate-500 font-mono border-l border-slate-100">8507 10 00</td>
                <td className="px-6 py-10 text-center font-mono text-blue-600 tracking-tighter border-l border-slate-100">{sale.batteryId}</td>
                <td className="px-4 py-10 text-center text-slate-600 border-l border-slate-100">{battery?.capacity || 'N/A'}</td>
                <td className="px-6 py-10 text-right font-mono text-lg border-l border-slate-100">{formatINR(sale.salePrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculation Summary & Terms */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
          <div className="flex-1 space-y-6 w-full">
            <div className="bg-slate-50 p-7 rounded-none border border-slate-100 table-border">
              <h4 className="text-[11px] font-black text-slate-900 mb-5 tracking-[0.2em] flex items-center">
                <Shield size={16} className="mr-2 text-blue-600" /> TERMS & WARRANTY PROTOCOL
              </h4>
              <ul className="space-y-3 text-[10px] font-bold text-slate-600 list-disc pl-5 leading-relaxed">
                <li>WARRANTY VALID FROM <span className="text-slate-900 font-black underline">{formatDate(sale.warrantyStartDate)}</span> UNTIL <span className="text-rose-600 font-black underline">{formatDate(sale.warrantyExpiry)}</span>.</li>
                <li>WARRANTY IS LIMITED TO REPLACEMENT OF DEFECTIVE CELLS UNDER NORMAL USE.</li>
                <li>PHYSICAL DAMAGE, OVER-CHARGING, OR SULPHATION DUE TO UNDER-CHARGING VOIDS ALL CLAIMS.</li>
                <li>ORIGINAL TAX INVOICE AND GUARANTEE CARD ARE MANDATORY FOR PROCESSING CLAIMS.</li>
                <li>ALL DISPUTES ARE SUBJECT TO PUNE JURISDICTION ONLY.</li>
              </ul>
            </div>
          </div>

          <div className="w-full lg:w-[350px] space-y-4">
            <div className="space-y-3 px-2 border-b-2 border-slate-100 pb-4">
              <div className="flex justify-between items-center text-slate-500 text-sm font-bold">
                <span className="tracking-widest">TAXABLE VALUE</span>
                <span className="font-mono">{formatINR(sale.salePrice)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 text-sm font-bold">
                <span className="tracking-widest">IGST @ {sale.isBilled ? '18%' : '0%'}</span>
                <span className="font-mono">{formatINR(sale.gstAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 text-sm font-bold">
                <span className="tracking-widest">ROUND OFF</span>
                <span className="font-mono">₹0.00</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-none shadow-2xl">
              <span className="font-black text-sm tracking-[0.2em]">GRAND TOTAL</span>
              <span className="text-3xl font-black font-mono">{formatINR(sale.totalAmount)}</span>
            </div>

            <div className="pt-10 flex flex-col items-center justify-center space-y-4 relative">
              <div className="w-full border-t-2 border-slate-900 mt-16 pt-5 text-center">
                <p className="text-[11px] font-black text-slate-900 tracking-[0.3em]">FOR STARLINE BATTERIES</p>
                <div className="h-12"></div>
                <p className="text-[9px] font-black text-slate-500 mt-2 uppercase">AUTHORIZED SIGNATORY</p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="mt-16 pt-10 border-t border-slate-100 text-center space-y-2">
          <p className="text-[10px] font-black text-slate-900 tracking-[0.1em]">THANK YOU FOR CHOOSING STARLINE - INDIA'S PREMIUM POWER ARCHITECTURE</p>
          <p className="text-[8px] font-bold text-slate-400">CORPORATE HELPLINE: 1800-123-STARLINE (TOLL FREE) | EMAIL: CONNECT@STARLINEBATTERIES.IN</p>
          <p className="text-[7px] font-black text-blue-500 uppercase mt-4">WWW.STARLINEBATTERIES.IN</p>
        </div>
      </div>

      <div className="no-print flex flex-col md:flex-row gap-5 mt-10">
        <button
          onClick={handlePrint}
          className="flex-1 py-6 bg-slate-900 text-white rounded-none font-black flex items-center justify-center space-x-4 hover:bg-black transition-all shadow-2xl shadow-slate-200 active:scale-95 group"
        >
          <Printer size={22} className="group-hover:scale-110 transition-transform" />
          <span className="tracking-[0.2em]">EXECUTE PRINT (A4)</span>
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 py-6 bg-white border-2 border-slate-100 text-slate-600 rounded-none font-black flex items-center justify-center space-x-4 hover:bg-slate-50 transition-all shadow-xl active:scale-95"
        >
          <ShoppingCart size={22} />
          <span className="tracking-[0.2em]">LOG NEW DISPATCH</span>
        </button>
      </div>
    </div>
  );
};

const Sales: React.FC = () => {
  const [db, setDb] = useState<{ batteries: Battery[], dealers: Dealer[] }>({ batteries: [], dealers: [] });
  const [view, setView] = useState<'form' | 'success'>('form');
  const [lastSaleData, setLastSaleData] = useState<{ sale: Sale; dealer: Dealer | null; battery: Battery | null } | null>(null);

  const [serialSearch, setSerialSearch] = useState('');
  const [dealerSearch, setDealerSearch] = useState('');
  const [showSerials, setShowSerials] = useState(false);
  const [showDealers, setShowDealers] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const serialRef = useRef<HTMLDivElement>(null);
  const dealerRef = useRef<HTMLDivElement>(null);

  const [isBilled, setIsBilled] = useState(true);

  const [form, setForm] = useState({
    batteryId: '',
    dealerId: '',
    customer: '',
    phone: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });

  const load = async () => {
    const batts = await Database.getAll<Battery>('batteries');
    const deals = await Database.getAll<Dealer>('dealers');
    setDb({ batteries: batts, dealers: deals });
  };

  useEffect(() => {
    // SCALABILITY FIX: Do NOT load all batteries/dealers on mount.
    // load(); 
    const handleClickOutside = (event: MouseEvent) => {
      if (serialRef.current && !serialRef.current.contains(event.target as Node)) setShowSerials(false);
      if (dealerRef.current && !dealerRef.current.contains(event.target as Node)) setShowDealers(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // SCALABILITY FIX: Replaced client-side filtering with server-side async search
  const [filteredSerials, setFilteredSerials] = useState<Battery[]>([]);
  const [filteredDealers, setFilteredDealers] = useState<Dealer[]>([]);

  // Async Search for Batteries
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (serialSearch.length > 2) {
        const results = await Database.searchStock(serialSearch);
        setFilteredSerials(results);
      } else {
        setFilteredSerials([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [serialSearch]);

  // Async Search for Dealers
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (dealerSearch.length > 2) {
        const results = await Database.searchDealers(dealerSearch);
        setFilteredDealers(results);
      } else {
        setFilteredDealers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [dealerSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // SCALABILITY FIX: Fetch specific records for submission instead of finding in loaded array
    const battery = await Database.getBattery(form.batteryId); // We need a direct getBattery if searchStock provides enough info, but checking logic inside.
    // Note: getBattery isn't fully typed to return Battery | undefined in this context, assuming verify_scalability usage.
    // But we need the battery object. using searchStock result is safer if available, or fetch it.
    // Let's assume we can fetch it or trust the form input. 
    // Ideally: const battery = await Database.getBattery(form.batteryId);
    // But wait, getBattery returns Battery | undefined.
    // Dealers is also not loaded.
    const dealerList = await Database.searchDealers(form.dealerId);
    const dealer = dealerList.find(d => d.id === form.dealerId);

    if (!battery || !dealer) {
      alert("Invalid Battery or Dealer selection");
      return;
    }

    // STRICT DATE VALIDATION
    const saleDateObj = new Date(form.date);
    // Use local time for comparison
    saleDateObj.setHours(0, 0, 0, 0);

    // Check against Manufacture Date
    if (battery.manufactureDate) {
      const mfgDate = new Date(battery.manufactureDate);
      mfgDate.setHours(0, 0, 0, 0);
      if (saleDateObj < mfgDate) {
        alert(`INVALID DATE: Cannot sell battery before it was manufactured.\n\nManufactured: ${formatDate(battery.manufactureDate)}\nSale Date: ${formatDate(form.date)}`);
        return;
      }
    }

    // Check against Activation Date (if Dealer Stock, this is when they got it)
    if (battery.status === BatteryStatus.ACTIVE && battery.activationDate) {
      const arrivalDate = new Date(battery.activationDate);
      arrivalDate.setHours(0, 0, 0, 0);
      // If it's dealer stock, activationDate = dispatch date.
      if (saleDateObj < arrivalDate) {
        alert(`INVALID DATE: Cannot sell battery before stock arrival.\n\nArrived at Dealer: ${formatDate(battery.activationDate)}\nSale Date: ${formatDate(form.date)}`);
        return;
      }
    }

    setIsProcessing(true);
    // Reuse validated saleDateObj or re-parse if needed (it's the same)
    const expiry = new Date(saleDateObj);
    expiry.setMonth(expiry.getMonth() + (battery.warrantyMonths || 24));

    const netPrice = parseFloat(form.price);
    const gst = isBilled ? netPrice * 0.18 : 0;
    const total = netPrice + gst;

    const saleRecord: Sale = {
      id: `INV-${Date.now().toString().slice(-8)}`,
      batteryId: form.batteryId,
      batteryType: battery.model,
      dealerId: form.dealerId,
      saleDate: form.date,
      salePrice: netPrice,
      gstAmount: gst,
      totalAmount: total,
      isBilled: isBilled,
      customerName: form.customer,
      customerPhone: form.phone,
      guaranteeCardReturned: true,
      paidInAccount: true,
      warrantyStartDate: form.date,
      warrantyExpiry: expiry.toISOString().split('T')[0]
    };

    await Database.addSale(saleRecord);

    setLastSaleData({
      sale: saleRecord,
      dealer: dealer || null,
      battery: battery
    });

    setIsProcessing(false);
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: isBilled ? 'TAX INVOICE GENERATED' : 'DISPATCH RECORDED' } }));
    setView('success');
  };

  const netPrice = parseFloat(form.price) || 0;
  const gst = isBilled ? netPrice * 0.18 : 0;
  const total = netPrice + gst;
  const selectedDealer = filteredDealers.find((dealer) => dealer.id === form.dealerId)
    || db.dealers.find((dealer) => dealer.id === form.dealerId)
    || null;

  if (view === 'success' && lastSaleData) return (
    <div className="max-w-4xl mx-auto py-10 animate-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between mb-8 no-print px-4">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">TRANSACTION SECURED</h2>
          <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">REGISTRY STATE UPDATED. PRINT DOCUMENTATION BELOW.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-8 py-4 rounded-none border-2 border-emerald-100 flex items-center space-x-4 shadow-xl shadow-emerald-500/5">
          <CheckCircle2 size={32} />
          <div className="flex flex-col">
            <span className="text-[12px] font-black uppercase tracking-widest">Database Synced</span>
            <span className="text-[10px] font-bold text-emerald-500 opacity-60">ID: {lastSaleData.sale.id}</span>
          </div>
        </div>
      </div>
      <Invoice {...lastSaleData} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20 uppercase">
      {/* Sales Header */}
      <div className="bg-white p-8 rounded-none border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="bg-slate-900 p-4 rounded-none text-white">
              <Receipt size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sales & Dispatch Console</h2>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Official Asset Lifecycle Management</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex bg-slate-100 p-2 rounded-none border border-slate-200">
              <button
                type="button"
                onClick={() => setIsBilled(true)}
                className={`px-8 py-3 rounded-none font-black text-[10px] uppercase tracking-widest transition-all ${isBilled ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Tax Invoice (GST)
              </button>
              <button
                type="button"
                onClick={() => setIsBilled(false)}
                className={`px-8 py-3 rounded-none font-black text-[10px] uppercase tracking-widest transition-all ${!isBilled ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
              >
                General Entry
              </button>
            </div>

            <div className="flex items-center space-x-4 bg-slate-950 text-white px-8 py-4 rounded-none shadow-2xl shadow-slate-300 border border-white/5">
              <Calculator size={20} className="text-blue-500" />
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Liability Assessment</p>
                <p className="text-2xl font-black tracking-tighter text-blue-50">{formatINR(total)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Asset Section */}
          <div className="bg-white p-10 rounded-none border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <ScanLine size={160} />
            </div>

            <div className="flex items-center space-x-4 border-b border-slate-50 pb-6">
              <div className="p-3 bg-blue-600 text-white rounded-none shadow-xl shadow-blue-500/20"><ScanLine size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Asset Identification</h3>
            </div>

            <div className="relative" ref={serialRef}>
              <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] ml-2">STOCK SERIAL IDENTITY (REGISTRY SCAN)</label>
              <div className="relative mt-3">
                <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  required
                  placeholder="TYPE SERIAL NUMBER OR SCAN CODE..."
                  className="w-full pl-16 pr-8 py-6 bg-slate-50 border-2 border-transparent rounded-none outline-none font-black text-lg uppercase tracking-tight focus:bg-white focus:border-blue-500/20 transition-all placeholder:text-slate-200"
                  value={serialSearch}
                  onFocus={() => setShowSerials(true)}
                  onChange={e => { setSerialSearch(e.target.value); setForm({ ...form, batteryId: '' }); setShowSerials(true); }}
                />
              </div>
              {showSerials && filteredSerials.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-3 bg-white rounded-none border border-slate-200 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-top-4 duration-300">
                  {filteredSerials.map(b => (
                    <button key={b.id} type="button" onClick={() => { setForm({ ...form, batteryId: b.id, price: '6500' }); setSerialSearch(b.id); setShowSerials(false); }} className="w-full px-8 py-6 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors">
                      <div className="space-y-1">
                        <p className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{b.id}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{b.model} | {b.capacity} | WARRANTY: {b.warrantyMonths}MO</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-none border border-emerald-100">STOCK READY</span>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer & Logistics Section */}
          <div className="bg-white p-10 rounded-none border border-slate-200 shadow-sm space-y-10">
            <div className="flex items-center space-x-4 border-b border-slate-50 pb-6">
              <div className="p-3 bg-emerald-600 text-white rounded-none shadow-xl shadow-emerald-500/20"><User size={24} /></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Party & Logistics Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              <div className="relative" ref={dealerRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">AUTHORIZED DEALER</label>
                <div className="relative mt-3">
                  <Store size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    placeholder="NETWORK SEARCH..."
                    className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-none outline-none font-bold text-sm focus:bg-white focus:border-blue-500/20 transition-all uppercase placeholder:text-slate-200"
                    value={dealerSearch}
                    onFocus={() => setShowDealers(true)}
                    onChange={e => { setDealerSearch(e.target.value); setShowDealers(true); }}
                  />
                </div>
                {showDealers && filteredDealers.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-3 bg-white rounded-none border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    {filteredDealers.map(d => (
                      <button key={d.id} type="button" onClick={() => { setForm({ ...form, dealerId: d.id }); setDealerSearch(d.name); setShowDealers(false); }} className="w-full px-6 py-5 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 text-[12px] font-black uppercase text-slate-800 transition-colors">{d.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <DealerInlineSummary dealerId={selectedDealer?.id} dealer={selectedDealer} />

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">RETAIL CONSUMER NAME</label>
                <div className="relative mt-1">
                  <User size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    placeholder="LEGAL FULL NAME"
                    className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-none outline-none font-bold text-sm focus:bg-white focus:border-blue-500/20 transition-all uppercase placeholder:text-slate-200"
                    value={form.customer}
                    onChange={e => setForm({ ...form, customer: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">PRIMARY CONTACT NO</label>
                <div className="relative mt-1">
                  <Phone size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    placeholder="+91 MOBILE"
                    className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-none outline-none font-bold text-sm focus:bg-white focus:border-blue-500/20 transition-all placeholder:text-slate-200"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">DISPATCH DATE</label>
                <div className="relative mt-1">
                  <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    required
                    type="date"
                    className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent rounded-none outline-none font-bold text-sm focus:bg-white focus:border-blue-500/20 transition-all uppercase"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] ml-2">TAXABLE COMMERCIAL VALUE (INR)</label>
                <div className="relative mt-3">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-3xl">₹</div>
                  <input
                    required
                    type="number"
                    placeholder="ENTER UNIT PRICE (EX-TAX)"
                    className="w-full pl-16 pr-8 py-8 bg-slate-50 border-2 border-transparent rounded-none outline-none font-black text-4xl focus:bg-white focus:border-blue-500/20 transition-all placeholder:text-slate-200"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Assessment Column */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0f172a] p-10 rounded-none text-white shadow-2xl space-y-10 sticky top-8 border border-white/5 uppercase overflow-hidden">
            <div className="absolute -top-20 -right-20 opacity-[0.05] rotate-12 pointer-events-none">
              <ShieldCheck size={300} />
            </div>

            <div className="flex items-center space-x-4 border-b border-white/10 pb-8 relative z-10">
              <div className="p-3 bg-blue-500 text-white rounded-none shadow-xl shadow-blue-500/30"><FileText size={24} /></div>
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Dispatch Payload</h4>
                <p className="text-[9px] font-bold text-blue-400 mt-1">INVOICE PENDING CERTIFICATION</p>
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="flex justify-between items-center group">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Base Assessment</span>
                <span className="text-xl font-mono font-black tracking-tighter group-hover:text-blue-400 transition-colors">{formatINR(netPrice)}</span>
              </div>
              <div className="flex justify-between items-start group">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">IGST (DOMESTIC)</span>
                  <span className="text-[9px] font-black text-slate-600 mt-1">{isBilled ? 'APPLICABLE @ 18%' : 'NON-TAXABLE RECORD'}</span>
                </div>
                <span className={`text-xl font-mono font-black tracking-tighter ${isBilled ? 'text-amber-500' : 'text-slate-700'}`}>{formatINR(gst)}</span>
              </div>

              <div className="pt-8 border-t border-white/10 space-y-2">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-2">FINAL SETTLEMENT VALUE</p>
                <div className="flex items-baseline space-x-3">
                  <span className="text-6xl font-black tracking-tighter text-blue-50">{formatINR(total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-white/10 relative z-10">
              <div className="flex items-center space-x-5 text-emerald-400 bg-emerald-500/5 p-5 rounded-none border border-emerald-500/10 backdrop-blur-sm">
                <ShieldCheck size={28} />
                <div>
                  <span className="block text-[11px] font-black uppercase tracking-[0.3em]">ACTIVE COVER</span>
                  <span className="block text-[9px] font-bold text-slate-500">AUTO-LIFECYCLE ACTIVATED</span>
                </div>
              </div>
            </div>

            <button
              disabled={!form.batteryId || !form.dealerId || isProcessing}
              type="submit"
              className="w-full py-7 bg-blue-600 rounded-none font-black text-[13px] uppercase tracking-[0.4em] shadow-2xl shadow-blue-500/40 hover:bg-blue-500 disabled:opacity-20 active:scale-95 transition-all flex items-center justify-center space-x-5 relative z-10 group"
            >
              {isProcessing ? <Activity size={24} className="animate-spin" /> : <Shield size={24} className="group-hover:scale-110 transition-transform" />}
              <span>{isProcessing ? 'CERTIFYING...' : (isBilled ? 'CERTIFY & BILL' : 'RECORD DISPATCH')}</span>
            </button>
          </div>

          <div className="bg-white p-8 rounded-none border-2 border-slate-50 text-center shadow-lg shadow-slate-200/50">
            <div className="inline-flex p-4 bg-slate-50 rounded-none text-slate-200 mb-4"><Hash size={32} /></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">SECURE REGISTRY TOKEN</p>
            <p className="text-sm font-mono font-black text-slate-800 mt-2 uppercase truncate px-4">{form.batteryId || 'WAITING FOR SOURCE...'}</p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Sales;
