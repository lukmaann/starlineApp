import React from 'react';
import { Calendar, X, CheckCircle2, CheckCircle, Loader2 } from 'lucide-react';
import { formatDate } from '../../utils';
import { WarrantyCalculator } from '../../utils/warrantyCalculator';
import { WarrantyStatus } from '../../types';

interface WarrantyCorrectionFormProps {
    isExp: boolean;
    showDateCorrection: boolean;
    setShowDateCorrection: (show: boolean) => void;
    isSessionValid: boolean;
    activeAsset: any;
    correctedSaleDate: string;
    setCorrectedSaleDate: (date: string) => void;
    handleDateCorrectionChange: (date: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    warrantyProofFile: File | null;
    setWarrantyProofFile: (file: File | null) => void;
    warrantyCalculation: any;
    setWarrantyCalculation: (calc: any) => void;
    handleApplyDateCorrection: () => void;
    isApplyingCorrection: boolean;
}

export const WarrantyCorrectionForm: React.FC<WarrantyCorrectionFormProps> = ({
    isExp,
    showDateCorrection,
    setShowDateCorrection,
    isSessionValid,
    activeAsset,
    correctedSaleDate,
    setCorrectedSaleDate,
    handleDateCorrectionChange,
    handleFileUpload,
    warrantyProofFile,
    setWarrantyProofFile,
    warrantyCalculation,
    setWarrantyCalculation,
    handleApplyDateCorrection,
    isApplyingCorrection
}) => {
    if (!showDateCorrection || !isSessionValid || !isExp) return null;

    return (
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-8 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-amber-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Calendar className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Warranty Date Correction</h3>
                        <p className="text-xs text-amber-600 uppercase tracking-wider">Enter actual customer sale date from warranty card</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setShowDateCorrection(false);
                        setCorrectedSaleDate('');
                        setWarrantyCalculation(null);
                        setWarrantyProofFile(null);
                    }}
                    className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                >
                    <X className="text-amber-600" size={20} />
                </button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Current Activation Date</p>
                        <p className="text-lg font-black text-slate-900 mono">{formatDate(activeAsset.battery.activationDate)}</p>
                        <p className="text-xs text-slate-500 mt-1">Warranty Expires: {formatDate(activeAsset.battery.warrantyExpiry)}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <p className="text-xs font-bold text-amber-600 uppercase mb-2">Actual Sale Date (from Card)</p>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border-2 border-amber-300 rounded-lg font-bold text-lg text-slate-900 focus:border-amber-500 focus:outline-none transition-all"
                            value={correctedSaleDate}
                            onChange={(e) => handleDateCorrectionChange(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">Upload Warranty Card Proof (Optional)</label>
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileUpload}
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 transition-all"
                        />
                    </div>
                    {warrantyProofFile && (
                        <p className="text-xs text-emerald-600 flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            File uploaded: {warrantyProofFile.name}
                        </p>
                    )}
                </div>

                {warrantyCalculation && (
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="text-emerald-600" size={24} />
                            <h4 className="font-black text-emerald-900 uppercase tracking-tight">Recalculated Warranty</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">New Expiry Date</p>
                                <p className="text-2xl font-black text-emerald-600 mono">{formatDate(warrantyCalculation.effectiveExpiryDate)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Warranty Status</p>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border-2 ${WarrantyCalculator.getStatusColorClass(warrantyCalculation.status)}`}>
                                        {WarrantyCalculator.getStatusText(warrantyCalculation.status)}
                                    </span>
                                    {warrantyCalculation.isInGracePeriod && (
                                        <span className="text-xs text-amber-600 font-bold">⚠️ Grace Period</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {warrantyCalculation.status === WarrantyStatus.VALID && (
                            <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-200">
                                <p className="text-xs text-emerald-700 font-bold flex items-center gap-2">
                                    <CheckCircle2 size={14} />
                                    This battery is now VALID for warranty replacement!
                                </p>
                            </div>
                        )}

                        {warrantyCalculation.isInGracePeriod && (
                            <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
                                <p className="text-xs text-amber-800 font-bold">
                                    ⚠️ Grace period ends on: {formatDate(warrantyCalculation.gracePeriodEndsOn)}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={() => {
                            setShowDateCorrection(false);
                            setCorrectedSaleDate('');
                            setWarrantyCalculation(null);
                            setWarrantyProofFile(null);
                        }}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApplyDateCorrection}
                        disabled={!correctedSaleDate || !warrantyCalculation || isApplyingCorrection}
                        className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isApplyingCorrection ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Applying...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Apply Correction
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
