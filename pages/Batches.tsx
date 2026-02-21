import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database } from '../db';
import { StagedBatch, UserRole } from '../types';
import { AuthSession } from '../utils/AuthSession';
import {
    Layers, RefreshCw, Loader2, CheckCircle2, Search, XCircle, Clock, Calendar, User, Eye, ShieldCheck, ClipboardCheck
} from 'lucide-react';
import { formatDate } from '../utils';
import { ProgressFlow } from '../components/ProgressFlow';
import { SuccessFlow } from '../components/SuccessFlow';
import BatteryPrintTemplate from '../components/BatteryPrintTemplate';

const Batches: React.FC<{ onNavigateToHub?: (id: string) => void }> = ({ onNavigateToHub }) => {
    const [batches, setBatches] = useState<StagedBatch[]>([]);
    const [inspections, setInspections] = useState<any[]>([]); // Using any to avoid importing Battery if not needed, or just type it
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'REGISTRY' | 'INSPECTIONS'>('REGISTRY');
    const [userRole, setUserRole] = useState<UserRole | undefined>();

    // Denial Confirmation State
    const [denyingBatch, setDenyingBatch] = useState<string | null>(null);
    const [denyConfirmStep, setDenyConfirmStep] = useState(0);

    // Approval State
    const [isApproving, setIsApproving] = useState(false);
    const [approvalProgress, setApprovalProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successDetails, setSuccessDetails] = useState<{ count: number, dealerName: string, items: any[], batchId: string, model: string, date: string, dealerId: string } | null>(null);

    // View Items State
    const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
    const [batchItems, setBatchItems] = useState<string[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isAdmin = userRole === 'ADMIN';

    const loadBatches = async () => {
        setIsLoading(true);
        try {
            const currentUser = AuthSession.getCurrentUser();
            const role = currentUser?.role;
            setUserRole(role);

            // If worker, only show their own batches?
            // User said: "show all that this user added", but usually Admins must see all.
            // Let's filter for workers but show all for admins.
            const [data, pendingInspections] = await Promise.all([
                Database.getStagedBatches(role === 'ADMIN' ? undefined : currentUser?.id),
                Database.getPendingInspections()
            ]);
            setBatches(data);
            setInspections(pendingInspections);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBatches();
    }, []);

    const handleApprove = async (batch: StagedBatch) => {
        if (!window.confirm('Approve this batch and register all units?')) return;
        setIsApproving(true);
        setApprovalProgress(0);

        try {
            const items = await Database.getStagedBatchItems(batch.id);
            setApprovalProgress(30);

            const interval = setInterval(() => {
                setApprovalProgress(p => p < 90 ? p + 15 : p);
            }, 500);

            await Database.approveStagedBatch(batch.id);
            clearInterval(interval);
            setApprovalProgress(100);

            setTimeout(() => {
                setIsApproving(false);
                setSuccessDetails({
                    count: batch.itemCount || 0,
                    dealerName: batch.dealerName || 'Unknown',
                    items: items.map(serial => ({
                        id: serial,
                        model: batch.modelName || batch.modelId,
                        manufactureDate: batch.date
                    })),
                    batchId: batch.id,
                    model: batch.modelName || batch.modelId,
                    date: batch.date,
                    dealerId: batch.dealerId
                });
                setShowSuccess(true);
                loadBatches();
                loadBatches();
            }, 600);

            window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Batch Processed and units registered' } }));
        } catch (e: any) {
            setIsApproving(false);
            alert(e.message || 'Approval failed');
        }
    };

    const handleToggleViewItems = async (batch: StagedBatch) => {
        if (expandedBatch === batch.id) {
            setExpandedBatch(null);
            return;
        }
        setExpandedBatch(batch.id);
        setIsLoadingItems(true);
        try {
            const items = await Database.getStagedBatchItems(batch.id);
            setBatchItems(items);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingItems(false);
        }
    };

    const handleDeny = async () => {
        if (!denyingBatch) return;
        try {
            await Database.denyStagedBatch(denyingBatch);
            setDenyingBatch(null);
            setDenyConfirmStep(0);
            loadBatches();
            window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Batch denied successfully', type: 'error' } }));
        } catch (e: any) {
            alert(e.message || 'Denial failed');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'APPROVED': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'DENIED': return 'text-rose-600 bg-rose-50 border-rose-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const filteredBatches = batches.filter(b => b.status === 'PENDING').filter(b => {
        const searchLower = searchQuery.toLowerCase();
        return (
            (b.dealerName && b.dealerName.toLowerCase().includes(searchLower)) ||
            (b.creatorName && b.creatorName.toLowerCase().includes(searchLower)) ||
            (b.modelName && b.modelName.toLowerCase().includes(searchLower)) ||
            (b.id && b.id.toString().toLowerCase().includes(searchLower))
        );
    });

    const filteredInspections = inspections.filter(i => {
        const searchLower = searchQuery.toLowerCase();
        return (
            (i.model && i.model.toLowerCase().includes(searchLower)) ||
            (i.id && i.id.toString().toLowerCase().includes(searchLower))
        );
    });

    const pendingCount = batches.filter(b => b.status === 'PENDING').length;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">Batch Registry</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Inventory Intake Queue</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab('REGISTRY')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'REGISTRY' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Layers size={14} />
                            Registration Queue
                            {pendingCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[8px] leading-none">{pendingCount}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('INSPECTIONS')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'INSPECTIONS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ClipboardCheck size={14} />
                            Pending Inspections
                            {inspections.length > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] leading-none ${activeTab === 'INSPECTIONS' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {inspections.length}
                                </span>
                            )}
                        </button>
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <button
                        onClick={loadBatches}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm active:scale-95"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search Bar Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                    <input
                        placeholder={activeTab === 'REGISTRY' ? "Search Registration Queue by Dealer, Model, or ID..." : "Search Inspections by ID or Model..."}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-sm transition-all uppercase tracking-wide mono text-slate-900 focus:bg-white focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    {activeTab === 'REGISTRY' ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold border-b border-slate-200 uppercase tracking-widest">
                                    <th className="px-6 py-4">Submission Date</th>
                                    <th className="px-6 py-4">Dealer Destination</th>
                                    <th className="px-6 py-4">Processed By</th>
                                    <th className="px-6 py-4">Content Size</th>
                                    <th className="px-6 py-4 text-right pr-10">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBatches.map((batch) => (
                                    <React.Fragment key={batch.id}>
                                        <tr className="group hover:bg-slate-50/50 transition-all duration-200">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">

                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-slate-900 font-mono tracking-tight leading-none">{formatDate(batch.date || '')}</span>
                                                        {/* <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {batch.id}</span> */}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                        {batch.dealerName || 'Unknown Dealer'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                                                        <User size={12} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{batch.creatorName || 'System'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5"><Layers size={14} className="text-blue-500" /> {batch.itemCount} Units</span>
                                                    {/* <span className="text-[9px] font-bold text-slate-500 uppercase mt-1 px-1.5 py-0.5 bg-slate-100 rounded inline-block w-fit">{batch.modelName}</span> */}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleViewItems(batch)}
                                                        className={`p-2 rounded-lg transition-all ${expandedBatch === batch.id ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 shadow-sm'}`}
                                                        title="Toggle View Items"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setDenyingBatch(batch.id); setDenyConfirmStep(1); }}
                                                        className="px-4 py-2 bg-white border border-slate-200 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Deny
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(batch)}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedBatch === batch.id && (
                                            <tr className="bg-slate-50/50 border-b border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <td colSpan={5} className="px-8 py-6">
                                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Batch Inventory List</h4>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                                                    {batch.modelName} - Total: {batch.itemCount} Batteries
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => setExpandedBatch(null)}
                                                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                                                            >
                                                                <XCircle size={16} />
                                                            </button>
                                                        </div>
                                                        {isLoadingItems ? (
                                                            <div className="flex justify-center p-8">
                                                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                                {batchItems.map((serial, idx) => (
                                                                    <div key={idx} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg flex items-center justify-between group-hover:border-blue-100 transition-colors">
                                                                        <div>
                                                                            <div className="font-mono text-xs font-bold text-slate-900">{serial}</div>
                                                                            <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{batch.modelName}</div>
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-slate-300 w-5 text-right">{idx + 1}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {(!isLoading && filteredBatches.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center bg-slate-50/50">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                    <Layers size={24} />
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 uppercase">Queue Clear</h3>
                                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">No batches pending registration.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {isLoading && (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanning Registry...</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold border-b border-slate-200 uppercase tracking-widest">
                                    <th className="px-6 py-4">Received Date</th>
                                    <th className="px-6 py-4">Battery ID</th>
                                    <th className="px-6 py-4">Model Description</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right pr-10">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInspections.map((insp) => (
                                    <tr key={insp.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-900 font-mono">
                                                    {formatDate(insp.inspectionStartDate || (insp.status && insp.status.includes('PENDING') ? new Date().toISOString() : ''))}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-slate-700 font-mono tracking-wider">{insp.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-100 rounded inline-block w-fit">{insp.modelName || 'Unknown Model'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border inline-block ${insp.inspectionStatus === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                {insp.inspectionStatus?.replace('_', ' ') || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-6">
                                            <button
                                                onClick={() => { localStorage.setItem('auto_inspect', insp.id); onNavigateToHub?.(insp.id); }}
                                                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center ml-auto shadow-sm"
                                            >
                                                {insp.inspectionStatus === 'IN_PROGRESS' ? 'Resume' : 'Start'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!isLoading && filteredInspections.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center bg-slate-50/50">
                                            <div className="max-w-xs mx-auto">
                                                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                    <ClipboardCheck size={24} />
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 uppercase">All Caught Up</h3>
                                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">No pending inspections in the queue.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {isLoading && (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <Loader2 size={24} className="text-slate-300 animate-spin mx-auto mb-3" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Inspections...</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Denial Confirmation Modal */}
            {denyingBatch && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                                <ShieldCheck size={32} />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    {denyConfirmStep === 1 ? 'Verify Denial' : 'Final Confirmation'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                                    {denyConfirmStep === 1
                                        ? `Are you sure you want to deny batch ${denyingBatch}? This action cannot be undone.`
                                        : "CRITICAL: You are about to permanently reject these inventory items. Confirm to continue."}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        if (denyConfirmStep === 1) {
                                            setDenyConfirmStep(2);
                                        } else {
                                            handleDeny();
                                        }
                                    }}
                                    className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${denyConfirmStep === 1 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-red-900 text-white hover:bg-black'}`}
                                >
                                    {denyConfirmStep === 1 ? 'Proceed to Final Step' : 'Confirm Final Denial'}
                                </button>
                                <button
                                    onClick={() => { setDenyingBatch(null); setDenyConfirmStep(0); }}
                                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Progress */}
            <ProgressFlow
                isOpen={isApproving}
                title="Approving Batch"
                subtitle={`Processing ${approvalProgress < 50 ? 'Items' : 'Registry'}`}
                progress={approvalProgress}
                stageLabel="Registering Units"
            />

            {/* Approval Success */}
            {successDetails && (
                <SuccessFlow
                    isOpen={showSuccess}
                    title="Batch Processed"
                    details={[
                        { label: 'Units Registered', value: successDetails.count, primary: true },
                        { label: 'Dealer Assigned', value: successDetails.dealerName }
                    ]}
                    onPrint={() => window.print()}
                    onClose={() => setShowSuccess(false)}
                />
            )}

            {/* Hidden Print Portal */}
            {successDetails && createPortal(
                <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
                    <BatteryPrintTemplate
                        dealerName={successDetails.dealerName}
                        dealerId={successDetails.dealerId}
                        reportTitle="Batch Assignment Receipt"
                        reportType="batch"
                        date={successDetails.date}
                        data={successDetails.items}
                        tableType="BATCH"
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export default Batches;
