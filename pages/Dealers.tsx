
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { Dealer, Battery, Replacement, BatteryStatus, BatteryModel } from '../types';
import {
  Plus, X, Search, MapPin, Phone, Store,
  User, ShieldCheck, ChevronRight, RefreshCw,
  ArrowLeft, ChevronLeft, ShoppingBag,
  Landmark, Filter, Users, Box, Info,
  Trash2, ShieldAlert, ClipboardCheck, Clock,
  UserCheck, ExternalLink, Globe, ListFilter,
  CheckCircle2, FileSignature, MapPinned,
  Building2, Loader2, ArrowRight, Settings, ShieldQuestion,
  Trophy, Activity, PieChart as IconPieChart, TrendingUp, Zap, QrCode,
  Fingerprint, CreditCard, FileCheck, Map, ChevronDown,
  Building, Hash, Navigation, LocateFixed, Package,
  TrendingDown, AlertTriangle, FileText, Download, Printer,
  LayoutGrid, Mail, Building as BuildingIcon
} from 'lucide-react';
import { formatDate } from '../utils';
import { StatusDisplay } from '../components/StatusDisplay';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface DealersProps {
  onNavigateToHub?: (serial: string) => void;
}

const DealerPrintTemplate: React.FC<{
  dealer: Dealer;
  data: any[];
  type: 'ACTIVE' | 'EXPIRED' | 'EXCHANGES';
  startDate?: string;
  endDate?: string;
}> = ({ dealer, data, type, startDate, endDate }) => {

  const reportTitle = type === 'ACTIVE' ? 'Active Batteries' : type === 'EXPIRED' ? 'Expired Batteries' : 'Exchange History';
  const dateRangeText = startDate && endDate
    ? `from ${formatDate(startDate)} to ${formatDate(endDate)}`
    : startDate
      ? `from ${formatDate(startDate)} onwards`
      : endDate
        ? `up to ${formatDate(endDate)}`
        : 'as of today';

  return (
    <div id="dealer-printable" className="w-full max-w-[210mm] mx-auto bg-white p-8 font-sans">
      {/* Header */}
      <div className="border-b-2 border-black pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">{dealer.name}</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Partner ID: {dealer.id}</p>
            <p className="text-xs font-bold text-gray-500 mt-1">{dealer.location}</p>
          </div>
          <div className="text-right">
            <div className="text-black text-xs font-black uppercase tracking-widest inline-block border-2 border-black px-3 py-1">
              {formatDate(new Date())}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-base font-bold text-black leading-relaxed">
            This is the <span className="uppercase">{reportTitle}</span> record for starline batteries as of <span className="underline">{formatDate(new Date())}</span> {dateRangeText}.
          </p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-left text-xs text-black">
        <thead>
          <tr className="border-b-2 border-black">
            {type === 'EXCHANGES' ? (
              <>
                <th className="py-3 px-2 font-black uppercase tracking-wider">Old Unit</th>
                <th className="py-3 px-2 font-black uppercase tracking-wider">New Unit</th>
                <th className="py-3 px-2 font-black uppercase tracking-wider">Settlement</th>
                <th className="py-3 px-2 font-black uppercase tracking-wider text-right">Date</th>
              </>
            ) : (
              <>
                <th className="py-3 px-2 font-black uppercase tracking-wider">Serial No.</th>
                <th className="py-3 px-2 font-black uppercase tracking-wider">Model</th>
                <th className="py-3 px-2 font-black uppercase tracking-wider">Sold to Dealer</th>
                <th className="py-3 px-2 font-black uppercase tracking-wider text-right">Warranty Period</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item, idx) => (
            <tr key={idx} className="break-inside-avoid border-b border-gray-100">
              {type === 'EXCHANGES' ? (
                <>
                  <td className="py-4 px-2 align-top">
                    <div className="font-bold text-black text-sm">{item.oldBatteryId}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">{item.batteryModel}</div>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="font-bold text-black text-sm">{item.newBatteryId}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">{item.reason}</div>
                  </td>
                  <td className="py-4 px-2 align-top">
                    <div className="font-bold text-gray-800 uppercase text-[11px]">
                      {item.settlementType === 'DIRECT' ? 'Direct Swap' : item.settlementType === 'STOCK' ? 'Stock Given' : 'Credit/Pay'}
                    </div>
                    {item.replenishmentBatteryId && <div className="text-[10px] text-gray-600 mono bg-gray-100 px-1 rounded inline-block mt-1 font-bold">{item.replenishmentBatteryId}</div>}
                  </td>
                  <td className="py-4 px-2 align-top text-right">
                    <div className="font-bold text-black">{formatDate(item.replacementDate)}</div>
                  </td>
                </>
              ) : (
                <>
                  <td className="py-4 px-2 align-top font-black text-black mono text-sm">{item.id}</td>
                  <td className="py-4 px-2 align-top font-bold text-gray-700 text-sm">{item.model}</td>
                  <td className="py-4 px-2 align-top font-medium text-black">
                    {formatDate(item.activationDate)}
                  </td>
                  <td className="py-4 px-2 align-top text-right text-black font-bold">
                    <span>{formatDate(item.activationDate)}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span>{formatDate(item.warrantyExpiry)}</span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-black flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
        <span>Starline Enterprise</span>
        <span>Generated Report</span>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.toString() };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dealer Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-rose-600">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <pre className="mt-4 bg-slate-100 p-4 rounded text-xs font-mono">{this.state.error}</pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DealersContent: React.FC<DealersProps> = ({ onNavigateToHub }) => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [totalDealers, setTotalDealers] = useState(0);
  const [page, setPage] = useState(1);
  const [models, setModels] = useState<BatteryModel[]>([]);

  // VIEW MODES: 'LIST' | 'DETAIL' | 'WIZARD'
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'WIZARD'>('LIST');
  const [wizardStep, setWizardStep] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [generatedId, setGeneratedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);

  // TABS
  const [activeLogTab, setActiveLogTab] = useState<'ACTIVE' | 'EXPIRED' | 'EXCHANGES'>('ACTIVE');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [unitPage, setUnitPage] = useState(0);
  const unitsLimit = 10;
  const [analytics, setAnalytics] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    address: '',
    contact: '',
    city: '',
    state: '',
    pincode: ''
  });

  const loadData = async () => {
    // Enterprise Scalability: Fetch paginated dealers
    const [dResult, m] = await Promise.all([
      Database.getPaginated<Dealer>('dealers', page, 50),
      Database.getAll<BatteryModel>('models')
    ]);

    setDealers(prev => page === 1 ? dResult.data : [...prev, ...dResult.data]);
    setTotalDealers(dResult.total);
    setModels(m); // Models are small enough to load all
  };

  useEffect(() => { loadData(); }, [page]); // Reload when page changes

  // --- FILTER & CALCULATIONS ---
  const filteredDealers = useMemo(() => {
    return dealers.filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [dealers, searchTerm]);

  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const fetchTabData = async () => {
    if (!selectedDealer) return;

    if (activeLogTab === 'EXCHANGES') {
      const result = await Database.getPaginatedReplacements(
        selectedDealer.id,
        unitPage + 1,
        unitsLimit,
        logSearchQuery || undefined,
        filterDateStart || undefined,
        filterDateEnd || undefined,
        filterModel || undefined
      );
      setPaginatedData(result.data);
      setTotalItems(result.total);
    } else {
      let where = `dealerId = ?`;
      let params: any[] = [selectedDealer.id];

      if (activeLogTab === 'ACTIVE') {
        where += ` AND (status = 'ACTIVE' OR status = 'REPLACEMENT') AND datetime(warrantyExpiry) >= datetime('now')`;
      } else if (activeLogTab === 'EXPIRED') {
        where += ` AND (status = 'EXPIRED' OR datetime(warrantyExpiry) < datetime('now'))`;
      }

      if (logSearchQuery) {
        where += ` AND id LIKE ?`;
        params.push(`%${logSearchQuery}%`);
      }

      if (filterDateStart) {
        // Use activationDate for Active/Expired, or manufactureDate if null
        where += ` AND date(COALESCE(activationDate, manufactureDate)) >= date(?)`;
        params.push(filterDateStart);
      }

      if (filterDateEnd) {
        where += ` AND date(COALESCE(activationDate, manufactureDate)) <= date(?)`;
        params.push(filterDateEnd);
      }

      if (filterModel) {
        where += ` AND model = ?`;
        params.push(filterModel);
      }

      const result = await Database.getPaginated<any>('batteries', unitPage + 1, unitsLimit, where, params);
      setPaginatedData(result.data);
      setTotalItems(result.total);
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [selectedDealer, activeLogTab, unitPage, logSearchQuery, filterDateStart, filterDateEnd, filterModel]);

  // --- ACTIONS ---

  const handleStartWizard = (existing?: Dealer) => {
    if (existing) {
      setGeneratedId(existing.id);
      const locParts = (existing.location || "").split(/, | - /);
      setFormData({
        name: existing.name,
        owner: existing.ownerName,
        address: existing.address,
        contact: existing.contact,
        city: locParts[0] || "",
        state: locParts[1] || "",
        pincode: locParts[2] || ""
      });
      setSelectedDealer(existing); // keep selected for update context if needed
    } else {
      setGeneratedId(`DL-${Math.floor(100000 + Math.random() * 899999)}`);
      setFormData({ name: '', owner: '', address: '', contact: '', city: '', state: '', pincode: '' });
      setSelectedDealer(null);
    }
    setWizardStep(0);
    setViewMode('WIZARD');
  };

  const handleAddOrUpdate = async () => {
    setIsSubmitting(true);
    const locationString = `${formData.city}, ${formData.state} - ${formData.pincode}`.toUpperCase();

    const dealerData = {
      id: generatedId,
      name: formData.name.toUpperCase(),
      ownerName: formData.owner.toUpperCase(),
      address: formData.address.toUpperCase(),
      contact: formData.contact,
      location: locationString
    };

    if (selectedDealer) {
      await Database.updateDealer(dealerData);
    } else {
      await Database.addDealer(dealerData);
    }

    setIsSubmitting(false);

    await loadData();
    setViewMode('LIST');
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: selectedDealer ? 'Partner details updated' : 'Partner enrollment complete' } }));
  };

  const loadDealerDetail = async (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setUnitPage(0);
    setLogSearchQuery('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setActiveLogTab('ACTIVE');
    const data = await Database.getDealerAnalytics(dealer.id);
    setAnalytics(data);
    setViewMode('DETAIL');
  };


  const handleDeleteDealer = async (dealerId: string) => {
    if (!dealerId) return;

    if (analytics?.activeUnitCount > 0) {
      if (!window.confirm(`WARNING: This partner has ${analytics.activeUnitCount} active warranty units.\n\nAre you sure you want to proceed?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Delete partner ${selectedDealer?.name} permanently?`)) {
        return;
      }
    }

    await Database.deleteDealer(dealerId);
    setViewMode('LIST');
    loadData();
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // SETTLEMENT MODAL STATE
  const [settlementModal, setSettlementModal] = useState<{
    isOpen: boolean;
    replacementId: string;
    oldBatteryId: string;
    method: 'CREDIT' | 'STOCK';
    date: string;
    replenishmentId: string;
  }>({
    isOpen: false,
    replacementId: '',
    oldBatteryId: '',
    method: 'CREDIT',
    date: new Date().toISOString().split('T')[0],
    replenishmentId: ''
  });
  const [isSettling, setIsSettling] = useState(false);

  const handleOpenSettlement = (repo: any) => {
    setSettlementModal({
      isOpen: true,
      replacementId: repo.id,
      oldBatteryId: repo.oldBatteryId,
      method: 'CREDIT',
      date: repo.replacementDate ? repo.replacementDate.split('T')[0] : new Date().toISOString().split('T')[0],
      replenishmentId: ''
    });
  };



  // --- RENDER ---
  // ... (Modal code remains same, skipping for brevity in this tool call context if not targeted, but tool replaces context chunks so I must be careful)
  // Actually I should just target the handleOpenSettlement and the specific table cell separately or in one large chunk if they are close.
  // They are somewhat far apart. I will stick to targeting the chunks I see.

  // Wait, I can't do multiple replace chunks in one `replace_file_content` call unless I use `multi_replace_file_content`.
  // I will use `multi_replace_file_content` to update:
  // 1. handleOpenSettlement (Line ~256)
  // 2. The table cell content (Line ~580)


  const handleResolveSettlement = async () => {
    if (!settlementModal.replacementId) return;
    setIsSettling(true);
    try {
      await Database.resolveSettlement(
        settlementModal.replacementId,
        settlementModal.method,
        settlementModal.date,
        settlementModal.method === 'STOCK' ? settlementModal.replenishmentId : undefined
      );
      setSettlementModal(prev => ({ ...prev, isOpen: false }));
      fetchTabData(); // Reload table
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Settlement Resolved Successfully' } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: e.message || 'Settlement Failed', type: 'error' } }));
    } finally {
      setIsSettling(false);
    }
  };

  // --- RENDER ---
  if (viewMode === 'DETAIL' && selectedDealer) {
    // --- DETAIL VIEW ---

    const handlePrint = () => {
      const originalTitle = document.title;
      document.title = `${selectedDealer.name}_${activeLogTab}_Report`;
      window.print();
      document.title = originalTitle;
    };

    return (
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 text-slate-900 relative">
        <style>
          {`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body > *:not(#dealer-print-portal) { display: none !important; }
                    html, body { background: white !important; height: auto !important; overflow: visible !important; }
                    #dealer-print-portal { 
                        display: block !important; 
                        position: absolute !important; 
                        top: 0 !important; 
                        left: 0 !important; 
                        width: 100% !important; 
                        z-index: 9999 !important; 
                    }
                    /* Ensure table breaks page correctly */
                    tr { break-inside: avoid; }
                }
                #dealer-print-portal { display: none; }
            `}
        </style>

        {/* PRINT PORTAL */}
        {createPortal(
          <div id="dealer-print-portal">
            <DealerPrintTemplate
              dealer={selectedDealer}
              data={paginatedData}
              type={activeLogTab}
              startDate={filterDateStart}
              endDate={filterDateEnd}
            />
          </div>,
          document.body
        )}

        {/* SETTLEMENT MODAL */}
        {settlementModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Resolve Settlement</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">For Replacement of {settlementModal.oldBatteryId}</p>
                </div>
                <button onClick={() => setSettlementModal(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-400 hover:text-slate-900" /></button>
              </div>

              <div className="p-8 space-y-6">
                {/* 1. Method Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Settlement Method</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSettlementModal(prev => ({ ...prev, method: 'CREDIT' }))}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settlementModal.method === 'CREDIT' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <CreditCard size={24} />
                      <span className="text-xs font-black uppercase">Paid Money / Credit</span>
                    </button>
                    <button
                      onClick={() => setSettlementModal(prev => ({ ...prev, method: 'STOCK' }))}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settlementModal.method === 'STOCK' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <Package size={24} />
                      <span className="text-xs font-black uppercase">New Stock Given</span>
                    </button>
                  </div>
                </div>

                {/* 2. Date Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Settlement Date</label>
                  <input
                    type="date"
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all uppercase text-slate-900"
                    value={settlementModal.date}
                    onChange={e => setSettlementModal(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                {/* 3. Stock Scanner (Conditional) */}
                {settlementModal.method === 'STOCK' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-indigo-500 uppercase tracking-widest pl-1 flex items-center gap-2"><QrCode size={14} /> Scan New Battery ID</label>
                    <input
                      autoFocus
                      placeholder="SCAN STOCK SERIAL..."
                      className="w-full px-5 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl font-black text-lg outline-none focus:border-indigo-500 transition-all uppercase text-indigo-900 placeholder:text-indigo-300"
                      value={settlementModal.replenishmentId}
                      onChange={e => setSettlementModal(prev => ({ ...prev, replenishmentId: e.target.value.toUpperCase().trim() }))}
                    />
                    <p className="text-[10px] text-indigo-400 font-bold px-1">This unit will be activated and assigned to dealer immediately.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button onClick={() => setSettlementModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">Cancel</button>
                <button
                  onClick={handleResolveSettlement}
                  disabled={isSettling || (settlementModal.method === 'STOCK' && !settlementModal.replenishmentId)}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSettling ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('LIST')} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 shadow-sm"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedDealer.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Store size={14} className="text-blue-500" /> {selectedDealer.id}</div>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><MapPin size={14} className="text-emerald-500" /> {selectedDealer.location}</div>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Phone size={14} className="text-purple-500" /> {selectedDealer.contact}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleStartWizard(selectedDealer)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm"><Settings size={16} /> Manage Partner</button>
          </div>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* KPI Cards */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Zap size={20} /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Velocity (30d)</span>
              </div>
              <p className="text-3xl font-black text-slate-900">{analytics?.last30Sales || 0} <span className="text-xs font-bold text-slate-400">UNITS</span></p>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-3 rounded-xl ${Number(analytics?.claimRatio) > 5 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><TrendingDown size={20} /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Ratio</span>
              </div>
              <p className={`text-3xl font-black ${Number(analytics?.claimRatio) > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>{analytics?.claimRatio || '0.0'}%</p>
            </div>
          </div>

        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <div className="flex flex-col lg:flex-row justify-between items-center border-b border-slate-50 px-8 py-5 bg-slate-50/30 gap-6">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={() => { setActiveLogTab('ACTIVE'); setUnitPage(0); }} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeLogTab === 'ACTIVE' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>Active</button>
              <button onClick={() => { setActiveLogTab('EXCHANGES'); setUnitPage(0); }} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeLogTab === 'EXCHANGES' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}>Exchanges</button>
              <button onClick={() => { setActiveLogTab('EXPIRED'); setUnitPage(0); }} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeLogTab === 'EXPIRED' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}>Expired</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-bold uppercase tracking-tight shadow-sm ${isFilterOpen || filterDateStart || filterDateEnd || filterModel ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <Filter size={16} />
                  <span>Filters {(filterDateStart || filterDateEnd || filterModel) ? '(Active)' : ''}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 p-6 animate-in fade-in zoom-in-95 duration-200">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Refine Records</h4>
                          <button
                            onClick={() => {
                              setFilterDateStart('');
                              setFilterDateEnd('');
                              setFilterModel('');
                              setIsFilterOpen(false);
                              setUnitPage(0);
                            }}
                            className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                          >
                            Reset All
                          </button>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Date Range</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all text-slate-900"
                              value={filterDateStart}
                              onChange={e => { setFilterDateStart(e.target.value); setUnitPage(0); }}
                              title="From Date"
                            />
                            <input
                              type="date"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all text-slate-900"
                              value={filterDateEnd}
                              onChange={e => { setFilterDateEnd(e.target.value); setUnitPage(0); }}
                              title="To Date"
                            />
                          </div>
                        </div>

                        {/* Model Filter */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Product Model</label>
                          <select
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all text-slate-900 appearance-none cursor-pointer"
                            value={filterModel}
                            onChange={e => { setFilterModel(e.target.value); setUnitPage(0); }}
                          >
                            <option value="">ALL MODELS</option>
                            {models.map(m => (
                              <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => setIsFilterOpen(false)}
                          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="h-6 w-px bg-slate-200 mx-2"></div>

              {/* PRINT BUTTON */}
              <button
                onClick={handlePrint}
                className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-500 hover:text-slate-900 shadow-sm"
                title="Print Table"
              >
                <Printer size={18} />
              </button>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search records..." className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 uppercase transition-all w-64 shadow-sm" value={logSearchQuery} onChange={e => { setLogSearchQuery(e.target.value); setUnitPage(0); }} />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-black border-b border-slate-100 uppercase tracking-widest">
                  {activeLogTab === 'EXCHANGES' ? (
                    <>
                      <th className="px-6 py-4 whitespace-nowrap">Old Battery</th>
                      <th className="px-6 py-4 whitespace-nowrap">Replaced By</th>
                      <th className="px-6 py-4 whitespace-nowrap">Model</th>
                      <th className="px-6 py-4 whitespace-nowrap">Sold Date</th>
                      <th className="px-6 py-4 whitespace-nowrap">Replaced On</th>
                      <th className="px-6 py-4 whitespace-nowrap">Settlement</th>
                      <th className="px-6 py-4 whitespace-nowrap">Outcome / Evidence</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 pl-10">Identifier</th>
                      <th className="px-8 py-5">Product Model</th>
                      <th className="px-8 py-5">Status Info</th>
                      <th className="px-8 py-5 text-right pr-10">Timeline</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedData.map((item: any) => (
                  <tr
                    key={item.id}
                    onClick={() => onNavigateToHub && onNavigateToHub(activeLogTab === 'EXCHANGES' ? item.newBatteryId : item.id)}
                    className="hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    {activeLogTab === 'EXCHANGES' ? (
                      <>
                        <td className="px-6 py-5 font-bold text-slate-900 mono text-sm whitespace-nowrap flex items-center gap-2">
                          {item.oldBatteryId}
                          <span className="text-slate-300">→</span>
                        </td>
                        <td className="px-6 py-5 font-bold text-blue-600 mono text-sm whitespace-nowrap cursor-pointer hover:underline" onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToHub) onNavigateToHub(item.newBatteryId);
                        }}>
                          {item.newBatteryId}
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-700 text-sm uppercase whitespace-nowrap">
                          {item.batteryModel || '-'}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          {item.soldDate ? (
                            <span className="font-bold text-slate-900 mono text-xs">{formatDate(item.soldDate)}</span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-500 text-xs mono whitespace-nowrap">
                          {formatDate(item.replacementDate)}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            {item.settlementType === 'DIRECT' ? (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Direct Settlement
                                </span>
                                <span className="text-xs font-bold text-slate-700 mono">{item.newBatteryId}</span>
                              </div>
                            ) : item.settlementType === 'STOCK' ? (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">Stock Given</span>
                                <span className="text-xs font-bold text-slate-700 mono">{item.replenishmentBatteryId}</span>
                              </div>
                            ) : item.paidInAccount ? (
                              <div className="flex flex-col text-emerald-600">
                                <span className="text-[9px] font-bold uppercase tracking-wide flex items-center gap-1"><CheckCircle2 size={10} /> Paid / Credited</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenSettlement(item)}
                                className="px-3 py-1.5 text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-700 rounded-lg uppercase tracking-wide flex items-center gap-1 hover:bg-amber-100 transition-all shadow-sm"
                              >
                                <Clock size={12} />
                                Resolve...
                              </button>
                            )}
                            {(item.settlementDate || item.settlementType === 'DIRECT') && (
                              <span className="text-[9px] font-bold text-slate-400 mono">
                                {item.settlementType === 'DIRECT'
                                  ? formatDate(item.replacementDate)
                                  : formatDate(item.settlementDate)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="text-xs font-bold text-amber-700 flex items-center gap-1 uppercase"><ShieldAlert size={14} /> FAILED: {item.reason}</div>
                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase pl-5"><FileText size={10} /> Doc: {item.warrantyCardStatus === 'RECEIVED' ? 'Original' : item.warrantyCardStatus === 'XEROX' ? 'Xerox' : item.warrantyCardStatus === 'WHATSAPP' ? 'Digital' : 'None'}</div>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-5 pl-10 font-bold text-slate-900 text-sm uppercase">{item.id}</td>
                        <td className="px-8 py-5 font-bold text-slate-500 text-sm uppercase">{item.model}</td>
                        <td className="px-8 py-5">
                          <StatusDisplay
                            status={item.status}
                            isExpired={item.warrantyExpiry ? new Date() > new Date(item.warrantyExpiry) : false}
                            dealerId={item.dealerId}
                            variant="badge"
                          />
                        </td>
                        <td className="px-8 py-5 text-right pr-10 font-mono text-xs text-slate-500 font-bold">
                          <div><span className="text-slate-900">{formatDate(item.activationDate)}</span><span className="text-slate-300 mx-2">→</span><span className="text-rose-600">{formatDate(item.warrantyExpiry)}</span></div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedData.length === 0 && <div className="py-24 flex flex-col items-center justify-center opacity-40"><Box size={48} className="mb-4 text-slate-300" /><p className="text-xs font-black uppercase tracking-widest text-slate-400">No records found</p></div>}
          </div>

          {/* Pagination */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {unitPage * unitsLimit + 1}-{Math.min((unitPage + 1) * unitsLimit, totalItems)} of {totalItems} Records</span>
            <div className="flex gap-2">
              <button disabled={unitPage === 0} onClick={() => setUnitPage(p => p - 1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
              <button disabled={(unitPage + 1) * unitsLimit >= totalItems} onClick={() => setUnitPage(p => p + 1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (viewMode === 'WIZARD') {
    // --- WIZARD VIEW (Modal-Free) ---
    return (
      <div className="max-w-4xl mx-auto py-8 animate-in slide-in-from-right-4 duration-500">
        <div className="mb-8 flex items-center gap-4">
          <button onClick={() => setViewMode('LIST')} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all shadow-sm"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Enrollment Wizard</h1>
            <p className="text-sm font-medium text-slate-500">Register a new authorized partner in 3 steps</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-10 flex items-center justify-between relative px-8">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-10" />
          {[
            { id: 0, label: 'Identity', icon: Store },
            { id: 1, label: 'Location', icon: MapPin },
            { id: 2, label: 'Confirm', icon: CheckCircle2 }
          ].map((step, idx) => (
            <div key={idx} className={`flex flex-col items-center gap-2 bg-white px-2 ${idx <= wizardStep ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${idx <= wizardStep ? 'bg-blue-50 border-blue-600 scale-110' : 'bg-white border-slate-200'}`}>
                <step.icon size={20} className={idx <= wizardStep ? 'text-blue-600' : 'text-slate-300'} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider bg-white px-1">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-xl shadow-slate-200/50 min-h-[500px] flex flex-col justify-between">

          <div className="flex-1">
            {wizardStep === 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl text-blue-700 mb-8 border border-blue-100">
                  <Info size={24} className="shrink-0" />
                  <p className="text-sm font-medium leading-relaxed">Please ensure the business name matches the legal registration documents. This ID will be used for all warranty claims.</p>
                </div>

                <div className="space-y-6 max-w-lg mx-auto">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Business Name</label>
                    <div className="relative group">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input autoFocus className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:bg-white focus:border-blue-500 transition-all uppercase placeholder:text-slate-300" placeholder="e.g. STARLINE BATTERIES" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Owner Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" placeholder="e.g. Salid Nadaf" value={formData.owner} onChange={e => setFormData({ ...formData, owner: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contact Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                      <input className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" placeholder="e.g. 9876543210" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Where are they located?</h3>
                  <p className="text-sm text-slate-400 mt-1">Accurate location data helps in logistics planning</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Street Address</label>
                    <textarea rows={2} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" placeholder="SHOP NO, STREET, AREA" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">City</label>
                    <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" placeholder="CITY NAME" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">State</label>
                    <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" placeholder="STATE" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Pincode</label>
                    <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" placeholder="591313" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 max-w-lg mx-auto text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Ready to Enroll?</h3>
                  <p className="text-slate-500 mt-2">Please review the details below before confirming.</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-4">
                  <div className="flex justify-between border-b border-slate-200 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Partner ID</span>
                    <span className="text-sm font-black text-slate-700">{generatedId}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Business</span>
                    <span className="text-sm font-bold text-slate-900">{formData.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase">Owner</span>
                    <span className="text-sm font-bold text-slate-700">{formData.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Location</span>
                    <span className="text-sm font-bold text-slate-700 text-right">{formData.city}, {formData.state}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Nav */}
          <div className="flex justify-between pt-8 border-t border-slate-100 mt-8">
            <button
              onClick={() => {
                if (wizardStep > 0) setWizardStep(s => s - 1);
                else setViewMode('LIST');
                setError('');
              }}
              className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
            >
              {wizardStep === 0 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex flex-col items-end gap-2">
              {error && <span className="text-xs font-bold text-rose-500 animate-pulse">{error}</span>}
              <button
                onClick={() => {
                  setError('');
                  if (wizardStep === 0) {
                    const isDuplicate = dealers.some(d =>
                      d.name.trim().toUpperCase() === formData.name.trim().toUpperCase() &&
                      d.id !== generatedId
                    );
                    if (isDuplicate) {
                      setError('Partner name already exists in registry');
                      return;
                    }
                  }

                  if (wizardStep < 2) setWizardStep(s => s + 1);
                  else handleAddOrUpdate();
                }}
                disabled={
                  (wizardStep === 0 && (!formData.name || !formData.contact)) ||
                  (wizardStep === 1 && (!formData.city || !formData.state)) ||
                  isSubmitting
                }
                className="px-10 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {wizardStep === 2 ? (isSubmitting ? 'Enrolling...' : 'Confirm Enrollment') : 'Continue'}
                {!isSubmitting && wizardStep < 2 && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // --- LIST VIEW (Default) ---
    return (
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 text-slate-900">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div><h2 className="text-2xl font-bold text-slate-900">Partner Network</h2><p className="text-sm font-medium text-slate-500 mt-1">Authorized Dealers & Distributors</p></div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0"><div className="bg-blue-600/10 text-blue-600 p-4 rounded-2xl"><Users size={32} /></div></div>
            <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input placeholder="Search partners..." className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none text-slate-900 focus:bg-white focus:border-blue-500 transition-all uppercase tracking-widest mono" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => handleStartWizard()} className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-3">
              <Plus size={18} />
              <span>Enroll Partner</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDealers.map(dealer => (
            <div key={dealer.id} onClick={() => loadDealerDetail(dealer)} className="bg-white border border-slate-200 rounded-[2rem] p-8 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] text-slate-900 rotate-12 pointer-events-none group-hover:scale-110 transition-transform"><Store size={180} /></div>
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors"><Building2 size={24} /></div>
                  <div className="bg-blue-50 px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-widest">{dealer.id}</div>
                </div>
                <div><h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-1 truncate">{dealer.name}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={12} /> {dealer.ownerName}</p></div>
                <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><MapPin size={14} /></div><span className="uppercase truncate">{dealer.location}</span></div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0"><Phone size={14} /></div><span className="font-mono tracking-wide">{dealer.contact}</span></div>
                </div>
              </div>
            </div>
          ))}
          {filteredDealers.length === 0 && <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40"><Store size={64} className="text-slate-300 mb-4" /><p className="text-sm font-black text-slate-400 uppercase tracking-widest">No partners found matching criteria</p></div>}
        </div>
      </div>
    );
  }
};

const Dealers: React.FC<DealersProps> = (props) => (
  <ErrorBoundary>
    <DealersContent {...props} />
  </ErrorBoundary>
);

export default Dealers;
