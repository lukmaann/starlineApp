import React, { useState, useEffect } from 'react';
import {
    Store, MapPin, CheckCircle2, Phone, User,
    ArrowLeft, ArrowRight, ShieldCheck, Check,
    Building, Hash, Loader2
} from 'lucide-react';
import { Dealer } from '../types';

interface DealerWizardProps {
    onCancel: () => void;
    onComplete: (data: any) => Promise<void>;
    dealers: Dealer[];
    initialData?: Dealer | null;
    generatedId: string;
}

export const DealerWizard: React.FC<DealerWizardProps> = ({
    onCancel,
    onComplete,
    dealers,
    initialData,
    generatedId
}) => {
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        owner: '',
        contact: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });

    useEffect(() => {
        if (initialData) {
            const locParts = (initialData.location || "").split(/, | - /);
            setFormData({
                name: initialData.name,
                owner: initialData.ownerName,
                address: initialData.address,
                contact: initialData.contact,
                city: locParts[0] || "",
                state: locParts[1] || "",
                pincode: locParts[2] || ""
            });
        }
    }, [initialData]);

    const handleNext = () => {
        setError('');
        if (step === 0) {
            if (!formData.name || !formData.contact) {
                setError('Name and Contact are required');
                return;
            }
            const isDuplicate = dealers.some(d =>
                d.name.trim().toUpperCase() === formData.name.trim().toUpperCase() &&
                d.id !== (initialData?.id || generatedId)
            );
            if (isDuplicate) {
                setError('This dealer name already exists');
                return;
            }
        }
        if (step === 1) {
            if (!formData.city || !formData.state) {
                setError('City and State are required');
                return;
            }
        }
        if (step < 2) setStep(s => s + 1);
        else handleFinish();
    };

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            await onComplete(formData);
        } catch (err: any) {
            setError(err.message || 'Failed to save dealer');
            setIsSubmitting(false);
        }
    };

    const steps = [
        { title: 'Details', icon: Store },
        { title: 'Location', icon: MapPin },
        { title: 'Confirm', icon: CheckCircle2 }
    ];

    return (
        <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-10">
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                    {initialData ? 'Update Dealer' : 'New Dealer Enrollment'}
                </h1>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-2">
                    {initialData ? 'Modify partner information' : 'Register a new authorized partner'}
                </p>

                {/* Simple Stepper */}
                <div className="flex items-center gap-3 mt-8">
                    {steps.map((s, idx) => (
                        <div key={idx} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-md flex items-center justify-center border transition-all duration-300 ${idx < step ? 'bg-slate-900 border-slate-900 text-white' :
                                        idx === step ? 'bg-white border-slate-900 text-slate-900 ring-4 ring-slate-100' :
                                            'bg-slate-50 border-slate-200 text-slate-300'
                                    }`}
                            >
                                {idx < step ? <Check size={14} strokeWidth={3} /> : <s.icon size={14} />}
                            </div>
                            {idx < steps.length - 1 && (
                                <div className={`w-10 h-px mx-1 ${idx < step ? 'bg-slate-900' : 'bg-slate-100'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Form Area */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
                <div className="p-8 pb-4">
                    {step === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                                <input
                                    autoFocus
                                    placeholder="e.g. STARLINE BATTERIES"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Owner Name</label>
                                    <input
                                        placeholder="Full Name"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.owner}
                                        onChange={e => setFormData({ ...formData, owner: e.target.value })}
                                    />
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                                    <input
                                        placeholder="Phone"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.contact}
                                        onChange={e => setFormData({ ...formData, contact: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
                                <textarea
                                    rows={2}
                                    placeholder="Shop No, Street, Area"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">City</label>
                                    <input
                                        placeholder="City"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    />
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">State</label>
                                    <input
                                        placeholder="State"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.state}
                                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                                    />
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pincode</label>
                                    <input
                                        placeholder="Pincode"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.pincode}
                                        onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 mb-2">
                                <ShieldCheck size={32} />
                            </div>

                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-900 uppercase">Confirm Details</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify information before saving</p>
                            </div>

                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mt-4">
                                <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center px-6">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dealer ID</span>
                                    <span className="text-[10px] font-bold text-slate-900 uppercase">{initialData?.id || generatedId}</span>
                                </div>
                                <div className="p-5 space-y-4 text-left">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Business</div>
                                        <div className="text-xs font-bold text-slate-900 uppercase">{formData.name}</div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Owner</div>
                                        <div className="text-xs font-bold text-slate-900 uppercase">{formData.owner}</div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location</div>
                                        <div className="text-xs font-bold text-slate-900 uppercase">{formData.city}, {formData.state}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 pt-2 flex flex-col items-center gap-4">
                    {error && (
                        <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-4 py-2 rounded-md border border-rose-100 uppercase animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between w-full border-t border-slate-100 pt-6">
                        <button
                            onClick={() => step > 0 ? setStep(s => s - 1) : onCancel()}
                            className="px-6 py-2.5 text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-md transition-all"
                        >
                            {step === 0 ? 'Cancel' : 'Back'}
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-slate-900 text-white rounded-md font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {step === 2 ? (isSubmitting ? 'Saving...' : 'Confirm & Save') : 'Continue'}
                            {!isSubmitting && step < 2 && <ArrowRight size={14} />}
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
