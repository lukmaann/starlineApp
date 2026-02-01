import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import { BatteryModel } from '../types';
import {
  Plus, X, Search, ChevronLeft, ChevronRight,
  Edit2, Trash2, Box,
  ShieldAlert, Layers, Info,
  ClipboardCheck, FileSignature, Settings2,
  CheckCircle2, Loader2, ShieldCheck
} from 'lucide-react';

interface StockProps {
  onNavigateToHub?: (serial: string) => void;
}

const Stock: React.FC<StockProps> = () => {
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [activeForm, setActiveForm] = useState<null | 'model'>(null);
  const [modelWizardStep, setModelWizardStep] = useState(0);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState<BatteryModel | null>(null);
  const [modelDeleteConfirmName, setModelDeleteConfirmName] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', capacity: '', warranty: 18 });
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 12;
  const [totalModels, setTotalModels] = useState(0);

  const loadData = async () => {
    let where = '';
    let params: any[] = [];

    if (searchQuery) {
      where = 'name LIKE ? OR id LIKE ?';
      params = [`%${searchQuery.toUpperCase()}%`, `%${searchQuery.toUpperCase()}%`];
    }

    const { data, total } = await Database.getPaginated<BatteryModel>('models', page + 1, limit, where, params);
    setModels(data);
    setTotalModels(total);
  };

  useEffect(() => { loadData(); }, [searchQuery, page]);

  const handleOpenModelWizard = (m?: BatteryModel) => {
    if (m) {
      setEditingModelId(m.id);
      setModelForm({
        name: m.name,
        // Strip AH for numeric input editing
        capacity: m.defaultCapacity.replace(/AH$/i, ''),
        warranty: m.defaultWarrantyMonths
      });
    } else {
      setEditingModelId(null);
      setModelForm({ name: '', capacity: '', warranty: 18 });
    }
    setModelWizardStep(0);
    setActiveForm('model');
    setDeletingModel(null); // Clear deletion state if opening wizard
  };

  const handleCommitModel = async () => {
    setIsActionLoading(true);
    const modelData = {
      id: editingModelId || modelForm.name.toUpperCase().replace(/\s+/g, '-'),
      name: modelForm.name.toUpperCase(),
      // Ensure AH is appended on save
      defaultCapacity: modelForm.capacity.replace(/AH$/i, '') + 'AH',
      defaultWarrantyMonths: modelForm.warranty
    };

    try {
      if (editingModelId) {
        await Database.updateModel(modelData);
      } else {
        await Database.addModel(modelData);
      }
      setIsActionLoading(false);
      setActiveForm(null);
      loadData();
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: editingModelId ? 'ARCHETYPE UPDATED' : 'SCHEMA INITIALIZED' } }));
    } catch (e: any) {
      setIsActionLoading(false);
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: `ERROR: ${e.message}`, type: 'error' } }));
    }
  };

  const handleExecuteModelDeletion = async () => {
    if (!deletingModel) return;
    setIsActionLoading(true);
    try {
      await Database.deleteModel(deletingModel.id);
      setDeletingModel(null);
      setModelDeleteConfirmName('');
      loadData();
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'MODEL REMOVED FROM REGISTRY', type: 'error' } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: e.message || 'Deletion Failed', type: 'error' } }));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 uppercase tracking-tight pb-10">
      {/* Header Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-6">
          <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Catalog Management</h2>
            <p className="text-slate-400 text-[10px] font-bold mt-1 tracking-widest uppercase">Global Schema Root</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="ID lookup..." className="pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:bg-white focus:border-blue-500 transition-all outline-none uppercase" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); }} />
          </div>
          <button onClick={() => handleOpenModelWizard()} className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 group">
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /><span>Define New Schema</span>
          </button>
        </div>
      </div>

      {/* Model Specification Wizard (Modal-Free) */}
      {activeForm === 'model' && (
        <div className="flex h-[550px] bg-white rounded-3xl border-2 border-blue-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="w-72 bg-slate-950 p-10 flex flex-col justify-between relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-10 opacity-5 text-white pointer-events-none rotate-12"><Box size={220} /></div>
            <div className="relative z-10 space-y-10">
              <div className="flex items-center space-x-3 mb-10">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Layers size={24} /></div>
                <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">SCHEMA ID</p><p className="text-xs font-black text-white mono truncate w-32 mt-1">{editingModelId || 'AUTO_GEN'}</p></div>
              </div>
              <div className="space-y-6">
                {[
                  { step: 0, label: 'Identity Mapping', icon: FileSignature },
                  { step: 1, label: 'Technical Spec', icon: Settings2 },
                  { step: 2, label: 'Final Validation', icon: ClipboardCheck }
                ].map((s, idx) => (
                  <div key={idx} className={`flex items-center space-x-4 transition-all duration-300 ${modelWizardStep === s.step ? 'opacity-100 translate-x-2' : 'opacity-30'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${modelWizardStep === s.step ? 'bg-blue-600 border-blue-500 text-white shadow-xl' : 'border-slate-800 text-slate-500'}`}><s.icon size={18} /></div>
                    <div><p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Step {idx + 1}</p><p className="text-[11px] font-black uppercase text-white tracking-tight">{s.label}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative z-10 border-t border-slate-800 pt-8"><p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.3em]">Starline Architecture<br />Design Protocol v4.0</p></div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {modelWizardStep === 0 && 'Architecture Identity Mapping'}
                {modelWizardStep === 1 && 'Parametric Configuration'}
                {modelWizardStep === 2 && 'Enterprise Policy Commit'}
              </h3>
              <button onClick={() => setActiveForm(null)} className="p-2 text-slate-200 hover:text-slate-900 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
              {modelWizardStep === 0 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Archetype Name</label>
                    <input autoFocus placeholder="E.G. SL60" className="w-full px-7 py-6 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-xl outline-none focus:bg-white focus:border-blue-500 transition-all uppercase placeholder:text-slate-200" value={modelForm.name} onChange={e => setModelForm({ ...modelForm, name: e.target.value })} />
                  </div>
                  <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start space-x-4">
                    <Info size={22} className="text-blue-600 shrink-0" />
                    <p className="text-[10px] font-bold text-blue-800 uppercase leading-relaxed tracking-wide">This identifier represents the physical product line. Editing an existing name will update the label for all historical assets under this schema ID.</p>
                  </div>
                </div>
              )}

              {modelWizardStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rated Capacity (AH)</label>
                    <input type="number" placeholder="E.G. 150" className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-xl font-black text-sm outline-none focus:bg-white focus:border-blue-500 transition-all uppercase" value={modelForm.capacity} onChange={e => setModelForm({ ...modelForm, capacity: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Warranty (Months)</label>
                    <input type="number" className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-xl font-black text-sm outline-none focus:bg-white focus:border-blue-500 transition-all" value={modelForm.warranty} onChange={e => setModelForm({ ...modelForm, warranty: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              )}

              {modelWizardStep === 2 && (
                <div className="space-y-10 animate-in zoom-in-95 duration-300">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Label</p>
                        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{modelForm.name || 'UNSPECIFIED'}</h4>
                      </div>
                      <span className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-black mono text-blue-600 shadow-sm">{editingModelId || 'NEW_REGISTRY_ENTRY'}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex gap-16">
                      <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Capacity</p><p className="text-lg font-black text-slate-800">{modelForm.capacity.replace(/AH$/i, '')}AH</p></div>
                      <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Policy Duration</p><p className="text-lg font-black text-slate-800">{modelForm.warranty} Months</p></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-6 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                    <ShieldCheck size={28} />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">By finalizing this schema, you authenticate the technical specifications as the master template for all future unit registrations of this type.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              {modelWizardStep > 0 ? (
                <button onClick={() => setModelWizardStep(s => s - 1)} className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-all flex items-center gap-2"><ChevronLeft size={18} /> Back</button>
              ) : <div />}

              {modelWizardStep < 2 ? (
                <button
                  disabled={!modelForm.name || (modelWizardStep === 1 && !modelForm.capacity)}
                  onClick={() => setModelWizardStep(s => s + 1)}
                  className="px-12 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-20 flex items-center gap-2"
                >
                  Proceed <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleCommitModel}
                  disabled={isActionLoading}
                  className="px-14 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30 flex items-center gap-3"
                >
                  {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Commit To Registry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Model Erasure Protocol (Modal-Free) */}
      {deletingModel && (
        <div className="p-10 bg-rose-50 border-2 border-rose-200 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row gap-10">
            <div className="w-20 h-20 bg-rose-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-rose-200 shrink-0 animate-pulse"><ShieldAlert size={40} /></div>
            <div className="space-y-6 flex-1">
              <div>
                <h3 className="text-2xl font-black text-rose-900 uppercase tracking-tighter">Architecture Erasure Protocol</h3>
                <p className="text-rose-700 text-[10px] font-black uppercase tracking-[0.3em] mt-1">DANGER: This will remove the schema '{deletingModel.name}' from the master catalog.</p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em] ml-1">Type model name to authenticate: <span className="text-rose-900 underline font-black">{deletingModel.name}</span></label>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    autoFocus
                    placeholder="VERIFY ARCHETYPE NAME..."
                    className="flex-1 px-7 py-5 bg-white border-2 border-rose-100 rounded-2xl font-black text-sm text-rose-900 outline-none focus:border-rose-600 transition-all uppercase"
                    value={modelDeleteConfirmName}
                    onChange={e => setModelDeleteConfirmName(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setDeletingModel(null)} className="px-8 py-5 bg-white text-rose-400 font-black text-xs uppercase tracking-widest rounded-2xl border-2 border-rose-100 hover:bg-rose-100 transition-all">Abort</button>
                    <button
                      onClick={handleExecuteModelDeletion}
                      disabled={modelDeleteConfirmName.trim().toUpperCase() !== deletingModel.name.toUpperCase() || isActionLoading}
                      className="px-12 py-5 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 disabled:opacity-30"
                    >
                      {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Execute Erasure'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Catalog Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[600px] flex flex-col p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {models.map(m => (
            <div key={m.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 hover:border-blue-300 hover:bg-white hover:shadow-2xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-blue-600 rotate-12 group-hover:scale-110 transition-transform"><Layers size={140} /></div>
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-slate-300 group-hover:text-blue-600 group-hover:shadow-lg group-hover:border-blue-100 transition-all"><Box size={28} /></div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenModelWizard(m); }} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDeletingModel(m); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="relative z-10">
                <h4 className="font-black text-slate-900 uppercase tracking-tighter text-xl leading-none mb-2">{m.name}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.defaultCapacity} Rating</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{m.defaultWarrantyMonths} MO Cover</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center relative z-10">
                <span className="text-[9px] font-black text-slate-300 mono uppercase tracking-widest">{m.id}</span>
                <Settings2 size={14} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          ))}
          <button onClick={() => handleOpenModelWizard()} className="bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-500 transition-all group min-h-[250px]">
            <Plus size={48} className="mb-4 group-hover:scale-110 transition-transform" />
            <span className="font-black uppercase tracking-widest text-[11px]">Define New Schema</span>
          </button>
        </div>

        {/* Catalog Pagination */}
        {totalModels > limit && (
          <div className="mt-10 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
            <span>Showing {page * limit + 1}-{Math.min((page + 1) * limit, totalModels)} of {totalModels} Records</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft size={18} /></button>
              <button disabled={(page + 1) * limit >= totalModels} onClick={() => setPage(p => p + 1)} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 disabled:opacity-30 transition-all shadow-sm"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stock;
