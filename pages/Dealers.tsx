
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { Dealer, Battery, Replacement, BatteryStatus, BatteryModel } from '../types';
import {
  Plus, X, Search, MapPin, Phone, Store,
  User, ShieldCheck, ChevronRight, RefreshCw,
  ArrowLeft, ChevronLeft, ShoppingBag,
  Landmark, Filter, Users, Box, Info,
  Trash2, ShieldAlert, ClipboardCheck, Clock, Lock,
  UserCheck, ExternalLink, Globe, ListFilter,
  CheckCircle2, FileSignature, MapPinned,
  Building2, Loader2, ArrowRight, Settings, ShieldQuestion,
  Trophy, Activity, PieChart as IconPieChart, TrendingUp, Zap, QrCode,
  Fingerprint, CreditCard, FileCheck, Map, ChevronDown,
  Building, Hash, Navigation, LocateFixed, Package,
  TrendingDown, AlertTriangle, FileText, Download, Printer,
  LayoutGrid, Mail, Building as BuildingIcon, Check
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
  filterModel?: string;
}> = ({ dealer, data, type, startDate, endDate, filterModel }) => {

  const reportTitle = type === 'ACTIVE' ? 'Active Batteries' : type === 'EXPIRED' ? 'Expired Batteries' : 'Exchange History';
  const modelText = filterModel ? `[Model: ${filterModel}]` : 'for all models';
  const dateRangeText = startDate && endDate
    ? `from ${formatDate(startDate)} to ${formatDate(endDate)}`
    : startDate
      ? `from ${formatDate(startDate)} onwards`
      : endDate
        ? `up to ${formatDate(endDate)}`
        : '';

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
            This is the <span className="uppercase">{reportTitle}</span> record {modelText} sold to dealer {dateRangeText}.
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
                    {formatDate(item.manufactureDate)}
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

  // Lock Screen State
  const [isLocked, setIsLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [pendingDealer, setPendingDealer] = useState<Dealer | null>(null);

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
    const [d, m, p] = await Promise.all([
      Database.getAll<Dealer>('dealers'),
      Database.getAll<BatteryModel>('models'),
      Database.getConfig('starline_admin_pass')
    ]);
    setDealers(d);
    setModels(m);
    setAdminPassword(p || 'starline@2025');
  };

  useEffect(() => { loadData(); }, []); // Reload when page changes

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

  const loadDealerDetail = (dealer: Dealer) => {
    setPendingDealer(dealer);
    setIsLocked(true);
  };

  const executeLoadDealerDetail = async (dealer: Dealer) => {
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

  const handleUnlockDealer = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockPassword === adminPassword) {
      const dealerToLoad = pendingDealer;
      setIsLocked(false);
      setLockPassword('');
      setLockError('');
      setPendingDealer(null);
      if (dealerToLoad) {
        executeLoadDealerDetail(dealerToLoad);
      }
    } else {
      setLockError('Invalid Access Key. Authorization Denied.');
      setLockPassword('');
    }
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
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Settlement Resolved Successfully', type: 'success' } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: e.message || 'Settlement Failed', type: 'error' } }));
    } finally {
      setIsSettling(false);
    }
  };

  // --- RENDER ---
  if (isLocked) {
    return (
      <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
        <button
          onClick={() => { setIsLocked(false); setPendingDealer(null); setLockPassword(''); setLockError(''); }}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-all group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Partners
        </button>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-0 max-w-md mx-auto animate-in zoom-in-95 duration-300 relative overflow-hidden text-slate-900">
          {/* Header Bar */}
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Access Restricted</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">AUTH_LVL_2</div>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Lock size={28} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Partner Vault</h3>
              <p className="text-xs text-slate-500 font-medium">Authorization required for <span className="text-slate-900 font-bold">{pendingDealer?.name || 'Partner'}</span></p>
            </div>

            {lockError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 animate-shake">
                <ShieldAlert size={18} />
                <span className="text-[10px] font-black">{lockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockDealer} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity Verification</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Fingerprint className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                  </div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="ENTER ACCESS KEY"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 uppercase tracking-widest"
                    value={lockPassword}
                    onChange={e => setLockPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2"
                >
                  Authorize Access
                </button>
              </div>
            </form>
          </div>

          {/* Footer Status */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center text-[9px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={10} className="text-emerald-500" />
              <span>SECURE ENDPOINT</span>
            </div>
            <div>LOC: {pendingDealer?.id || 'Unknown'}</div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'DETAIL' && selectedDealer) {
    const handlePrint = () => {
      const originalTitle = document.title;
      document.title = `${selectedDealer.name}_${activeLogTab}_Report`;
      window.print();
      document.title = originalTitle;
    };

    return (
      <>
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 text-slate-900 relative">
          <style>
            {`
            @media print {
              /* HIDE EVERYTHING ELSE */
              body > *:not(#print-portal-root) {
                display: none !important;
              }

              /* Reset Body for Print */
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                height: auto !important;
                overflow: visible !important;
              }

              /* Ensure Portal is Visible and positioned correctly */
              #print-portal-root {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: auto !important;
                z-index: 9999 !important;
                background-color: white !important;
              }

              #dealer-printable {
                background-color: white !important;
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
                overflow: visible !important;
                margin: 0 auto !important;
              }

              .no-print { display: none !important; }
            }

            /* Hide Print Portal on Screen */
            #print-portal-root {
              display: none;
            }
          `}
          </style>

          {/* Settlement Modal Overlay */}
          {settlementModal.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300 no-print">
              <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Resolve Settlement</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Reference: {settlementModal.oldBatteryId}</p>
                  </div>
                  <button onClick={() => setSettlementModal(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X size={20} /></button>
                </div>

                <div className="p-8 space-y-6">
                  {/* 1. Method Selection */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Settlement Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSettlementModal(prev => ({ ...prev, method: 'CREDIT' }))}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settlementModal.method === 'CREDIT' ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                      >
                        <Landmark size={24} className={settlementModal.method === 'CREDIT' ? 'text-blue-600' : 'text-slate-300'} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${settlementModal.method === 'CREDIT' ? 'text-blue-700' : 'text-slate-400'}`}>Account Credit</span>
                      </button>
                      <button
                        onClick={() => setSettlementModal(prev => ({ ...prev, method: 'STOCK' }))}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${settlementModal.method === 'STOCK' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                      >
                        <Box size={24} className={settlementModal.method === 'STOCK' ? 'text-indigo-600' : 'text-slate-300'} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${settlementModal.method === 'STOCK' ? 'text-indigo-700' : 'text-slate-400'}`}>Stock Replace</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Date Input */}
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-white/40 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-xl shadow-slate-200/20">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setViewMode('LIST')}
                className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 shadow-sm hover:shadow-md active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none mb-1">{selectedDealer.name}</h1>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">UID: {selectedDealer.id}</div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest tracking-tighter">• {selectedDealer.location}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end mr-4">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Growth Vector</span>
                <span className="text-lg font-black text-slate-900">+12.4%</span>
              </div>
              <button onClick={() => handleStartWizard(selectedDealer)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm active:scale-95">
                <Settings size={20} />
              </button>
              <button onClick={() => handleDeleteDealer(selectedDealer.id)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all shadow-sm active:scale-95">
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                {[
                  { id: 'ACTIVE', label: 'Active Warranty', icon: Box },
                  { id: 'EXCHANGES', label: 'Exchange Log', icon: RefreshCw },
                  { id: 'EXPIRED', label: 'Expired Units', icon: Clock }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveLogTab(tab.id as any); setUnitPage(0); }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap shadow-sm active:scale-95 ${activeLogTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative group/filter">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center gap-2 px-4 py-3 bg-white border ${isFilterOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600'} rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all`}
                  >
                    <Filter size={16} />
                    Filters
                    {(filterDateStart || filterDateEnd || filterModel) && <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse ml-1"></span>}
                  </button>

                  {isFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                      <div className="absolute right-0 top-14 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-50 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><ListFilter size={14} /> Filter Analytics</h4>
                          <button onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterModel(''); }} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Reset</button>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Lifecycle Window</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500" value={filterDateStart} onChange={e => { setFilterDateStart(e.target.value); setUnitPage(0); }} />
                            <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500" value={filterDateEnd} onChange={e => { setFilterDateEnd(e.target.value); setUnitPage(0); }} />
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
                      onClick={() => onNavigateToHub?.(activeLogTab === 'EXCHANGES' ? item.oldBatteryId : item.id)}
                      className="group/row hover:bg-slate-50/80 transition-all cursor-pointer"
                    >
                      {activeLogTab === 'EXCHANGES' ? (
                        <>
                          <td className="px-6 py-5 font-bold text-slate-900 mono text-xs">{item.oldBatteryId}</td>
                          <td className="px-6 py-5 font-black text-blue-600 mono text-xs">
                            <div className="flex items-center gap-2">
                              {item.newBatteryId}
                              <ArrowRight size={12} />
                            </div>
                          </td>
                          <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.batteryModel}</td>
                          <td className="px-6 py-5 font-bold text-slate-500 mono text-[10px]">{formatDate(item.soldDate)}</td>
                          <td className="px-6 py-5 font-bold text-slate-500 mono text-[10px]">{formatDate(item.replacementDate)}</td>
                          <td className="px-6 py-5">
                            {item.replenishmentBatteryId ? (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-indigo-500 uppercase">Stock Replaced</span>
                                <span className="text-xs font-black text-slate-900 mono">{item.replenishmentBatteryId}</span>
                              </div>
                            ) : item.settlementType === 'DIRECT' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-black uppercase">Direct</span>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenSettlement(item); }}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${item.paidInAccount ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:shadow-md active:scale-95'}`}
                              >
                                {item.paidInAccount ? 'Settled' : 'Pending Settlement'}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-rose-600 uppercase">FAILED: {item.reason}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Evidence: {item.warrantyCardStatus}</span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-8 py-5 pl-10 font-bold text-slate-900 mono text-xs flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover/row:scale-150 transition-transform"></div>
                            {item.id}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-900">{item.model}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.capacity || 'Auto-Cap'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <StatusDisplay
                              status={item.status}
                              isExpired={activeLogTab === 'EXPIRED'}
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

        {/* Print Mode (Detached Portal) */}
        {createPortal(
          <div id="print-portal-root">
            {selectedDealer && (
              <DealerPrintTemplate
                dealer={selectedDealer}
                data={paginatedData}
                type={activeLogTab}
                startDate={filterDateStart}
                endDate={filterDateEnd}
                filterModel={filterModel}
              />
            )}
          </div>,
          document.body
        )}
      </>
    );
  } else if (viewMode === 'WIZARD') {
    // --- WIZARD VIEW (Modal-Free) ---
    return (
      <>
        <div className="max-w-4xl mx-auto py-8 animate-in slide-in-from-right-4 duration-500">
          <div className="mb-8 flex items-center gap-4">
            <button onClick={() => setViewMode('LIST')} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all shadow-sm"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Enrollment Wizard</h1>
              <p className="text-sm font-medium text-slate-500">Register a new authorized partner in 3 steps</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="mb-12 flex items-center justify-between relative px-20">
            <div className="absolute left-20 right-20 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-10 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-700 ease-out"
                style={{ width: `${(wizardStep / 2) * 100}%` }}
              />
            </div>
            {[
              { id: 0, label: 'Identity', icon: Store },
              { id: 1, label: 'Location', icon: MapPin },
              { id: 2, label: 'Confirm', icon: CheckCircle2 }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-4 relative">
                <div
                  className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all duration-500 shadow-xl ${idx < wizardStep ? 'bg-blue-600 border-blue-600 text-white' :
                    idx === wizardStep ? 'bg-white border-blue-600 text-blue-600 scale-110 shadow-blue-500/20' :
                      'bg-white border-slate-200 text-slate-300'
                    }`}
                >
                  <step.icon size={idx === wizardStep ? 28 : 24} className={idx === wizardStep ? 'animate-pulse' : ''} />

                  {idx < wizardStep && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md transition-all duration-300 ${idx <= wizardStep ? 'text-slate-900' : 'text-slate-300'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[3rem] p-12 shadow-2xl shadow-blue-500/10 min-h-[600px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>

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
                      <span className="text-sm font-black text-slate-900">{formData.name}</span>
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

      </>
    );
  } else {
    // --- LIST VIEW (Default) ---
    return (
      <>
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              {/* <div> */}
              {/* <h2 className="text-xl font-bold text-slate-700 tracking-tight ">Partner Network</h2> */}
              {/* <p className="text-sm font-medium text-slate-400 mt-1  tracking-widest">Authorized Distribution Nodes</p> */}
              {/* </div> */}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  placeholder="SEARCH PARTNER NAME, ID OR REGION..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-lg transition-all uppercase tracking-widest mono text-slate-900 focus:bg-white focus:border-blue-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => handleStartWizard()}
                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 group/btn"
              >
                <Plus size={18} />
                <span className="uppercase tracking-widest">Enroll Partner</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredDealers.map(dealer => (
              <div
                key={dealer.id}
                onClick={() => loadDealerDetail(dealer)}
                className="group relative bg-white border border-slate-200 rounded-[2.5rem] p-10 hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[320px]"
              >
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-[5rem] -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="absolute bottom-0 right-0 p-12 opacity-[0.03] text-slate-900 rotate-12 pointer-events-none group-hover:scale-110 group-hover:rotate-0 transition-all duration-700">
                  <Building2 size={200} />
                </div>

                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all duration-500">
                      <Store size={28} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">ID: {dealer.id}</div>
                      {/* <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest pl-1 border-l-2 border-emerald-500/20">Active Node</div> */}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2 group-hover:text-blue-600 transition-colors">
                      {dealer.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dealer.ownerName}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-8 mt-10 border-t border-slate-100 flex flex-col gap-1">
                  {/* <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Regional HQ</label> */}
                  <p className="text-[11px] font-bold text-slate-600 uppercase truncate leading-none flex items-center gap-1.5">
                    <MapPin size={12} className="text-blue-500 shrink-0" />
                    {dealer.location}
                  </p>
                </div>

                {/* Interaction Indicator */}

              </div>
            ))}
            {filteredDealers.length === 0 && <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40"><Store size={64} className="text-slate-300 mb-4" /><p className="text-sm font-black text-slate-400 uppercase tracking-widest">No partners found matching criteria</p></div>}
          </div>

        </div>

      </>
    );
  }
};

const Dealers: React.FC<DealersProps> = (props) => (
  <ErrorBoundary>
    <DealersContent {...props} />
  </ErrorBoundary>
);

export default Dealers;
