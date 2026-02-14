
import React, { useState, useEffect } from 'react';
import {
  Shield, Key, User as UserIcon, Save, Loader2, Lock, ArrowRight,
  ShieldCheck, ShieldAlert, AlertTriangle, Fingerprint, Layers,
  Box, FileSignature, Settings2, ClipboardCheck, ChevronLeft,
  ChevronRight, CheckCircle2, Plus, Edit2, Trash2, Info, X, RefreshCw, Activity, Sliders,
  KeyRound
} from 'lucide-react';
import { Database } from '../db';
import { BatteryModel, Dealer } from '../types';
import { AuthSession } from '../utils/AuthSession';
import { toast } from 'sonner';

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
  const [currentTab, setCurrentTab] = useState<'models' | 'data' | 'access' | 'history'>('models');
  const [isLoading, setIsLoading] = useState(false);

  // Access Control State
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
    if (active && (currentTab === 'models' || currentTab === 'data')) {
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
    };
    loadConfig();
  }, []);

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Verify Current Password
    // Check skipped as user is already authenticated for this session
    // const storedPass = localStorage.getItem('starline_admin_pass') || 'starline@2025';
    // if (formData.currentPassword !== storedPass) { ... }

    // 2. Validate Username
    if (!formData.username.trim()) {
      notify('Username cannot be empty', 'error');
      return;
    }

    // 3. Validate New Password (if provided)
    if (formData.newPassword) {
      if (formData.newPassword.length < 4) {
        notify('New password must be at least 4 characters', 'error');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        notify('New passwords do not match', 'error');
        return;
      }
      if (formData.newPassword === formData.currentPassword) {
        notify('New password cannot be the same as old password', 'error');
        return;
      }
    } else {
      // If no new password, check if username changed
      if (formData.username === localStorage.getItem('starline_admin_user')) {
        notify('No changes detected', 'error');
        return;
      }
    }

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200)); // Simulate network request

    // Commit changes
    await Database.setConfig('starline_admin_user', formData.username);
    if (formData.newPassword) {
      await Database.setConfig('starline_admin_pass', formData.newPassword);
    }

    notify('Security controls updated successfully');
    setIsLoading(false);
    // Reset sensitive fields
    setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
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
      await Database.deleteModel(deletingModel.id);
      setDeletingModel(null);
      setModelDeleteConfirmName('');
      loadModelData();
      notify('Model deleted from registry', 'success');
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
        AuthSession.saveSession();
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20 text-slate-900">
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
            onClick={() => setCurrentTab('data')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${currentTab === 'data' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
          >
            <Save size={16} />
            Data Management
          </button>
          <button
            onClick={() => setCurrentTab('access')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${currentTab === 'access' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Access Control
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

      {/* --- DATA MANAGEMENT TAB --- */}
      {currentTab === 'data' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300">
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-6 rounded-3xl border shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white border border-blue-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shadow-sm"><Save size={24} /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Database Backup</h3>
                  <p className="text-xs font-medium text-slate-500 max-w-sm">Create a secure copy of the entire registry (10M+ records) to your Documents folder.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setIsBackupLoading(true);
                  try {
                    const res = await Database.backupDatabase();
                    if (res.success) {
                      notify(`Backup created at: ${res.path}`, 'success');
                    } else {
                      notify(`Backup failed: ${res.error}`, 'error');
                    }
                  } catch (e) {
                    notify('Backup system error', 'error');
                  } finally {
                    setIsBackupLoading(false);
                  }
                }}
                disabled={isBackupLoading}
                className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 flex items-center gap-2 whitespace-nowrap"
              >
                {isBackupLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Execute Backup
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-100 border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-200 border border-slate-300 rounded-xl text-slate-600 shadow-sm"><RefreshCw size={24} /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Restore Data</h3>
                  <p className="text-xs font-medium text-slate-500 max-w-sm">Import data from an external SSD backup. WARNING: This overwrites current data.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!window.confirm('WARNING: Restoring will OVERWRITE all current data.\n\nThe app will restart after restoration.\n\nContinue?')) return;

                  const path = await Database.selectRestoreFile();
                  if (path) {
                    setIsBackupLoading(true);
                    const res = await Database.restoreDatabase(path);
                    if (!res.success) {
                      notify(`Restore failed: ${res.error}`, 'error');
                      setIsBackupLoading(false);
                    }
                  }
                }}
                className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 whitespace-nowrap"
              >
                <RefreshCw size={16} /> Select Backup File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACCESS CONTROL TAB --- */}
      {currentTab === 'access' && (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">

            {/* Header */}
            <div className="p-5 bg-white border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <ShieldCheck size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-none">Admin Controller</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Secure Configuration Access</p>
                </div>
              </div>
              <button
                className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-default"
              >
                <Lock size={14} /> Global Admin Active
              </button>
            </div>

            {/* Security Config */}
            <div className="p-8 border-b border-slate-100">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Admin Credentials
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Update the authentication protocol for the master account.</p>
                </div>
                <div className="bg-slate-50 text-slate-400 p-2 rounded-lg border border-slate-100">
                  <Key size={18} />
                </div>
              </div>

              <form onSubmit={handleUpdateCredentials} className="space-y-8 max-w-3xl">

                {/* Identity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identity</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Username</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                        <input
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-400"
                          value={formData.username}
                          onChange={e => setFormData({ ...formData, username: e.target.value.toUpperCase() })}
                          placeholder="ADMIN"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Key</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">New Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                        <input
                          type="password"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-400"
                          value={formData.newPassword}
                          onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                        <input
                          type="password"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-400"
                          value={formData.confirmPassword}
                          onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start pt-4">
                  <button type="submit" className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-2">
                    <Save size={16} /> Update Credentials
                  </button>
                </div>
              </form>
            </div>

            {/* DANGER ZONE */}
            <div className="p-8 bg-slate-50 border-t border-slate-200">
              <h4 className="text-sm font-bold text-rose-700 mb-6 flex items-center gap-2">
                <AlertTriangle size={16} />
                Danger Zone
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Delete Battery Record */}
                <div className="bg-white border border-rose-100 rounded-xl p-5 shadow-sm col-span-1 lg:col-span-2">
                  <div className="mb-4">
                    <h5 className="font-bold text-slate-900 text-sm">Delete Battery Record</h5>
                    <p className="text-xs text-slate-500 mt-1">Permanently remove a battery and all its history (Sales, Replacements) from the database.</p>
                  </div>

                  <div className="flex gap-3 mb-4">
                    <input
                      placeholder="Scan Battery Serial Number..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold uppercase outline-none focus:border-rose-500"
                      value={replacementSearchId}
                      onChange={e => setReplacementSearchId(e.target.value.toUpperCase())}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && replacementSearchId) {
                          setIsSearchingReplacement(true);
                          setFoundReplacement(null);
                          // Search for battery full details
                          const res = await Database.searchBattery(replacementSearchId);
                          setFoundReplacement(res);
                          if (!res) notify('No battery record found for this ID', 'error');
                          setIsSearchingReplacement(false);
                        }
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (!replacementSearchId) return;
                        setIsSearchingReplacement(true);
                        setFoundReplacement(null);
                        const res = await Database.searchBattery(replacementSearchId);
                        setFoundReplacement(res);
                        if (!res) notify('No battery record found for this ID', 'error');
                        setIsSearchingReplacement(false);
                      }}
                      disabled={isSearchingReplacement}
                      className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-black transition-all shadow-sm flex items-center gap-2"
                    >
                      {isSearchingReplacement ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
                    </button>
                  </div>

                  {foundReplacement && foundReplacement.battery && (
                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                        <div><p className="font-bold text-slate-400 uppercase">Battery ID</p><p className="font-mono font-bold text-slate-900">{foundReplacement.battery.id}</p></div>
                        <div><p className="font-bold text-slate-400 uppercase">Model</p><p className="font-mono font-bold text-slate-900">{foundReplacement.battery.model}</p></div>
                        <div>
                          <p className="font-bold text-slate-400 uppercase">Status</p>
                          <p className={`font-mono font-bold ${(foundReplacement.battery.warrantyExpiry && new Date() > new Date(foundReplacement.battery.warrantyExpiry))
                            ? 'text-rose-600'
                            : 'text-slate-900'
                            }`}>
                            {(foundReplacement.battery.warrantyExpiry && new Date() > new Date(foundReplacement.battery.warrantyExpiry))
                              ? 'EXPIRED'
                              : foundReplacement.battery.status}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 uppercase">Assigned Dealer</p>
                          <p className="font-bold text-slate-900">
                            {dealers.find(d => d.id === foundReplacement.battery.dealerId)?.name || foundReplacement.battery.dealerId || 'N/A'}
                          </p>
                        </div>
                        {/* <div>
                            <p className="font-bold text-slate-400 uppercase">Manufacture Date</p>
                            <p className="font-mono font-bold text-slate-900">{foundReplacement.battery.manufactureDate ? foundReplacement.battery.manufactureDate.split('-').reverse().join('/') : 'N/A'}</p>
                          </div> */}
                        <div>
                          <p className="font-bold text-slate-400 uppercase">Sent to Dealer</p>
                          <p className="font-mono font-bold text-slate-900">
                            {/* Sent date is typically manufacture date or explicitly tracked if we had a dispatch log. Using manuf date as proxy or activation if available */}
                            {foundReplacement.battery.manufactureDate ? foundReplacement.battery.manufactureDate.split('-').reverse().join('/') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {foundReplacement.sale && (
                        <div className="mb-4 p-3 bg-white/50 rounded-lg border border-rose-100">
                          <p className="font-bold text-slate-400 uppercase text-[10px] mb-2">Sale Record Detected</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-slate-500">To:</span> <span className="font-bold">{foundReplacement.sale.customerName}</span></div>
                            <div><span className="text-slate-500">Date:</span> <span className="font-bold font-mono">{foundReplacement.sale.saleDate ? foundReplacement.sale.saleDate.split('-').reverse().join('/') : 'N/A'}</span></div>
                          </div>
                        </div>
                      )}

                      {/* Lineage Warning */}
                      {foundReplacement.replacements && foundReplacement.replacements.some(r => r.oldBatteryId === foundReplacement.battery.id) && (
                        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <p className="font-bold text-amber-800 uppercase text-[10px] mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Lineage Warning</p>
                          <p className="text-xs text-amber-900">
                            This battery was replaced by <span className="font-bold font-mono">{foundReplacement.replacements.find(r => r.oldBatteryId === foundReplacement.battery.id)?.newBatteryId}</span>.
                            Deleting this record will break the link and reset the replacement unit to a standalone <b>ACTIVE</b> status.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          if (window.confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE battery ${foundReplacement.battery.id}?\n\nThis will remove:\n- The Battery Record\n- Associated Sales\n- Associated Replacements\n\nThis action cannot be undone.`)) {
                            setIsActionLoading(true);
                            try {
                              await Database.deleteBatteryRecord(foundReplacement.battery.id);
                              await Database.logActivity('BATTERY_DELETE', `Deleted battery record ${foundReplacement.battery.id}`, { batteryId: foundReplacement.battery.id, reason: 'Manual deletion from Danger Zone' });
                              notify('Battery record permanently deleted', 'success');
                              setFoundReplacement(null);
                              setReplacementSearchId('');
                            } catch (e: any) {
                              notify(`Deletion Failed: ${e.message}`, 'error');
                            } finally {
                              setIsActionLoading(false);
                            }
                          }
                        }}
                        disabled={isActionLoading}
                        className="w-full py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Permanently Delete Battery
                      </button>
                    </div>
                  )}
                </div>

                {/* Dealer Deletion */}
                <div className="bg-white border border-rose-100 rounded-xl p-5 shadow-sm">
                  <div className="mb-4">
                    <h5 className="font-bold text-slate-900 text-sm">Remove Dealer</h5>
                    <p className="text-xs text-slate-500 mt-1">Permanently delete a dealer and their records.</p>
                  </div>

                  <div className="space-y-3">
                    <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-rose-500" value={deletingDealer?.id || ''} onChange={e => { setDeletingDealer(dealers.find(d => d.id === e.target.value) as any); setModelDeleteConfirmName(''); }}>
                      <option value="">Select Dealer...</option>
                      {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>

                    {deletingDealer && (
                      <input
                        placeholder={`Type "${deletingDealer.name}"`}
                        className="w-full px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-bold focus:border-rose-500 outline-none placeholder:text-rose-200 placeholder:font-normal"
                        value={modelDeleteConfirmName}
                        onChange={e => setModelDeleteConfirmName(e.target.value)}
                      />
                    )}

                    <button
                      disabled={!deletingDealer || modelDeleteConfirmName !== deletingDealer.name || isActionLoading}
                      onClick={async () => {
                        if (deletingDealer) {
                          setIsActionLoading(true);
                          await Database.deleteDealer(deletingDealer.id);
                          await Database.logActivity('PARTNER_DELETE', `Deleted dealer ${deletingDealer.name}`, { dealerId: deletingDealer.id, name: deletingDealer.name });
                          setDeletingDealer(null);
                          setModelDeleteConfirmName('');
                          loadModelData();
                          notify('Dealer removed successfully', 'success');
                          setIsActionLoading(false);
                        }
                      }}
                      className="w-full py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-lg text-xs hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isActionLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Delete Dealer'}
                    </button>
                  </div>
                </div>

                {/* Factory Reset */}
                <div className="bg-white border border-rose-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="mb-4">
                    <h5 className="font-bold text-slate-900 text-sm">Factory Reset</h5>
                    <p className="text-xs text-slate-500 mt-1">Wipe all data and restore system defaults.</p>

                    {!hasBackedUp && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-[10px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-1">
                          <AlertTriangle size={12} /> Backup Required
                        </p>
                        <button
                          onClick={async () => {
                            setIsActionLoading(true);
                            try {
                              const result = await window.electronAPI?.backup();
                              if (result?.success) {
                                setHasBackedUp(true);
                                notify(`Backup saved to: ${result.path}`, 'success');
                              } else {
                                throw new Error(result?.error || 'Backup failed');
                              }
                            } catch (e: any) {
                              notify(`Backup Failed: ${e.message}`, 'error');
                            } finally {
                              setIsActionLoading(false);
                            }
                          }}
                          className="w-full py-2 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px] hover:bg-amber-200 transition-colors uppercase tracking-wide"
                        >
                          Save Database Backup
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={!hasBackedUp}
                    onClick={async () => {
                      if (window.confirm('CRITICAL WARNING: You are about to wipe ALL application data.\n\nAre you absolutely sure?')) {
                        if (window.confirm('Final Confirmation: This action is irreversible. All records will be lost.\n\nProceed with Factory Reset?')) {
                          await Database.resetDatabase();
                          notify('System reset complete. Reloading...', 'success');
                          setTimeout(() => window.location.reload(), 1500);
                        }
                      }
                    }}
                    className="w-full py-2 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} /> Reset Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
