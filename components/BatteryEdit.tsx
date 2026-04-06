import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Database } from '../db';
import { scheduleUndoableAction } from '../utils/undoToast';
import { Battery, BatteryStatus, Replacement, Sale, WarrantyCardStatus } from '../types';
import { getLocalDate, formatDate } from '../utils';
import {
    Save, ShieldCheck, X, Calendar, User, Phone,
    CreditCard, CheckCircle2, AlertCircle, Loader2,
    Store, Barcode, ChevronDown, History, Zap, Trash2, AlertTriangle, RotateCcw, Search, MapPin, Check
} from 'lucide-react';

interface BatteryEditProps {
    batteryId: string;
    onClose: () => void;
    onUpdate: () => void;
}

const DeleteConfirmation: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}> = ({ onConfirm, onCancel, isLoading }) => (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in scale-95 duration-200">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Danger: Permanent Deletion</h3>
                    <p className="text-xs font-bold text-rose-600 uppercase">You are about to revert a transaction</p>
                </div>
            </div>

            <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 font-medium">
                    This action will <strong>Cascade Delete</strong> this replacement record and revert all associated data.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-slate-700">Old Battery Reverts to ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="font-bold text-slate-700">New Battery Reverts to STOCK</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="font-bold text-slate-700">Settlement/Credits are CANCELLED</span>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold uppercase text-xs rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-rose-600 text-white font-bold uppercase text-xs rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>
                            <Trash2 size={16} /> Confirm Delete
                        </>}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const EditConfirmation: React.FC<{
    changes: { field: string, old: string, new: string }[];
    onConfirm: () => void;
    onCancel: () => void;
    isSaving: boolean;
}> = ({ changes, onConfirm, onCancel, isSaving }) => (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in scale-95 duration-200">
            <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Save size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Confirm Changes</h3>
                    <p className="text-xs font-bold text-indigo-600 uppercase">Review your edits before saving</p>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {changes.length === 0 ? (
                    <p className="text-sm text-slate-500 font-medium italic">No changes detected.</p>
                ) : (
                    <div className="space-y-2">
                        {changes.map((change, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                                <span className="block font-bold text-slate-400 uppercase tracking-wider mb-1">{change.field}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-rose-500 line-through decoration-2 decoration-rose-500/30">{change.old || '(empty)'}</span>
                                    <span className="text-slate-300">→</span>
                                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">{change.new}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold uppercase text-xs rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSaving}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold uppercase text-xs rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <>
                            <Save size={16} /> Confirm Update
                        </>}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const BatteryEdit: React.FC<BatteryEditProps> = ({ batteryId, onClose, onUpdate }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeAsset, setActiveAsset] = useState<{
        battery: Battery;
        sale?: Sale;
        originalSale?: Sale;
        replacement?: Replacement;
    } | null>(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [showEditConfirm, setShowEditConfirm] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<{ field: string, old: string, new: string }[]>([]);

    const [dealers, setDealers] = useState<any[]>([]);
    const [models, setModels] = useState<any[]>([]);
    const [originalDealerId, setOriginalDealerId] = useState('');
    const [dealerQuery, setDealerQuery] = useState('');
    const [showDealerDropdown, setShowDealerDropdown] = useState(false);
    const dealerDropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        // customerName: '', // REPLACED BY DEALER SELECT
        // customerPhone: '', // REMOVED
        newBatteryId: '',
        model: '',
        dealerId: '',
        soldDate: '',
        // Replacement specific fields
        settlementMethod: 'CREDIT' as 'CREDIT' | 'STOCK' | 'DIRECT',
        paidInAccount: false,
        replenishmentBatteryId: '',
        warrantyCardStatus: 'RECEIVED' as WarrantyCardStatus,
        reason: '',
        settlementDate: ''
    });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [data, allDealers, allModels] = await Promise.all([
                    Database.searchBattery(batteryId),
                    Database.getAll<{ id: string, name: string, location: string }>('dealers'),
                    Database.getAll<{ id: string, name: string }>('models')
                ]);

                setDealers(allDealers);
                setModels(allModels);

                if (data && data.battery) {
                    const incomingReplacement = data.replacements.find(r => r.newBatteryId === batteryId);
                    const saleRecord = data.sale || data.originalSale;

                    setActiveAsset({
                        battery: data.battery,
                        sale: data.sale,
                        originalSale: data.originalSale,
                        replacement: incomingReplacement
                    });

                    setOriginalDealerId(data.battery.dealerId || '');

                    setFormData({
                        newBatteryId: data.battery.id,
                        model: data.battery.model,
                        dealerId: data.battery.dealerId || saleRecord?.dealerId || (allDealers.length > 0 ? allDealers[0].id : ''),
                        soldDate: data.battery.actualSaleDate || saleRecord?.warrantyStartDate || data.battery.activationDate || '',

                        settlementMethod: (incomingReplacement?.settlementType as any) || 'CREDIT',
                        paidInAccount: incomingReplacement?.paidInAccount || false,
                        replenishmentBatteryId: incomingReplacement?.replenishmentBatteryId || '',
                        warrantyCardStatus: incomingReplacement?.warrantyCardStatus || 'RECEIVED',
                        reason: incomingReplacement?.reason || '',
                        settlementDate: incomingReplacement?.settlementDate || ''
                    });
                }
            } catch (error) {
                console.error("Failed to load battery details", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [batteryId]);

    useEffect(() => {
        const selectedDealer = dealers.find((dealer) => dealer.id === formData.dealerId);
        setDealerQuery(selectedDealer?.name || '');
    }, [formData.dealerId, dealers]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dealerDropdownRef.current && !dealerDropdownRef.current.contains(event.target as Node)) {
                setShowDealerDropdown(false);
                const selectedDealer = dealers.find((dealer) => dealer.id === formData.dealerId);
                setDealerQuery(selectedDealer?.name || '');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dealers, formData.dealerId]);

    const selectedDealer = useMemo(
        () => dealers.find((dealer) => dealer.id === formData.dealerId),
        [dealers, formData.dealerId]
    );

    const filteredDealers = useMemo(() => {
        const query = dealerQuery.trim().toLowerCase();
        if (!query) return dealers;

        return dealers.filter((dealer) =>
            dealer.name?.toLowerCase().includes(query) ||
            dealer.location?.toLowerCase().includes(query) ||
            dealer.id?.toLowerCase().includes(query)
        );
    }, [dealerQuery, dealers]);

    const dealerEditLockReason = useMemo(() => {
        if (!activeAsset?.battery) return null;

        const { battery, sale, replacement } = activeAsset;
        const hasReplacementLinks = !!battery.previousBatteryId || !!battery.nextBatteryId || !!replacement;
        const hasCommercialHistory = !!sale;

        if (battery.status === BatteryStatus.RETURNED || battery.status === BatteryStatus.RETURNED_PENDING) {
            return 'Returned and pending-exchange batteries must keep their original dealer.';
        }

        if (hasReplacementLinks) {
            return 'Dealer cannot be changed after this battery becomes part of a replacement chain.';
        }

        if (hasCommercialHistory) {
            return 'Dealer cannot be changed after the battery is sold or billed.';
        }

        if (battery.status !== BatteryStatus.MANUFACTURED && battery.status !== BatteryStatus.ACTIVE) {
            return `Dealer change is locked for ${battery.status} batteries.`;
        }

        return null;
    }, [activeAsset]);

    const canEditDealer = !dealerEditLockReason;
    const originalSoldDate = activeAsset?.sale?.warrantyStartDate || activeAsset?.battery.actualSaleDate || activeAsset?.battery.activationDate || '';
    const soldDateChanged = originalSoldDate !== formData.soldDate;

    const getChanges = () => {
        const changes: { field: string, old: string, new: string }[] = [];
        if (!activeAsset) return changes;

        // Check Dealer
        const currentDealer = dealers.find(d => d.id === activeAsset.battery.dealerId)?.name || 'None';
        const newDealer = dealers.find(d => d.id === formData.dealerId)?.name || 'None';
        if (canEditDealer && activeAsset.battery.dealerId !== formData.dealerId) {
            changes.push({ field: 'Assigned Dealer', old: currentDealer, new: newDealer });
        }

        // Check Model
        if (activeAsset.battery.model !== formData.model) {
            changes.push({ field: 'Battery Model', old: activeAsset.battery.model || 'Unknown', new: formData.model });
        }

        // Check Sale Date
        if (soldDateChanged) {
            changes.push({ field: 'Sale/Warranty Date', old: originalSoldDate || '(empty)', new: formData.soldDate || '(empty)' });
        }

        // Check Replacements Fields (if applicable)
        if (activeAsset.replacement) {
            if (activeAsset.replacement.settlementType !== formData.settlementMethod) {
                changes.push({ field: 'Settlement Method', old: activeAsset.replacement.settlementType || 'Pending', new: formData.settlementMethod });
            }
            if ((activeAsset.replacement.paidInAccount || false) !== formData.paidInAccount) {
                changes.push({ field: 'Paid In Account', old: activeAsset.replacement.paidInAccount ? 'Yes' : 'No', new: formData.paidInAccount ? 'Yes' : 'No' });
            }
            if ((activeAsset.replacement.replenishmentBatteryId || '') !== formData.replenishmentBatteryId) {
                changes.push({ field: 'Replenishment Unit', old: activeAsset.replacement.replenishmentBatteryId || '(empty)', new: formData.replenishmentBatteryId || '(empty)' });
            }
            if ((activeAsset.replacement.warrantyCardStatus || 'RECEIVED') !== formData.warrantyCardStatus) {
                changes.push({ field: 'Warranty Card Status', old: activeAsset.replacement.warrantyCardStatus || 'RECEIVED', new: formData.warrantyCardStatus });
            }
            if ((activeAsset.replacement.reason || '') !== formData.reason) {
                changes.push({ field: 'Replacement Reason', old: activeAsset.replacement.reason || '(empty)', new: formData.reason || '(empty)' });
            }
            if ((activeAsset.replacement.settlementDate || '') !== formData.settlementDate) {
                changes.push({ field: 'Settlement Date', old: activeAsset.replacement.settlementDate || '(empty)', new: formData.settlementDate || '(empty)' });
            }
        }

        return changes;
    };

    const handleSaveClick = () => {
        if (!activeAsset) return;

        if (!canEditDealer && activeAsset.battery.dealerId !== formData.dealerId) {
            alert(dealerEditLockReason);
            setFormData(prev => ({ ...prev, dealerId: activeAsset.battery.dealerId || '' }));
            return;
        }

        if (soldDateChanged && !formData.soldDate) {
            alert('Sale/Warranty date is required.');
            return;
        }

        if (activeAsset.replacement) {
            const requiresSettlementDate =
                formData.settlementMethod === 'STOCK' ||
                formData.settlementMethod === 'DIRECT' ||
                (formData.settlementMethod === 'CREDIT' && formData.paidInAccount);

            if (requiresSettlementDate && !formData.settlementDate) {
                alert('Settlement date is required before marking this settlement as resolved.');
                return;
            }

            if (formData.settlementMethod === 'STOCK' && !formData.replenishmentBatteryId.trim()) {
                alert('Replenishment Unit ID is required for stock settlement.');
                return;
            }
        }

        const changes = getChanges();
        if (changes.length === 0) {
            alert('No valid changes detected.');
            return;
        }
        setPendingChanges(changes);
        setShowEditConfirm(true);
    };

    const executeSave = async () => {
        setIsSaving(true);
        try {
            if (activeAsset?.battery) {
                await Database.updateBatteryDetails(
                    batteryId,
                    batteryId, // ID unchanged
                    canEditDealer ? formData.dealerId : (activeAsset.battery.dealerId || ''),
                    formData.model
                );
            }

            if (soldDateChanged && formData.soldDate && activeAsset?.battery) {
                await Database.correctSaleDate(
                    batteryId,
                    formData.soldDate,
                    'WARRANTY_CARD',
                    undefined,
                    'Manual Correction via Edit Page'
                );
            }

            if (activeAsset?.replacement) {
                let replId = formData.replenishmentBatteryId;
                let paid = formData.paidInAccount;

                if (formData.settlementMethod === 'DIRECT') {
                    replId = '';
                    paid = false;
                } else if (formData.settlementMethod === 'CREDIT') {
                    replId = '';
                }

                await Database.run(
                    `UPDATE replacements SET 
                        settlementType = ?, 
                        paidInAccount = ?, 
                        replenishmentBatteryId = ?,
                        warrantyCardStatus = ?,
                        reason = ?,
                        settlementDate = ?
                     WHERE id = ?`,
                    [
                        formData.settlementMethod,
                        paid ? 1 : 0,
                        replId,
                        formData.warrantyCardStatus,
                        formData.reason,
                        formData.settlementDate ? formData.settlementDate : null, // ✅ FIX: Convert empty string to NULL
                        activeAsset.replacement.id
                    ]
                );
            }

            if (pendingChanges.length > 0) {
                await Database.logActivity('BATTERY_EDIT', `Edited ${batteryId}: ${pendingChanges.map(c => c.field).join(', ')}`, {
                    batteryId,
                    dealerId: formData.dealerId,
                    dealerName: dealers.find(d => d.id === formData.dealerId)?.name,
                    changes: pendingChanges
                });
            }

            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to update record');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activeAsset?.replacement) return;
        setDeleteLoading(true);
        try {
            const replacementId = activeAsset.replacement.id;
            scheduleUndoableAction({
                label: `Replacement ${replacementId} queued for deletion`,
                description: 'Undo within 5 seconds to keep this replacement record.',
                onCommit: async () => {
                    await Database.deleteReplacement(replacementId);
                    onUpdate();
                    onClose();
                },
                onSuccess: () => window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Replacement deleted successfully' } })),
                onError: (error) => alert(error.message || 'Failed to delete record'),
            });
        } catch (error: any) {
            console.error('Delete Failed:', error);
            alert(error.message || 'Failed to delete record');
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;

    return (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-200/50 animate-in slide-in-from-bottom-6 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600"></div>

            <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Edit Registry Record</h3>
                    <p className="text-xs font-bold text-amber-600 uppercase mt-1 tracking-widest bg-amber-50 px-2 py-1 rounded-md inline-block border border-amber-100">
                        Targeting: {batteryId}
                    </p>
                </div>
                <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-2xl transition-all">
                    <X size={24} />
                </button>
            </div>

            <div className="space-y-8">
                {/* Battery Comparison / Split View */}
                <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    {/* LEFT SIDE: Old Battery / Predecessor */}
                    <div className="bg-slate-50 p-6 flex flex-col justify-center border-r border-slate-200 relative">
                        {activeAsset?.replacement ? (
                            <>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Original Battery (Reference)</p>
                                <p className="text-2xl font-black mono text-rose-600 break-all">{activeAsset.replacement.oldBatteryId}</p>
                                <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase">
                                    Replaced on: <span className="mono text-slate-600">{formatDate(activeAsset.replacement.replacementDate)}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Origin Source</p>
                                <p className="text-xl font-black text-slate-700/50 uppercase">Original Sale / Stock</p>
                                <div className="mt-2 text-[10px] font-bold text-slate-400 uppercase">
                                    Manufactured: <span className="mono text-slate-600">{formatDate(activeAsset?.battery.manufactureDate)}</span>
                                </div>
                            </>
                        )}
                        <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
                            <History size={64} />
                        </div>
                    </div>

                    {/* RIGHT SIDE: To Be Edited (New Battery) */}
                    <div className="bg-emerald-50/50 p-6 flex flex-col justify-center items-end text-right relative overflow-hidden">
                        <div className="absolute left-4 bottom-4 opacity-5 pointer-events-none">
                            <Zap size={64} />
                        </div>
                        <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Current Battery (Editing)</p>
                        <p className="text-3xl font-black mono text-emerald-600 break-all">{batteryId}</p>
                                <div className="mt-2 text-[10px] font-bold text-emerald-700/60 uppercase">
                                    Status: {activeAsset?.battery.status}
                                </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-8">

                    {/* 1. Details Grid */}
                    {/* 1. Details Grid - EDITED FOR DEALER/ID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Assigned Dealer</label>
                            <div ref={dealerDropdownRef} className="relative">
                                <div className={`rounded-xl border bg-slate-50 transition-all overflow-hidden ${canEditDealer && showDealerDropdown ? 'border-blue-400 ring-4 ring-blue-500/10 bg-white shadow-lg' : 'border-slate-200'} ${canEditDealer ? 'hover:border-slate-300' : 'opacity-75'}`}>
                                    <div className="flex items-center gap-3 px-4 pt-3">
                                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                                            <Store size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Dealer</p>
                                            <p className="text-[11px] font-semibold text-slate-500 truncate">
                                                {selectedDealer ? `${selectedDealer.id} • ${selectedDealer.location}` : 'Search by dealer, city, or id'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!canEditDealer}
                                            onClick={() => {
                                                if (!canEditDealer) return;
                                                setShowDealerDropdown(prev => {
                                                    const next = !prev;
                                                    if (next) {
                                                        setDealerQuery('');
                                                    } else {
                                                        setDealerQuery(selectedDealer?.name || '');
                                                    }
                                                    return next;
                                                });
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <ChevronDown size={16} className={`transition-transform ${showDealerDropdown ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>

                                    <div className="relative px-4 pb-3 pt-2.5">
                                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            value={dealerQuery}
                                            readOnly={!canEditDealer}
                                            onFocus={() => canEditDealer && setShowDealerDropdown(true)}
                                            onChange={(e) => {
                                                if (!canEditDealer) return;
                                                setDealerQuery(e.target.value);
                                                setShowDealerDropdown(true);
                                            }}
                                            placeholder={canEditDealer ? "Search dealer..." : "Dealer locked for this battery"}
                                            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2.5 text-[13px] font-bold uppercase tracking-wide text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 read-only:bg-slate-100 read-only:text-slate-500"
                                        />
                                        {selectedDealer && canEditDealer && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, dealerId: '' });
                                                    setDealerQuery('');
                                                    setShowDealerDropdown(true);
                                                }}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                title="Clear dealer"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showDealerDropdown && (
                                    <div className="absolute z-50 left-0 right-0 mt-2 rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] overflow-hidden">
                                        <div className="max-h-[280px] overflow-y-auto p-2">
                                            {filteredDealers.length > 0 ? filteredDealers.map((dealer) => (
                                                <button
                                                    key={dealer.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, dealerId: dealer.id });
                                                        setDealerQuery(dealer.name);
                                                        setShowDealerDropdown(false);
                                                    }}
                                                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-all border ${formData.dealerId === dealer.id
                                                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                        : 'border-transparent hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-black uppercase text-slate-900 truncate">{dealer.name}</p>
                                                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                                                                <MapPin size={11} className="shrink-0" />
                                                                <span className="truncate">{dealer.location || 'No location'}</span>
                                                            </div>
                                                            <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{dealer.id}</p>
                                                        </div>
                                                        {formData.dealerId === dealer.id && (
                                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                                                <Check size={12} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            )) : (
                                                <div className="px-4 py-8 text-center">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">No dealers found</p>
                                                    <p className="mt-1 text-xs font-medium text-slate-500">Try another dealer name, city, or id.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {dealerEditLockReason ? (
                                <p className="text-[10px] font-bold text-slate-500 px-2">
                                    <AlertTriangle size={10} className="inline mr-1" />
                                    {dealerEditLockReason}
                                </p>
                            ) : formData.dealerId !== originalDealerId && (
                                <p className="text-[10px] font-bold text-amber-600 px-2 animate-pulse">
                                    <AlertTriangle size={10} className="inline mr-1" />
                                    Changing dealer will update ownership for this unit and its history steps.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Battery Model</label>
                            <div className="relative">
                                <select
                                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg uppercase outline-none focus:border-amber-500 transition-all text-slate-700 appearance-none"
                                    value={formData.model}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                >
                                    {models.map(m => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                            </div>
                        </div>

                    </div>

                    {/* 2. Sale Date / Warranty Start - CRITICAL */}
                    <div className="p-6 bg-amber-50 rounded-2xl border-2 border-amber-100 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Calendar size={100} /></div>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Calendar size={20} /></div>
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">
                                {activeAsset?.replacement ? 'Warranty Continuation Date' : 'Original Sale Date'}
                            </h4>
                        </div>

                        <div className="space-y-2 relative z-10">
                            <label className="text-[10px] font-bold text-amber-700  ml-1 uppercase tracking-widest">Effective Date</label>
                            <input
                                type="date"
                                className="w-full px-6 py-4 bg-white border-2 border-amber-200 rounded-xl outline-none font-black text-xl text-slate-900 focus:border-amber-500 focus:shadow-lg focus:shadow-amber-500/10 transition-all"
                                value={formData.soldDate}
                                onChange={(e) => setFormData({ ...formData, soldDate: e.target.value })}
                            />
                            <p className="text-[10px] text-amber-800 font-bold mt-2 flex items-center gap-2">
                                <AlertCircle size={12} />
                                Only changed dates are recalculated for this battery chain.
                            </p>
                        </div>
                    </div>

                    {/* 3. Settlement / Replacement Logic */}
                    {activeAsset?.replacement && (
                        <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                    <Store size={18} className="text-blue-600" /> Dealer Settlement (Editing)
                                </h4>
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settlement Date:</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="date"
                                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all uppercase"
                                            value={formData.settlementDate}
                                            onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                                        />
                                        <button
                                            onClick={() => setFormData({ ...formData, settlementDate: '', paidInAccount: false })}
                                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-600 rounded-md transition-all"
                                            title="Undo Settlement (Revert to Pending)"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${formData.settlementMethod === 'CREDIT' ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="settlementMethod" value="CREDIT" className="hidden" checked={formData.settlementMethod === 'CREDIT'} onChange={() => setFormData(prev => ({ ...prev, settlementMethod: 'CREDIT' }))} />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.settlementMethod === 'CREDIT' ? 'border-blue-600' : 'border-slate-300'}`}>
                                            {formData.settlementMethod === 'CREDIT' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${formData.settlementMethod === 'CREDIT' ? 'text-blue-700' : 'text-slate-500'}`}>Account Credit</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-6">Value credited.</p>
                                </label>

                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${formData.settlementMethod === 'STOCK' ? 'bg-indigo-50 border-indigo-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="settlementMethod" value="STOCK" className="hidden" checked={formData.settlementMethod === 'STOCK'} onChange={() => setFormData(prev => ({ ...prev, settlementMethod: 'STOCK' }))} />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.settlementMethod === 'STOCK' ? 'border-indigo-600' : 'border-slate-300'}`}>
                                            {formData.settlementMethod === 'STOCK' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${formData.settlementMethod === 'STOCK' ? 'text-indigo-700' : 'text-slate-500'}`}>Stock Replacement</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-6">Physical battery back.</p>
                                </label>

                                <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${formData.settlementMethod === 'DIRECT' ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="settlementMethod" value="DIRECT" className="hidden" checked={formData.settlementMethod === 'DIRECT'} onChange={() => setFormData(prev => ({ ...prev, settlementMethod: 'DIRECT' }))} />
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.settlementMethod === 'DIRECT' ? 'border-emerald-600' : 'border-slate-300'}`}>
                                            {formData.settlementMethod === 'DIRECT' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                                        </div>
                                        <span className={`font-bold uppercase text-xs ${formData.settlementMethod === 'DIRECT' ? 'text-emerald-700' : 'text-slate-500'}`}>Direct Settlement</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-6">Immediate handover.</p>
                                </label>
                            </div>

                            {formData.settlementMethod === 'STOCK' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider ml-1 flex items-center gap-2">
                                        <Barcode size={14} /> Replenishment Unit ID
                                    </label>
                                    <input
                                        placeholder="SCAN DEALER UNIT..."
                                        className="w-full px-6 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl font-bold text-xl outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-500/10 uppercase transition-all mono placeholder:text-indigo-300 text-indigo-900"
                                        value={formData.replenishmentBatteryId}
                                        onChange={e => setFormData({ ...formData, replenishmentBatteryId: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            )}

                            {formData.settlementMethod === 'CREDIT' && (
                                <div className="p-4 bg-blue-100/50 rounded-xl border border-blue-200 transition-all animate-in fade-in slide-in-from-top-1 cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, paidInAccount: !prev.paidInAccount }))}>
                                    <label className="flex items-center gap-4 cursor-pointer select-none">
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${formData.paidInAccount ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300'}`}>
                                            {formData.paidInAccount && <CheckCircle2 size={16} />}
                                        </div>
                                        <div>
                                            <span className="text-xs font-black text-blue-900 uppercase block">Mark as Paid?</span>
                                            <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">Tick to confirm payment settled</span>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        {/* {activeAsset?.replacement && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-5 bg-rose-50 text-rose-600 border border-rose-100 font-bold uppercase tracking-widest text-xs hover:bg-rose-100 hover:border-rose-200 rounded-xl transition-all flex items-center gap-2"
                                title="Delete this record and revert changes"
                            >
                                <Trash2 size={18} />
                            </button>
                        )} */}

                        <button onClick={onClose} className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                            Cancel
                        </button>
                        <button onClick={handleSaveClick} disabled={isSaving} className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black py-5 rounded-xl hover:from-black hover:to-slate-900 transition-all uppercase text-sm tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transform active:scale-[0.99] disabled:opacity-50">
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <DeleteConfirmation
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    isLoading={deleteLoading}
                />
            )}

            {showEditConfirm && (
                <EditConfirmation
                    changes={pendingChanges}
                    onConfirm={executeSave}
                    onCancel={() => setShowEditConfirm(false)}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
};

export default BatteryEdit;
