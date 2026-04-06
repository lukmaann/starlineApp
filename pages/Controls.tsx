
import React, { useState, useEffect } from 'react';
import {
  Shield, Key, User as UserIcon, Save, Loader2, Lock, ArrowRight,
  ShieldCheck, ShieldAlert, AlertTriangle, Fingerprint, Layers,
  Box, FileSignature, Settings2, ClipboardCheck, ChevronLeft,
  ChevronRight, ChevronDown, CheckCircle2, Plus, Edit2, Trash2, Info, X, RefreshCw, Activity, Sliders,
  KeyRound, Tag, Search, Package, Users, UserCheck, Factory, Scale, Receipt, History, Eraser, Building2 as BuildingIcon
} from 'lucide-react';
import { Database } from '../db';
import { BatteryModel, Dealer } from '../types';
import { AuthSession } from '../utils/AuthSession';
import { toast } from 'sonner';
import { formatDate, getLocalDate } from '../utils';
import PriceManager from '../components/PriceManager';
import UserManagement from '../components/UserManagement';
import { scheduleUndoableAction } from '../utils/undoToast';

interface ControlsProps {
  active?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ active }) => {
  // Global Lock State
  const [isLocked, setIsLocked] = useState(!AuthSession.isValid());
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Listen for session changes
  useEffect(() => {
    const handleSessionChange = (e: any) => {
      setIsLocked(!e.detail.isAuthenticated);
    };
    window.addEventListener('session-changed' as any, handleSessionChange);
    return () => window.removeEventListener('session-changed' as any, handleSessionChange);
  }, []);
  // Navigation State
  // "Model Registry" is now the default tab as requested
  const [currentTab, setCurrentTab] = useState<'models' | 'data' | 'access' | 'history' | 'prices'>('models');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState('45');
  const [isSavingSessionTimeout, setIsSavingSessionTimeout] = useState(false);
  const [showUserManagementPage, setShowUserManagementPage] = useState(false);
  const [showDangerZonePage, setShowDangerZonePage] = useState(false);

  // --- Universal Search & Destroy State ---
  const [universalSearchId, setUniversalSearchId] = useState('');
  const [foundUniversalRecord, setFoundUniversalRecord] = useState<{ type: string, data: any } | null>(null);
  const [isSearchingUniversal, setIsSearchingUniversal] = useState(false);
  const [isDeletingUniversal, setIsDeletingUniversal] = useState(false);
  const [isDangerZoneAuthenticated, setIsDangerZoneAuthenticated] = useState(false);
  const [showBulkDeletePage, setShowBulkDeletePage] = useState(false);
  const [dangerZonePassword, setDangerZonePassword] = useState('');
  const [dangerZoneAuthError, setDangerZoneAuthError] = useState('');

  // Access Control State (Legacy - kept for backward compatibility if needed by other components, but mostly replaced by UserManagement)
  const [formData, setFormData] = useState({
    username: 'ADMIN',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });


  // Data Management State (Backup/Restore)
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // Model Management State
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]); // Added for Deletion Logic
  const [activeForm, setActiveForm] = useState<null | 'model'>(null);
  const [modelWizardStep, setModelWizardStep] = useState(0);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<BatteryModel | null>(null);
  const [deletingDealer, setDeletingDealer] = useState<Dealer | null>(null); // Added for Dealer Deletion
  const [modelDeleteConfirmName, setModelDeleteConfirmName] = useState('');

  // Backup State
  const [hasBackedUp, setHasBackedUp] = useState(false);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', capacity: '', warranty: 18 });
  // Search state for models
  const [modelSearch, setModelSearch] = useState('');

  // --- Replacement Deletion State ---
  const [replacementSearchId, setReplacementSearchId] = useState('');
  const [foundReplacement, setFoundReplacement] = useState<any>(null);
  const [isSearchingReplacement, setIsSearchingReplacement] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [deletingWorker, setDeletingWorker] = useState<any | null>(null);

  // --- Activity Log State ---
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logLoading, setLogLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // --- Model Management Logic ---
  const loadModelData = async () => {
    const mods = await Database.getAll<BatteryModel>('models');
    setModels(mods);
    const dls = await Database.getAll<Dealer>('dealers');
    setDealers(dls);
    const wrkrs = await Database.getAll<any>('factory_workers');
    setWorkers(wrkrs);
  };

  const loadActivityLogs = async () => {
    setLogLoading(true);
    try {
      const { data, total } = await Database.getActivityLogs(logPage, 20);
      setActivityLogs(data);
      setTotalLogs(total);
    } catch (e) {
      console.error(e);
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    if (active && currentTab === 'history') {
      loadActivityLogs();
    }
  }, [currentTab, logPage, active]);

  useEffect(() => {
    // Reload data when becoming active or switching to relevant tabs
    if (active && (currentTab === 'models' || currentTab === 'data' || currentTab === 'prices')) {
      loadModelData();
    }
  }, [active, currentTab]);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('app-notify', { detail: { message, type } }));
  };

  // Initial Data Load
  useEffect(() => {
    loadModelData();
    const loadConfig = async () => {
      const user = await Database.getConfig('starline_admin_user');
      if (user) setFormData(prev => ({ ...prev, username: user }));
      const timeoutMinutes = await Database.getConfig('starline_session_timeout_minutes');
      const normalizedTimeout = timeoutMinutes || '45';
      setSessionTimeoutMinutes(normalizedTimeout);
      AuthSession.setSessionTimeoutMinutes(parseInt(normalizedTimeout, 10));
    };
    loadConfig();
  }, [active]);

  const handleSaveSessionTimeout = async () => {
    setIsSavingSessionTimeout(true);
    try {
      const normalized = parseInt(sessionTimeoutMinutes, 10) || 45;
      await Database.setConfig('starline_session_timeout_minutes', normalized.toString());
      AuthSession.setSessionTimeoutMinutes(normalized);
      await Database.logActivity('SESSION_TIMEOUT_UPDATE', `Updated app auto-logout timer to ${normalized} minutes`, { minutes: normalized });
      notify('Session timeout updated');
    } catch (e: any) {
      notify(e?.message || 'Failed to update session timeout', 'error');
    } finally {
      setIsSavingSessionTimeout(false);
    }
  };

  const handleOpenModelWizard = (m?: BatteryModel) => {
    if (m) {
      setEditingModelId(m.id);
      setModelForm({
        name: m.name,
        capacity: m.defaultCapacity.replace(/AH$/i, ''),
        warranty: m.defaultWarrantyMonths
      });
    } else {
      setEditingModelId(null);
      setModelForm({ name: '', capacity: '', warranty: 18 });
    }
    setModelWizardStep(0);
    setActiveForm('model');
    setDeletingModel(null);
  };

  const handleCommitModel = async () => {
    setIsActionLoading(true);
    try {
      const id = editingModelId || modelForm.name.toUpperCase().replace(/\s+/g, '-');
      const modelData = {
        id: id,
        name: modelForm.name.toUpperCase(),
        defaultCapacity: modelForm.capacity.replace(/AH$/i, '') + 'AH',
        defaultWarrantyMonths: modelForm.warranty
      };

      if (editingModelId) {
        await Database.updateModel(modelData);
        await Database.logActivity('MODEL_UPDATE', `Updated model definition for ${modelData.name}`, { modelId: modelData.id, changes: modelData });
      } else {
        await Database.addModel(modelData);
        await Database.logActivity('MODEL_CREATE', `Registered new model ${modelData.name}`, { modelId: modelData.id, initialData: modelData });
      }

      setIsActionLoading(false);
      setActiveForm(null);
      loadModelData();
      notify(editingModelId ? 'Model updated successfully' : 'New model schema created');
    } catch (e: any) {
      setIsActionLoading(false);
      notify(`Failed to save model: ${e?.message || 'Unknown error'}`, 'error');
      console.error('Model Save Error:', e);
    }
  };

  const handleExecuteModelDeletion = async () => {
    if (!deletingModel) return;
    setIsActionLoading(true);
    try {
      const modelToDelete = deletingModel;
      scheduleUndoableAction({
        label: `Model ${modelToDelete.name} queued for deletion`,
        description: 'Undo within 5 seconds to keep this model.',
        onCommit: async () => {
          await Database.deleteModel(modelToDelete.id);
          await Database.logActivity('MODEL_DELETE', `Deleted model ${modelToDelete.name}`, { modelId: modelToDelete.id, name: modelToDelete.name });
          await loadModelData();
        },
        onSuccess: () => notify('Model deleted from registry', 'success'),
        onError: (error) => notify(error?.message || 'Failed to delete model', 'error'),
      });
      setDeletingModel(null);
      setModelDeleteConfirmName('');
    } catch (e: any) {
      notify(e.message || 'Failed to delete model', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter models based on search
  const filteredModels = models.filter(m =>
    m.name.includes(modelSearch.toUpperCase()) ||
    m.id.includes(modelSearch.toUpperCase())
  );

  const handleLocalUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnlocking(true);
    setLockError('');

    try {
      const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';
      if (lockPassword === adminPass) {
        const currentUser = AuthSession.getCurrentUser();
        if (currentUser) {
          AuthSession.saveSession(currentUser);
        } else {
          // Fallback for when we don't have a user context yet (e.g. legacy system)
          const adminUser = await Database.authenticateUser('admin', adminPass);
          if (adminUser) AuthSession.saveSession(adminUser);
        }
        setIsLocked(false);
        setLockPassword('');
        toast.success('Controls Registry Unlocked');
      } else {
        setLockError('Incorrect Access Key');
        setLockPassword('');
        toast.error('Incorrect Access Key');
      }
    } catch (err) {
      toast.error('Verification Failed');
    } finally {
      setIsUnlocking(false);
    }
  };

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
              Security Clearance Required. Please enter the administrator access key to proceed with system configuration.
            </p>
          </div>

          <form onSubmit={handleLocalUnlock} className="space-y-4">
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
              disabled={isUnlocking || !lockPassword}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUnlocking ? <Loader2 size={16} className="animate-spin text-white/50" /> : 'Authorize Access'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showUserManagementPage) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 text-slate-900">
        <div className="flex flex-col gap-4 px-4 pt-4">
          <div className="space-y-3">
            <button
              onClick={() => setShowUserManagementPage(false)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 w-fit"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">User Management</h1>
              <p className="mt-1 text-sm text-slate-500">View assigned users and assign new users from one dedicated page.</p>
            </div>
          </div>
        </div>

        <div className="px-4">
          <UserManagement />
        </div>
      </div>
    );
  }

  if (showDangerZonePage) {
    const handleUniversalSearch = async () => {
        if (!universalSearchId.trim()) return;
        setIsSearchingUniversal(true);
        setFoundUniversalRecord(null);
        try {
            const result = await Database.searchUniversalRecordById(universalSearchId);
            setFoundUniversalRecord(result);
            if (!result) toast.error('No record found for this ID across any database');
        } catch (e) {
            toast.error('Search failed');
        } finally {
            setIsSearchingUniversal(false);
        }
    };

    const handleUniversalDelete = async () => {
        if (!foundUniversalRecord) return;
        const { type } = foundUniversalRecord;
        const confirmText = `Are you sure you want to PERMANENTLY DELETE this ${type} record?\n\nThis action is irreversible and will be logged.`;
        
        if (window.confirm(confirmText)) {
            setIsDeletingUniversal(true);
            try {
                await Database.deleteUniversalRecord(universalSearchId, type);
                toast.success(`${type} record deleted successfully`);
                setFoundUniversalRecord(null);
                setUniversalSearchId('');
                loadModelData(); // Refresh underlying lists
            } catch (e: any) {
                toast.error(`Deletion failed: ${e.message}`);
            } finally {
                setIsDeletingUniversal(false);
            }
        }
    };

    const handleDangerZoneUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const adminPass = await Database.getConfig('starline_admin_pass') || 'starline@2025';
            if (dangerZonePassword === adminPass) {
                setIsDangerZoneAuthenticated(true);
                setDangerZonePassword('');
                setDangerZoneAuthError('');
                toast.success('Danger zone unlocked');
            } else {
                setDangerZoneAuthError('Invalid access key');
                setDangerZonePassword('');
            }
        } catch (err) {
            toast.error('Auth failure');
        }
    };

    if (showDangerZonePage) {
        if (!isDangerZoneAuthenticated) {
            return (
                <div className="h-full flex flex-col items-center justify-center p-6 bg-rose-50/30">
                    <div className="w-full max-w-sm text-center">
                        <div className="w-16 h-16 bg-white border border-rose-200 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Lock size={24} className="text-rose-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Danger zone access</h2>
                        <p className="text-slate-500 text-xs mb-8">Enter access key to continue</p>

                        <form onSubmit={handleDangerZoneUnlock} className="space-y-4">
                            <input
                                type="password"
                                autoFocus
                                placeholder="Access key"
                                className="w-full px-4 py-3.5 bg-white border border-rose-200 rounded-lg text-sm outline-none focus:border-rose-500"
                                value={dangerZonePassword}
                                onChange={e => { setDangerZonePassword(e.target.value); setDangerZoneAuthError(''); }}
                            />
                            {dangerZoneAuthError && <p className="text-rose-600 text-[10px] font-bold">{dangerZoneAuthError}</p>}
                            <button
                                type="submit"
                                disabled={!dangerZonePassword}
                                className="w-full py-3.5 bg-rose-600 text-white rounded-lg font-bold text-xs disabled:opacity-50"
                            >
                                Authorize access
                            </button>
                        </form>
                        <button 
                            onClick={() => setShowDangerZonePage(false)} 
                            className="mt-6 text-xs text-rose-400 hover:text-rose-700 font-medium"
                        >
                            Cancel and return to controls
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-full bg-rose-50/20 pb-20 text-slate-900">
                <div className="max-w-[1200px] mx-auto space-y-6 pt-6">
                    <div className="px-4 py-4 flex items-center justify-between border-b border-rose-100">
                        <button
                            onClick={() => {
                                if (showBulkDeletePage) setShowBulkDeletePage(false);
                                else setShowDangerZonePage(false);
                            }}
                            className="flex items-center gap-2 text-xs font-bold text-rose-700"
                        >
                            <ChevronLeft size={14} />
                            Back
                        </button>
                        <div className="flex items-center gap-2 text-rose-600">
                            <ShieldAlert size={16} />
                            <h1 className="text-sm font-bold lowercase first-letter:uppercase">Danger zone</h1>
                        </div>
                        <div className="w-10" />
                    </div>

                    {showBulkDeletePage ? (
                        <div className="px-4 space-y-6">
                            <div className="flex items-center gap-3">
                                <History className="text-rose-400" size={16} />
                                <h2 className="text-sm font-bold text-rose-900">Bulk deletion tools</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <h4 className="text-lg font-bold text-slate-900">Factory reset app</h4>
                                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[9px] font-bold">Full wipe</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-6">Wipes all data: users, dealers, inventory, and history.</p>
                                    </div>
                                    {!hasBackedUp ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const result = await window.electronAPI?.db?.backup();
                                                    if (result?.success) {
                                                        setHasBackedUp(true);
                                                        toast.success('Backup saved');
                                                    } else throw new Error(result?.error || 'Backup failed');
                                                } catch (e: any) {
                                                    toast.error(e.message);
                                                }
                                            }}
                                            className="w-full py-3 bg-amber-50 text-amber-700 rounded-lg font-bold text-xs border border-amber-200"
                                        >
                                            Backup required
                                        </button>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('Wipe entire database?')) {
                                                    if (window.confirm('Final warning: all work will be lost.')) {
                                                        await Database.resetDatabase();
                                                        window.location.reload();
                                                    }
                                                }
                                            }}
                                            className="w-full py-3 bg-rose-600 text-white rounded-lg font-bold text-xs"
                                        >
                                            Execute wipe
                                        </button>
                                    )}
                                </div>

                                <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <h4 className="text-lg font-bold text-slate-900">Erase production</h4>
                                            <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-100 rounded text-[9px] font-bold">Logs only</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-6">Clears manufacturing logs. Battery records are kept.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Clear all production?')) {
                                                await Database.clearAllProductionLogs();
                                                toast.success('Logs cleared');
                                            }
                                        }}
                                        className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-xs"
                                    >
                                        Reset logs
                                    </button>
                                </div>

                                <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <h4 className="text-lg font-bold text-slate-900">Erase expenses</h4>
                                            <span className="px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-100 rounded text-[9px] font-bold">Ledger</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-6">Wipes operational expense history for all months.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Wipe all expenses?')) {
                                                await Database.clearAllExpenses();
                                                toast.success('Expenses cleared');
                                            }
                                        }}
                                        className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-xs"
                                    >
                                        Reset ledger
                                    </button>
                                </div>

                                <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between mb-4">
                                            <h4 className="text-lg font-bold text-slate-900">Purge purchases</h4>
                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[9px] font-bold">Stock reset</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-6">Clears purchases and sets material stock to zero.</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Clear purchases and reset stock?')) {
                                                await Database.clearAllPurchases();
                                                toast.success('Stock reset');
                                            }
                                        }}
                                        className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-xs"
                                    >
                                        Reset stock
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 space-y-6">
                            <div className="bg-white border border-rose-200 rounded-xl p-6">
                                <h2 className="text-sm font-bold text-rose-900 mb-4 flex items-center gap-2">
                                    <Search size={16} className="text-rose-400" />
                                    Search and delete record
                                </h2>
                                <div className="flex gap-3">
                                    <input
                                        placeholder="Enter record ID..."
                                        className="flex-1 px-4 py-3 bg-rose-50/50 border border-rose-200 rounded-lg text-sm outline-none focus:border-rose-500"
                                        value={universalSearchId}
                                        onChange={e => setUniversalSearchId(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleUniversalSearch()}
                                    />
                                    <button
                                        onClick={handleUniversalSearch}
                                        disabled={isSearchingUniversal || !universalSearchId}
                                        className="px-6 py-3 bg-rose-600 text-white rounded-lg font-bold text-xs disabled:opacity-50"
                                    >
                                        {isSearchingUniversal ? 'Searching...' : 'Find'}
                                    </button>
                                </div>

                                {foundUniversalRecord && (
                                    <div className="mt-8 border-t border-rose-100 pt-8">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-center text-rose-900">
                                                    {foundUniversalRecord.type === 'BATTERY' && <Package size={24} />}
                                                    {foundUniversalRecord.type === 'DEALER' && <BuildingIcon size={24} />}
                                                    {foundUniversalRecord.type === 'WORKER' && <Users size={24} />}
                                                    {foundUniversalRecord.type === 'USER' && <UserCheck size={24} />}
                                                    {foundUniversalRecord.type === 'PRODUCTION' && <Factory size={24} />}
                                                    {foundUniversalRecord.type === 'PURCHASE' && <Receipt size={24} />}
                                                    {foundUniversalRecord.type === 'EXPENSE' && <Scale size={24} />}
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-rose-500 uppercase">{foundUniversalRecord.type} matched</span>
                                                    <h3 className="text-lg font-bold text-rose-900">
                                                        {foundUniversalRecord.type === 'BATTERY' && foundUniversalRecord.data.model}
                                                        {foundUniversalRecord.type === 'DEALER' && foundUniversalRecord.data.name}
                                                        {foundUniversalRecord.type === 'WORKER' && foundUniversalRecord.data.full_name}
                                                        {foundUniversalRecord.type === 'USER' && foundUniversalRecord.data.username}
                                                        {foundUniversalRecord.type === 'PRODUCTION' && `${foundUniversalRecord.data.model} run`}
                                                        {foundUniversalRecord.type === 'PURCHASE' && foundUniversalRecord.data.materialName}
                                                        {foundUniversalRecord.type === 'EXPENSE' && foundUniversalRecord.data.category}
                                                    </h3>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleUniversalDelete}
                                                disabled={isDeletingUniversal}
                                                className="px-8 py-3 bg-rose-600 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-200"
                                            >
                                                Delete record
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            {/* Simplified metadata grid */}
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-rose-400">Reference ID</p>
                                                <p className="text-xs font-bold text-rose-900">{universalSearchId}</p>
                                            </div>
                                            {foundUniversalRecord.type === 'BATTERY' && (
                                                <>
                                                    <div className="space-y-1"><p className="text-[10px] font-bold text-rose-400">Status</p><p className="text-xs font-bold text-rose-900">{foundUniversalRecord.data.status}</p></div>
                                                    <div className="space-y-1"><p className="text-[10px] font-bold text-rose-400">Date</p><p className="text-xs font-bold text-rose-900">{formatDate(foundUniversalRecord.data.manufactureDate)}</p></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-rose-100/50 border border-rose-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-rose-900">Bulk deletion tools</h3>
                                    <p className="text-xs text-rose-700">Database resets and ledger purges</p>
                                </div>
                                <button
                                    onClick={() => setShowBulkDeletePage(true)}
                                    className="px-6 py-3 bg-rose-600 text-white rounded-lg font-bold text-xs"
                                >
                                    Open bulk deletion
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }


  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 text-slate-900">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 pt-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Controls</h1>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setCurrentTab('models')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'models' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Model Registry
          </button>
          <button
            onClick={() => setCurrentTab('access')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'access' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Access Control
          </button>
          <button
            onClick={() => setCurrentTab('prices')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${currentTab === 'prices' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}
          >
            <Tag size={16} />
            Prices
          </button>
          <button
            onClick={() => setCurrentTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${currentTab === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
          >
            <Activity size={16} />
            History
          </button>
        </div>
      </div>

      {/* --- MODEL REGISTRY TAB --- */}
      {currentTab === 'models' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Battery Models</h3>
                <p className="text-xs font-medium text-slate-500">{models.length} active schemas defined</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                placeholder="Search models..."
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all w-full sm:w-64"
                value={modelSearch}
                onChange={e => setModelSearch(e.target.value)}
              />
              <button
                onClick={() => handleOpenModelWizard()}
                className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95 whitespace-nowrap"
              >
                <Plus size={16} /><span>Add Model</span>
              </button>
            </div>
          </div>

          {/* Model Wizard Modal */}
          {activeForm === 'model' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="flex h-[550px] w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Wizard Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-100 p-8 flex flex-col justify-between hidden md:flex">
                  <div className="space-y-8">
                    <div className="flex items-center space-x-3 text-slate-900">
                      <div className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm"><Layers size={20} /></div>
                      <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Editor</p><p className="text-sm font-bold truncate w-32">{editingModelId || 'New Model'}</p></div>
                    </div>
                    <div className="space-y-2">
                      {[{ step: 0, label: 'Identity', icon: FileSignature }, { step: 1, label: 'Specifications', icon: Sliders }, { step: 2, label: 'Review', icon: ClipboardCheck }].map((s, idx) => (
                        <div key={idx} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${modelWizardStep === s.step ? 'bg-white shadow-sm border border-slate-200 text-blue-600' : 'text-slate-400'}`}>
                          <s.icon size={16} />
                          <span className="text-xs font-bold">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Schema Editor v2.0</div>
                </div>

                {/* Wizard Content */}
                <div className="flex-1 flex flex-col bg-white">
                  <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">
                      {modelWizardStep === 0 && 'Model Identity'}
                      {modelWizardStep === 1 && 'Technical Specifications'}
                      {modelWizardStep === 2 && 'Review & Confirm'}
                    </h3>
                    <button onClick={() => setActiveForm(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><X size={20} /></button>
                  </div>

                  <div className="flex-1 p-8 overflow-y-auto">
                    {modelWizardStep === 0 && (
                      <div className="space-y-6 max-w-lg mx-auto py-8">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Model Name</label>
                          <input autoFocus placeholder="e.g. SL60" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase placeholder:text-slate-300" value={modelForm.name} onChange={e => setModelForm({ ...modelForm, name: e.target.value })} />
                          <p className="text-xs text-slate-400 font-medium pl-1">Uses standard naming convention (all caps).</p>
                        </div>
                      </div>
                    )}
                    {modelWizardStep === 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto py-8">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Capacity (AH)</label>
                          <div className="relative">
                            <input type="number" placeholder="150" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={modelForm.capacity} onChange={e => setModelForm({ ...modelForm, capacity: e.target.value })} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">AH</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Warranty Period</label>
                          <div className="relative">
                            <input type="number" placeholder="18" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={modelForm.warranty} onChange={e => setModelForm({ ...modelForm, warranty: parseInt(e.target.value) || 0 })} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Months</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {modelWizardStep === 2 && (
                      <div className="max-w-md mx-auto py-6 space-y-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100"><Box size={24} className="text-blue-600" /></div>
                            <div><p className="text-xs font-bold text-slate-400 uppercase">New Model</p><h4 className="text-lg font-black text-slate-900 uppercase">{modelForm.name || 'Untitled'}</h4></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-white rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Capacity</p><p className="text-base font-bold text-slate-800">{modelForm.capacity.replace(/AH$/i, '')} AH</p></div>
                            <div className="p-3 bg-white rounded-xl border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Warranty</p><p className="text-base font-bold text-slate-800">{modelForm.warranty} Months</p></div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium leading-relaxed">
                          <Info size={16} className="shrink-0 mt-0.5" />
                          <p>Please confirm these details are correct. This will update the master registry and affect all future stock entries.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    {modelWizardStep > 0 ? (
                      <button onClick={() => setModelWizardStep(s => s - 1)} className="px-6 py-3 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-800 transition-all flex items-center gap-2">
                        <ChevronLeft size={16} /> Back
                      </button>
                    ) : <div />}

                    {modelWizardStep < 2 ? (
                      <button
                        disabled={!modelForm.name || (modelWizardStep === 1 && !modelForm.capacity)}
                        onClick={() => setModelWizardStep(s => s + 1)}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 flex items-center gap-2"
                      >
                        Continue <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={handleCommitModel}
                        disabled={isActionLoading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                      >
                        {isActionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        Save Model
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deletion Modal */}
          {deletingModel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 leading-relaxed">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6"><ShieldAlert size={32} /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Model?</h3>
                <p className="text-slate-500 text-sm mb-6">This will permanently remove <span className="font-bold text-slate-900">{deletingModel.name}</span> from the registry. This action cannot be undone.</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Type model name to confirm</label>
                    <input className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold text-sm uppercase outline-none focus:border-rose-500 transition-all" placeholder={deletingModel.name} value={modelDeleteConfirmName} onChange={e => setModelDeleteConfirmName(e.target.value)} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setDeletingModel(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                    <button
                      onClick={handleExecuteModelDeletion}
                      disabled={modelDeleteConfirmName.trim().toUpperCase() !== deletingModel.name.toUpperCase() || isActionLoading}
                      className="flex-1 py-3 bg-rose-600 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isActionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Models Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModels.map(m => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all group cursor-default relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors"><Box size={20} /></div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenModelWizard(m); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingModel(m); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-1 truncate">{m.name}</h4>
                <p className="text-xs font-bold text-slate-400 mono mb-4">{m.id}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Capacity</span>
                    <span className="text-xs font-bold text-slate-700">{m.defaultCapacity}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-100" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Warranty</span>
                    <span className="text-xs font-bold text-slate-700">{m.defaultWarrantyMonths} Mo</span>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => handleOpenModelWizard()} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all group min-h-[200px]">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm"><Plus size={24} /></div>
              <span className="font-bold text-sm">Add New Model</span>
            </button>
          </div>
        </div>
      )}

      {/* --- HISTORY TAB --- */}
      {currentTab === 'history' && (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">System Activity Log</h3>
                  <p className="text-xs font-medium text-slate-500">Track all significant system events and user actions.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadActivityLogs}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Refresh Logs"
                >
                  <RefreshCw size={18} className={logLoading ? 'animate-spin' : ''} />
                </button>
                <div className="w-px h-6 bg-slate-200" />
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to CLEAR ALL history? This cannot be undone.')) {
                      await Database.clearActivityLogs();
                      loadActivityLogs();
                      notify('Activity Log Cleared', 'success');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 rounded-lg text-xs font-bold text-slate-500 transition-all shadow-sm"
                >
                  <Trash2 size={14} /> Clear All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 w-48">Timestamp</th>
                    <th className="px-6 py-4 w-48">Event Type</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                        No activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const metadata = log.metadata ? JSON.parse(log.metadata) : null;

                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className={`cursor-pointer transition-all border-b border-slate-50 group ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                          >
                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp.replace(' ', 'T') + 'Z').toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold border whitespace-nowrap ${log.type.includes('FAIL') || log.type.includes('DELETE') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                (log.type.includes('ADD') || log.type.includes('CREATE') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-blue-50 text-blue-700 border-blue-200')
                                }`}>
                                {log.type}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-700 line-clamp-1">{log.description}</p>
                                {metadata && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${isExpanded ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-400'}`}>
                                    {isExpanded ? 'Hide Details' : 'View Details'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Delete this log entry?')) {
                                    await Database.deleteActivityLog(log.id);
                                    loadActivityLogs();
                                  }
                                }}
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>

                          {/* EXPANDED DETAIL VIEW */}
                          {isExpanded && metadata && (
                            <tr className="bg-slate-50/50 animate-in slide-in-from-top-2">
                              <td colSpan={4} className="px-6 py-6 border-b border-slate-100">
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">

                                  {/* BATCH ASSIGN VIEW */}
                                  {log.type === 'BATCH_ASSIGN' && metadata.batteryIds && (
                                    <div className="space-y-4">
                                      <h4 className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
                                        <Layers size={16} className="text-indigo-600" />
                                        Batch Assigned {metadata.count} Batteries
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {metadata.batteryIds.map((id: string) => (
                                          <span key={id} className="px-3 py-1.5 bg-white text-slate-700 font-mono text-xs font-bold rounded-lg border border-slate-200 shadow-sm">
                                            {id}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* BATTERY EDIT VIEW */}
                                  {log.type === 'BATTERY_EDIT' && metadata.changes && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Edit2 size={24} /></div>
                                        <div>
                                          <h4 className="font-bold text-slate-900 text-sm uppercase">Record Modification</h4>
                                          <p className="text-xs text-slate-500 font-medium">Changes made to {metadata.batteryId}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 gap-2">
                                        {metadata.changes.map((change: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <span className="text-xs font-bold text-slate-500 uppercase w-32">{change.field}</span>
                                            <div className="flex items-center gap-3 flex-1 font-mono text-sm">
                                              <span className="text-rose-500 line-through decoration-rose-500/30">{change.old || '(empty)'}</span>
                                              <ArrowRight size={14} className="text-slate-300" />
                                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{change.new}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* EXCHANGE COMPLETED VIEW */}
                                  {log.type.includes('EXCHANGE') && metadata.oldBatteryId && (
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><RefreshCw size={24} /></div>
                                        <div>
                                          <h4 className="font-bold text-slate-900 text-sm uppercase">Warranty Exchange Record</h4>
                                          <p className="text-xs text-slate-500 font-medium">Swap execution details</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-8">
                                        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                                          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Old Battery</p>
                                          <p className="font-mono font-black text-rose-700 text-lg">{metadata.oldBatteryId}</p>
                                        </div>
                                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">New Battery</p>
                                          <p className="font-mono font-black text-emerald-700 text-lg">{metadata.newBatteryId}</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="flex justify-between p-2 border-b border-slate-100">
                                          <span className="text-slate-400 font-bold uppercase">Settlement</span>
                                          <span className="font-bold text-slate-700">{metadata.type}</span>
                                        </div>
                                        <div className="flex justify-between p-2 border-b border-slate-100">
                                          <span className="text-slate-400 font-bold uppercase">Dealer </span>
                                          <span className="font-bold text-slate-700">{metadata.dealerName}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* GENERIC JSON FALLBACK */}
                                  {!['BATCH_ASSIGN', 'BATTERY_EDIT'].includes(log.type) && !log.type.includes('EXCHANGE') && (
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Raw Event Metadata</p>
                                      <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto shadow-inner">
                                        {JSON.stringify(metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400">
                Showing {activityLogs.length} of {totalLogs} events
              </span>
              <div className="flex gap-2">
                <button
                  disabled={logPage === 1}
                  onClick={() => setLogPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 shadow-sm"
                >
                  Previous
                </button>
                <button
                  disabled={activityLogs.length < 20} // Simple check; ideally totalLogs / limit
                  onClick={() => setLogPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ACCESS CONTROL TAB --- */}
      {currentTab === 'access' && (
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-3">
            <div className="px-1">
              <h2 className="text-sm font-semibold text-slate-900">Access management</h2>
              <p className="mt-1 text-sm text-slate-500">Manage session rules, user accounts, and role-based access in a cleaner layout.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-2">
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <Lock size={17} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Session settings</h3>
                      <p className="mt-1 text-sm text-slate-500">Choose when the app logs out automatically.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="relative">
                      <select
                        className="min-w-[220px] appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white"
                        value={sessionTimeoutMinutes}
                        onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
                      >
                        {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} minutes
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    <button
                      onClick={handleSaveSessionTimeout}
                      disabled={isSavingSessionTimeout}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition-all hover:bg-black active:scale-95 disabled:opacity-50"
                    >
                      {isSavingSessionTimeout ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">User management</h3>
                  <p className="mt-1 text-sm text-slate-500">View assigned users, update access, and add new user accounts.</p>
                </div>
              </div>

              <button
                onClick={() => setShowUserManagementPage(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-black active:scale-95"
              >
                Open user management
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Danger zone</h3>
                  <p className="mt-1 text-sm text-slate-500">Battery deletion, dealer removal, worker removal, and factory reset tools.</p>
                </div>
              </div>

              <button
                onClick={() => setShowDangerZonePage(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-rose-700 active:scale-95"
              >
                Open danger zone
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRICE REGISTRY TAB --- */}
      {currentTab === 'prices' && (
        <PriceManager models={models} />
      )}

      <div className="mt-12 mb-6 text-center">
        <p className="text-[10px] font-medium text-slate-400">
          Developed by <span className="font-bold text-slate-600">Lukmaann</span>
        </p>
      </div>
    </div>
  );
};

export default Controls;
