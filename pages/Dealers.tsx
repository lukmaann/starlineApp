import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  KeyRound, CreditCard, FileCheck, Map, ChevronDown,
  Building, Hash, Navigation, LocateFixed, Package,
  TrendingDown, AlertTriangle, FileText, Download, Printer,
  LayoutGrid, Mail, Building as BuildingIcon, Check
} from 'lucide-react';
import { formatDate } from '../utils';
import { StatusDisplay } from '../components/StatusDisplay';
import { AuthSession } from '../utils/AuthSession';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { SettlementModal, SettlementTarget } from '../components/SettlementModal';
import BatteryPrintTemplate from '../components/BatteryPrintTemplate';
import { DealerWizard } from '../components/DealerWizard';
import DealerAnalytics from '../components/DealerAnalytics';
import { scheduleUndoableAction } from '../utils/undoToast';

interface DealersProps {
  onNavigateToHub?: (serial: string) => void;
  initialState?: any;
  onStateChange?: (state: any) => void;
  active?: boolean;
  pendingDealerTarget?: {
    dealerId: string;
    batteryId: string;
    status: BatteryStatus;
    isExpired: boolean;
  } | null;
  onPendingDealerHandled?: () => void;
}



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

const DealersContent: React.FC<DealersProps> = ({ onNavigateToHub, initialState, onStateChange, active, pendingDealerTarget, onPendingDealerHandled }) => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [totalDealers, setTotalDealers] = useState(0);
  const DEALERS_PER_PAGE = 12;
  const [page, setPage] = useState(1);
  const [models, setModels] = useState<BatteryModel[]>([]);

  // VIEW MODES: 'LIST' | 'DETAIL' | 'WIZARD' | 'ANALYTICS'
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'WIZARD' | 'ANALYTICS'>('LIST');
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
  const [activeLogTab, setActiveLogTab] = useState<'ACTIVE' | 'EXPIRED' | 'EXCHANGES' | 'RETURNED'>('ACTIVE');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [isFilterOpen, setIsFilterOpen] = useState<'TABS' | 'FILTERS' | ''>('');
  const tabsMenuRef = useRef<HTMLDivElement | null>(null);
  const filtersMenuRef = useRef<HTMLDivElement | null>(null);
  const registrySearchRef = useRef<HTMLDivElement | null>(null);

  const [unitPage, setUnitPage] = useState(0);
  const unitsLimit = 100;
  const [analytics, setAnalytics] = useState<any>(null);
  const [highlightedBatteryId, setHighlightedBatteryId] = useState<string | null>(null);

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

  useEffect(() => {
    loadData();

    if (initialState) {
      if (initialState.selectedDealer) setSelectedDealer(initialState.selectedDealer);
      if (initialState.viewMode) setViewMode(initialState.viewMode);
      if (initialState.searchTerm) setSearchTerm(initialState.searchTerm);
      if (initialState.activeLogTab) setActiveLogTab(initialState.activeLogTab);
      // Restore other relevant state if needed
    }
  }, []); // Reload when page changes

  useEffect(() => {
    if (!active || !pendingDealerTarget || dealers.length === 0) return;

    const targetDealer = dealers.find(d => d.id === pendingDealerTarget.dealerId);
    if (targetDealer) {
      executeLoadDealerDetail(targetDealer);
      setHighlightedBatteryId(pendingDealerTarget.batteryId);
      setUnitPage(0);
      setLogSearchQuery(pendingDealerTarget.batteryId);

      if (pendingDealerTarget.status === BatteryStatus.RETURNED || pendingDealerTarget.status === BatteryStatus.RETURNED_PENDING) {
        setActiveLogTab('RETURNED');
      } else if (pendingDealerTarget.isExpired) {
        setActiveLogTab('EXPIRED');
      } else {
        setActiveLogTab('ACTIVE');
      }

      onPendingDealerHandled?.();
    }
  }, [active, pendingDealerTarget, dealers]);

  useEffect(() => {
    if (active) {
      loadData();
      // Refresh analytics if we are in detail view
      if (selectedDealer && viewMode === 'DETAIL') {
        Database.getDealerAnalytics(selectedDealer.id).then(setAnalytics);
      }
    }
  }, [active]);

  // Listen for session changes
  useEffect(() => {
    const handleSessionChange = (e: any) => {
      setIsLocked(!e.detail.isAuthenticated);
    };
    window.addEventListener('session-changed' as any, handleSessionChange);
    return () => window.removeEventListener('session-changed' as any, handleSessionChange);
  }, []);

  // Save State
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        selectedDealer,
        viewMode,
        searchTerm,
        activeLogTab
      });
    }
  }, [selectedDealer, viewMode, searchTerm, activeLogTab]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (isFilterOpen === 'TABS' && tabsMenuRef.current && !tabsMenuRef.current.contains(target)) {
        setIsFilterOpen('');
      }

      if (isFilterOpen === 'FILTERS' && filtersMenuRef.current && !filtersMenuRef.current.contains(target)) {
        resetRegistryFilters();
        setIsFilterOpen('');
      }

      if (registrySearchRef.current && !registrySearchRef.current.contains(target) && logSearchQuery) {
        setLogSearchQuery('');
        setUnitPage(0);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isFilterOpen, logSearchQuery]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // --- FILTER & CALCULATIONS ---
  const sortedDealers = useMemo(() => {
    const filtered = dealers.filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [dealers, searchTerm]);

  const paginatedDealers = useMemo(() => {
    const start = (page - 1) * DEALERS_PER_PAGE;
    return sortedDealers.slice(start, start + DEALERS_PER_PAGE);
  }, [sortedDealers, page]);


  const [paginatedData, setPaginatedData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const resetRegistryFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterModel('');
    setFilterYear(undefined);
    setFilterMonth(undefined);
    setUnitPage(0);
  };

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
        filterModel || undefined,
        filterYear,
        filterMonth
      );
      setPaginatedData(result.data);
      setTotalItems(result.total);
    } else {
      let where = `dealerId = ? `;
      let params: any[] = [selectedDealer.id];

      if (activeLogTab === 'ACTIVE') {
        where += ` AND (status = 'ACTIVE' OR status = 'REPLACEMENT') AND datetime(warrantyExpiry) >= datetime('now')`;
      } else if (activeLogTab === 'EXPIRED') {
        where += ` AND (status = 'EXPIRED' OR datetime(warrantyExpiry) < datetime('now'))`;
      } else if (activeLogTab === 'RETURNED') {
        where += ` AND (status = 'RETURNED_PENDING' OR status = 'RETURNED')`;
      }

      if (logSearchQuery) {
        where += ` AND id LIKE ? `;
        params.push(`%${logSearchQuery}%`);
      }

      if (filterDateStart) {
        where += ` AND date(manufactureDate) >= date(?)`;
        params.push(filterDateStart);
      }

      if (filterDateEnd) {
        where += ` AND date(manufactureDate) <= date(?)`;
        params.push(filterDateEnd);
      }

      if (filterYear) {
        // manufactureDate is the proxy for year in batteries table for dealers
        where += ` AND strftime('%Y', manufactureDate) = ?`;
        params.push(filterYear.toString());
      }

      if (filterMonth) {
        where += ` AND strftime('%m', manufactureDate) = ?`;
        params.push(filterMonth.toString().padStart(2, '0'));
      }

      if (filterModel) {
        where += ` AND model = ? `;
        params.push(filterModel);
      }

      const orderBy = activeLogTab === 'RETURNED' ? 'activationDate DESC' : 'rowid DESC';
      const result = await Database.getPaginated<any>('batteries', unitPage + 1, unitsLimit, where, params, orderBy);
      setPaginatedData(result.data);
      setTotalItems(result.total);
    }
  };

  useEffect(() => {
    if (active) {
      fetchTabData();
    }
  }, [selectedDealer, activeLogTab, unitPage, logSearchQuery, filterDateStart, filterDateEnd, filterModel, filterYear, filterMonth, active]);

  // --- ACTIONS ---

  const handleStartWizard = (existing?: Dealer) => {
    setSelectedDealer(existing || null);
    if (!existing) {
      let newId = '';
      let attempts = 0;
      do {
        newId = `DL-${Math.floor(100000 + Math.random() * 899999)}`;
        attempts++;
      } while (dealers.some(d => d.id === newId) && attempts < 100);
      setGeneratedId(newId);
    } else {
      setGeneratedId(existing.id);
    }
    setViewMode('WIZARD');
  };

  const handleWizardComplete = async (wizardData: any) => {
    const locationString = `${wizardData.city}, ${wizardData.state} - ${wizardData.pincode}`.toUpperCase();
    const dealerData = {
      id: generatedId,
      name: wizardData.name.toUpperCase(),
      ownerName: wizardData.owner.toUpperCase(),
      address: wizardData.address.toUpperCase(),
      contact: wizardData.contact,
      location: locationString
    };

    if (selectedDealer) {
      await Database.updateDealer(dealerData);
      await Database.logActivity('PARTNER_UPDATE', `Updated dealer details for ${dealerData.name}`, { dealerId: dealerData.id, changes: dealerData });
    } else {
      await Database.addDealer(dealerData);
      await Database.logActivity('PARTNER_ENROLL', `Enrolled new dealer ${dealerData.name}`, { dealerId: dealerData.id, initialData: dealerData });
    }

    await loadData();
    setViewMode('LIST');
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: selectedDealer ? 'Dealer details updated' : 'Dealer enrollment complete' } }));
  };

  const loadDealerDetail = (dealer: Dealer) => {
    if (AuthSession.isValid()) {
      executeLoadDealerDetail(dealer);
    } else {
      setPendingDealer(dealer);
      setIsLocked(true);
    }
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
      AuthSession.refreshSession();
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
      if (!window.confirm(`WARNING: This dealer has ${analytics.activeUnitCount} active warranty units.\n\nAre you sure you want to proceed ? `)) {
        return;
      }
    } else {
      if (!window.confirm(`Delete dealer ${selectedDealer?.name} permanently ? `)) {
        return;
      }
    }

    const dealerToDelete = selectedDealer;
    if (!dealerToDelete) return;

    scheduleUndoableAction({
      label: `Dealer ${dealerToDelete.name} queued for deletion`,
      description: 'Undo within 5 seconds to keep this dealer.',
      onCommit: async () => {
        await Database.deleteDealer(dealerId);
        await Database.logActivity('PARTNER_DELETE', `Deleted dealer ${dealerToDelete.name}`, { dealerId: dealerToDelete.id, name: dealerToDelete.name });
        await loadData();
      },
      onSuccess: () => window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Dealer removed successfully' } })),
      onError: () => window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Failed to remove dealer', type: 'error' } })),
    });
    setViewMode('LIST');
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];


  // SETTLEMENT MODAL STATE
  const [resolvingRecord, setResolvingRecord] = useState<SettlementTarget | null>(null);

  const handleOpenSettlement = (repo: any) => {
    setResolvingRecord({
      id: repo.id,
      oldBatteryId: repo.oldBatteryId,
      dealerName: selectedDealer?.name || 'Unknown Dealer'
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


  if (isLocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 bg-slate-50/50">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
            <Lock size={32} className="text-slate-900" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-2">Registry Locked</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">Authorization Required</p>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-left mb-6">
            <p className="text-blue-700 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
              Security Clearance Required. Please enter the access key for <span className="text-blue-900">{pendingDealer?.name || 'Authorized Dealer'}</span> to proceed.
            </p>
          </div>

          <form onSubmit={handleUnlockDealer} className="space-y-4">
            <div className="relative group">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="password"
                autoFocus
                placeholder="Access Key"
                className={`w-full pl-12 pr-4 py-3.5 bg-white border rounded-xl text-sm font-bold outline-none transition-all placeholder:text-slate-300
                  ${lockError
                    ? 'border-rose-300 bg-rose-50 text-rose-600 focus:border-rose-500 shadow-sm shadow-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'
                  }`}
                value={lockPassword}
                onChange={e => { setLockPassword(e.target.value); setLockError(''); }}
              />
            </div>

            <button
              type="submit"
              disabled={!lockPassword}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Authorize Access
            </button>

            <button
              type="button"
              onClick={() => { setIsLocked(false); setPendingDealer(null); setLockPassword(''); setLockError(''); }}
              className="mt-4 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              Cancel Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'DETAIL' && selectedDealer) {
    const handlePrint = () => {
      const originalTitle = document.title;
      document.title = `${selectedDealer.name}_${activeLogTab} _Report`;
      Database.logActivity('PRINT_REPORT', `Printed dealer report for ${selectedDealer.name}`, { dealerId: selectedDealer.id, tab: activeLogTab });
      window.print();
      document.title = originalTitle;
    };

    return (
      <>
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900 relative">
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
          <SettlementModal
            isOpen={!!resolvingRecord}
            target={resolvingRecord}
            onClose={() => setResolvingRecord(null)}
            onSuccess={() => {
              setResolvingRecord(null);
              fetchTabData();
            }}
          />

          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('LIST')}
                className="p-3 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 shadow-sm hover:shadow-md active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase leading-none mb-1">{selectedDealer.name}</h1>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shadow-sm">UID: {selectedDealer.id}</div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">• {selectedDealer.location}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end mr-4">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Growth Vector</span>
                <span className="text-lg font-black text-slate-900">+12.4%</span>
              </div>
              <button
                onClick={() => setViewMode('ANALYTICS')}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                <Activity size={16} />
                Analytics
              </button>
              <button onClick={() => handleStartWizard(selectedDealer)} className="p-3 bg-white border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm active:scale-95">
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-4 px-6 bg-white border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* LEFT: REGISTRY SELECTOR */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap ml-1">Registry Mode</span> */}
                <div ref={tabsMenuRef} className="relative group/tabs flex-1 md:flex-none">
                  {(() => {
                    const activeTab = [
                      { id: 'ACTIVE', label: 'Active Warranty', icon: Box, color: 'text-blue-600' },
                      { id: 'EXCHANGES', label: 'Exchange Log', icon: RefreshCw, color: 'text-purple-600' },
                      { id: 'RETURNED', label: 'Returned Units', icon: Landmark, color: 'text-emerald-600' },
                      { id: 'EXPIRED', label: 'Expired Units', icon: Clock, color: 'text-rose-600' }
                    ].find(t => t.id === activeLogTab) || { id: 'ACTIVE', label: 'Active Warranty', icon: Box, color: 'text-blue-600' };

                    return (
                      <div className="relative">
                        <button
                          onClick={() => setIsFilterOpen(prev => prev === 'TABS' ? '' as any : 'TABS' as any)}
                          className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-all group/btn min-w-[200px] w-full md:w-auto h-10"
                        >
                          <div className={`p-1 rounded-md bg-white shadow-sm border border-slate-100 ${activeTab.color}`}>
                            <activeTab.icon size={12} strokeWidth={2.5} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex-1 text-left">{activeTab.label}</span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isFilterOpen === 'TABS' ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterOpen === 'TABS' && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen('' as any)}></div>
                            <div className="absolute left-0 top-12 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in zoom-in-95 duration-200">
                              {[
                                { id: 'ACTIVE', label: 'Active Warranty', icon: Box, color: 'text-blue-600', bg: 'hover:bg-blue-50' },
                                { id: 'EXCHANGES', label: 'Exchange Log', icon: RefreshCw, color: 'text-purple-600', bg: 'hover:bg-purple-50' },
                                { id: 'RETURNED', label: 'Returned Units', icon: Landmark, color: 'text-emerald-600', bg: 'hover:bg-emerald-50' },
                                { id: 'EXPIRED', label: 'Expired Units', icon: Clock, color: 'text-rose-600', bg: 'hover:bg-rose-50' }
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  onClick={() => { setActiveLogTab(tab.id as any); setUnitPage(0); setIsFilterOpen('' as any); }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${tab.bg} group/item ${activeLogTab === tab.id ? 'bg-slate-50' : ''}`}
                                >
                                  <div className={`p-1.5 rounded-md transition-colors ${activeLogTab === tab.id ? 'bg-white shadow-sm border border-slate-100' : 'bg-transparent'} ${tab.color}`}>
                                    <tab.icon size={14} strokeWidth={activeLogTab === tab.id ? 2.5 : 2} />
                                  </div>
                                  <span className={`text-[11px] font-bold uppercase tracking-wider ${activeLogTab === tab.id ? 'text-slate-900' : 'text-slate-500 group-hover/item:text-slate-900'}`}>
                                    {tab.label}
                                  </span>
                                  {activeLogTab === tab.id && <Check size={14} className="ml-auto text-blue-600" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* RIGHT: SEARCH & TOOLS */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div ref={registrySearchRef} className="relative flex-1 md:flex-none">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="SEARCH REGISTRY..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold outline-none focus:border-blue-500 uppercase transition-all w-full md:w-64 h-10 focus:bg-white focus:shadow-sm"
                    value={logSearchQuery}
                    onChange={e => { setLogSearchQuery(e.target.value); setUnitPage(0); }}
                  />
                </div>

                <div className="h-6 w-px bg-slate-100 mx-1 hidden md:block"></div>

                {/* FILTER GHOST */}
                <div ref={filtersMenuRef} className="relative group/filter">
                  <button
                    onClick={() => setIsFilterOpen(prev => prev === 'FILTERS' ? '' as any : 'FILTERS' as any)}
                    className={`p-2.5 rounded-full transition-all active:scale-90 relative ${isFilterOpen === 'FILTERS' || (filterDateStart || filterDateEnd || filterModel) ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    title="Reference Filters"
                  >
                    <Filter size={20} strokeWidth={2} />
                    {(filterDateStart || filterDateEnd || filterModel) && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white shadow-sm" />
                    )}
                  </button>

                  {isFilterOpen === 'FILTERS' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen('' as any)}></div>
                      <div className="absolute right-0 top-12 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-5 z-50 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                            <ListFilter size={14} className="text-blue-600" /> Filter Registry
                          </h4>
                          <button
                            onClick={() => resetRegistryFilters()}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                          >
                            Reset Defaults
                          </button>
                        </div>

                        {/* Year & Month Selection */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Year</label>
                            <div className="relative">
                              <select
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                value={filterYear || ''}
                                onChange={e => { setFilterYear(e.target.value ? parseInt(e.target.value) : undefined); setUnitPage(0); }}
                              >
                                <option value="">ALL YEARS</option>
                                {analytics?.availableYears?.map((y: number) => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Month</label>
                            <div className="relative">
                              <select
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                value={filterMonth || ''}
                                onChange={e => { setFilterMonth(e.target.value ? parseInt(e.target.value) : undefined); setUnitPage(0); }}
                              >
                                <option value="">ALL MONTHS</option>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                  <option key={i} value={i + 1}>{m.toUpperCase()}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Lifecycle Window</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                              value={filterDateStart}
                              onChange={e => { setFilterDateStart(e.target.value); setUnitPage(0); }}
                            />
                            <input
                              type="date"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                              value={filterDateEnd}
                              onChange={e => { setFilterDateEnd(e.target.value); setUnitPage(0); }}
                            />
                          </div>
                        </div>

                        {/* Model Filter */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Product Model</label>
                          <div className="relative">
                            <select
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 appearance-none cursor-pointer"
                              value={filterModel}
                              onChange={e => { setFilterModel(e.target.value); setUnitPage(0); }}
                            >
                              <option value="">ALL MODELS</option>
                              {models.map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        <button
                          onClick={() => setIsFilterOpen('' as any)}
                          className="w-full py-3 bg-slate-900 text-white rounded-md text-[10px] font-black uppercase tracking-[0.15em] hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                        >
                          Synchronize Views
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* PRINT GHOST */}
                <button
                  onClick={handlePrint}
                  className="p-2.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-90"
                  title="Print Table"
                >
                  <Printer size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    {activeLogTab === 'EXCHANGES' ? (
                      <>
                        <th className="px-6 py-4 whitespace-nowrap pl-8">Old Battery</th>
                        <th className="px-6 py-4 whitespace-nowrap">Model</th>
                        <th className="px-6 py-4 whitespace-nowrap">Sent Date</th>
                        <th className="px-6 py-4 whitespace-nowrap">Sold Date</th>
                        <th className="px-6 py-4 whitespace-nowrap">Replaced On</th>
                        <th className="px-6 py-4 whitespace-nowrap">Replaced By</th>
                        <th className="px-6 py-4 whitespace-nowrap">Settlement</th>
                        <th className="px-6 py-4 whitespace-nowrap pr-8">Outcome / Evidence</th>
                      </>
                    ) : activeLogTab === 'RETURNED' ? (
                      <>
                        <th className="px-6 py-4 pl-8">Identifier</th>
                        <th className="px-6 py-4">Returning Date</th>
                        <th className="px-6 py-4">Status Info</th>
                        <th className="px-6 py-4 text-right pr-8">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 pl-8">Units In Warranty</th>
                        <th className="px-6 py-4">Model Summary</th>
                        <th className="px-6 py-4">Status Badge</th>
                        <th className="px-6 py-4 text-right pr-8">Lifespan Timeline</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((item: any) => (
                    (() => {
                      const isHighlighted =
                        activeLogTab === 'EXCHANGES'
                          ? item.oldBatteryId === highlightedBatteryId || item.newBatteryId === highlightedBatteryId
                          : item.id === highlightedBatteryId;

                      return (
                    <tr
                      key={item.id || item.rowid}
                      onClick={() => onNavigateToHub?.(activeLogTab === 'EXCHANGES' ? item.oldBatteryId : item.id)}
                      className={`group/row transition-all cursor-pointer ${isHighlighted ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'}`}
                    >
                      {activeLogTab === 'EXCHANGES' ? (
                        <>
                          <td className="px-6 py-4 font-bold text-slate-900 mono text-xs pl-8">{item.oldBatteryId}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">{item.batteryModel}</td>
                          <td className="px-6 py-4 font-medium text-slate-600 mono text-[10px]">{formatDate(item.sentDate)}</td>
                          <td className="px-6 py-4 font-medium text-slate-600 mono text-[10px]">{formatDate(item.soldDate)}</td>
                          <td className="px-6 py-4 font-medium text-slate-600 mono text-[10px]">{formatDate(item.replacementDate)}</td>
                          <td className="px-6 py-4 font-bold text-blue-600 mono text-xs">
                            <div className="flex items-center gap-2">
                              {item.newBatteryId}
                              <ArrowRight size={12} />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.replenishmentBatteryId ? (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-indigo-500 uppercase">Stock Replaced</span>
                                <span className="text-xs font-bold text-slate-900 mono">{item.replenishmentBatteryId}</span>
                              </div>
                            ) : item.settlementType === 'DIRECT' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-bold uppercase">Direct</span>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenSettlement(item); }}
                                className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wide border transition-all ${item.paidInAccount ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:shadow-sm active:scale-95'}`}
                              >
                                {item.paidInAccount ? 'Settled' : 'Pending Settlement'}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 pr-8">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-rose-600 uppercase">FAILED: {item.reason || 'N/A'}</span>
                              <span className="text-[9px] font-medium text-slate-400 uppercase">Evidence: {item.warrantyCardStatus || 'N/A'}</span>
                            </div>
                          </td>
                        </>
                      ) : activeLogTab === 'RETURNED' ? (
                        <>
                          <td className="px-6 py-4 pl-8">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 mono text-xs">{item.id}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.model}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{formatDate(item.activationDate)}</span>
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                {item.status === BatteryStatus.RETURNED_PENDING ? 'Returned Date' : 'Exchanged Date'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusDisplay
                              status={item.status}
                              isExpired={false}
                              dealerId={item.dealerId}
                              variant="badge"
                            />
                          </td>
                          <td className="px-6 py-4 text-right pr-8">
                            {item.status === BatteryStatus.RETURNED_PENDING ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); onNavigateToHub && onNavigateToHub(item.id); }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-bold uppercase tracking-wide hover:bg-blue-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 justify-end ml-auto"
                              >
                                Complete Exchange <ArrowRight size={12} />
                              </button>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-200 text-[10px] font-bold uppercase ml-auto">
                                  <CheckCircle2 size={12} /> Exchanged
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mr-1">{formatDate(item.activationDate)}</span>
                              </div>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 pl-8 font-bold text-slate-900 mono text-xs flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full group-hover/row:scale-150 transition-transform bg-blue-500"></div>
                            {item.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900">{item.model}</span>
                              <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wide">{item.capacity || 'Auto-Cap'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusDisplay
                              status={item.status}
                              isExpired={activeLogTab === 'EXPIRED'}
                              dealerId={item.dealerId}
                              variant="badge"
                            />
                          </td>
                          <td className="px-6 py-4 text-right pr-8 font-mono text-xs text-slate-500 font-bold">
                            <div>
                              <span className="text-slate-900">{formatDate(item.activationDate || item.manufactureDate)}</span>
                              {item.warrantyExpiry && (
                                <>
                                  <span className="text-slate-300 mx-2">→</span>
                                  <span className="text-rose-600">{formatDate(item.warrantyExpiry)}</span>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
              {paginatedData.length === 0 && <div className="py-24 flex flex-col items-center justify-center opacity-40"><Box size={48} className="mb-4 text-slate-300" /><p className="text-xs font-black uppercase tracking-widest text-slate-400">No records found</p></div>}
            </div>

            {/* Pagination */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Showing {unitPage * unitsLimit + 1}-{Math.min((unitPage + 1) * unitsLimit, totalItems)} of {totalItems} Records</span>
              <div className="flex gap-2">
                <button disabled={unitPage === 0} onClick={() => setUnitPage(p => p - 1)} className="p-2 bg-white border border-slate-200 rounded-md hover:border-blue-400 disabled:opacity-30 transition-all"><ChevronLeft size={16} /></button>
                <button disabled={(unitPage + 1) * unitsLimit >= totalItems} onClick={() => setUnitPage(p => p + 1)} className="p-2 bg-white border border-slate-200 rounded-md hover:border-blue-400 disabled:opacity-30 transition-all"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Print Mode (Detached Portal) */}
        {createPortal(
          <div id="print-portal-root">
            {selectedDealer && (
              <BatteryPrintTemplate
                dealerName={selectedDealer.name}
                dealerId={selectedDealer.id}
                reportTitle={activeLogTab === 'ACTIVE' ? 'Active Batteries' : activeLogTab === 'EXPIRED' ? 'Expired Batteries' : activeLogTab === 'RETURNED' ? 'Returned Batteries (Pending)' : 'Exchange History'}
                reportType="batch"
                dateRange={
                  filterDateStart && filterDateEnd
                    ? `${formatDate(filterDateStart)} - ${formatDate(filterDateEnd)}`
                    : filterDateStart
                      ? `${formatDate(filterDateStart)} +`
                      : filterDateEnd
                        ? `Up to ${formatDate(filterDateEnd)}`
                        : 'All Time'
                }
                filterModel={filterModel}
                data={paginatedData}
                tableType="BATCH"
                dateLabel="Print Date"
                date={new Date().toISOString()}
              />
            )}
          </div>,
          document.body
        )}
      </>
    );
  } else if (viewMode === 'ANALYTICS' && selectedDealer) {
    return (
      <DealerAnalytics
        dealer={selectedDealer}
        onBack={() => setViewMode('DETAIL')}
      />
    );
  } else if (viewMode === 'WIZARD') {
    return (
      <DealerWizard
        onCancel={() => setViewMode('LIST')}
        onComplete={handleWizardComplete}
        dealers={dealers}
        initialData={selectedDealer}
        generatedId={generatedId}
      />
    );
  } else {
    // --- LIST VIEW (Default) ---
    return (
      <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
            <input
              placeholder="Search Dealer Name, ID or Region..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md outline-none font-bold text-sm transition-all uppercase tracking-wide mono text-slate-900 focus:bg-white focus:border-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleStartWizard()}
            className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-md font-bold text-xs hover:bg-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span className="uppercase tracking-wide">Enroll Dealer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative">
          {paginatedDealers.map(dealer => (
            <div
              key={dealer.id}
              onClick={() => loadDealerDetail(dealer)}
              className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[240px]"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                    <Store size={24} />
                  </div>
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                    ID: {dealer.id}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-tight mb-1 group-hover:text-blue-600 transition-colors truncate">
                    {dealer.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dealer.ownerName || 'Unknown Principal'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin size={14} className="text-blue-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wide truncate max-w-[200px]">
                    {dealer.location}
                  </span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
          {paginatedDealers.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-40">
              <Store size={48} className="text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">No dealers found matching criteria</p>
            </div>
          )}
        </div>

        {sortedDealers.length > DEALERS_PER_PAGE && (
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Showing {(page - 1) * DEALERS_PER_PAGE + 1}-{Math.min(page * DEALERS_PER_PAGE, sortedDealers.length)} of {sortedDealers.length} Dealers</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 bg-white border border-slate-200 rounded-md hover:border-blue-400 disabled:opacity-30 transition-all text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page * DEALERS_PER_PAGE >= sortedDealers.length}
                onClick={() => setPage(p => p + 1)}
                className="p-2 bg-white border border-slate-200 rounded-md hover:border-blue-400 disabled:opacity-30 transition-all text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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
