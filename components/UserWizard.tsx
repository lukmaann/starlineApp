import React, { useState, useEffect } from 'react';
import {
    Shield, Key, CheckCircle2,
    ArrowRight, Check,
    Loader2, User as UserIcon
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UserWizardProps {
    onCancel: () => void;
    onComplete: (data: { username: string, role: UserRole, password?: string }) => Promise<void>;
    users: User[];
    initialData?: User | null;
}

export const UserWizard: React.FC<UserWizardProps> = ({
    onCancel,
    onComplete,
    users,
    initialData
}) => {
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        role: UserRole.FACTORY_WORKER,
        password: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                username: initialData.username,
                role: initialData.role,
                password: '',
            });
        }
    }, [initialData]);

    const handleNext = () => {
        setError('');
        if (step === 0) {
            if (!formData.username) {
                setError('Username is required');
                return;
            }
            const isDuplicate = users.some(u =>
                u.username.trim().toLowerCase() === formData.username.trim().toLowerCase() &&
                u.id !== initialData?.id
            );
            if (isDuplicate) {
                setError('This username already exists');
                return;
            }
        }
        if (step === 1) {
            if (!initialData && !formData.password) {
                setError('Password is required for new users');
                return;
            }
        }
        if (step < 2) setStep(s => s + 1);
        else handleFinish();
    };

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            await onComplete({
                username: formData.username,
                role: formData.role,
                password: formData.password || undefined
            });
        } catch (err: any) {
            setError(err.message || 'Failed to save user');
            setIsSubmitting(false);
        }
    };

    const steps = [
        { title: 'Account', icon: UserIcon },
        { title: 'Security', icon: Key },
        { title: 'Confirm', icon: CheckCircle2 }
    ];

    return (
        <div className="max-w-2xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-10">
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">
                    {initialData ? 'Update User Access' : 'New User Registration'}
                </h1>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-2">
                    {initialData ? 'Modify roles and credentials' : 'Add an authorized system user'}
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
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                <input
                                    autoFocus
                                    placeholder="e.g. jdoe"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all uppercase placeholder:text-slate-300"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>

                            <div className="group space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Role</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-slate-900 transition-all font-bold text-sm text-slate-900 uppercase"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                    <option value={UserRole.ADMIN}>ADMIN (Full Access)</option>
                                    <option value={UserRole.FACTORY_WORKER}>FACTORY WORKER (Limited)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="group space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                                    {initialData ? 'New Password (Optional)' : 'Security Clearance Password'}
                                </label>
                                <input
                                    type="password"
                                    autoFocus
                                    placeholder={initialData ? "Leave blank to keep current" : "Enter robust password"}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-bold text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-300 placeholder:uppercase"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 mb-2">
                                <Shield size={32} />
                            </div>

                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-900 uppercase">Confirm Access</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify authorization before provisioning</p>
                            </div>

                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mt-4">
                                <div className="p-3 bg-white border-b border-slate-200 flex justify-between items-center px-6">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">User ID</span>
                                    <span className="text-[10px] font-bold text-slate-900 uppercase">{initialData?.id || 'GENERATED_ON_SAVE'}</span>
                                </div>
                                <div className="p-5 space-y-4 text-left">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Username</div>
                                        <div className="text-xs font-bold text-slate-900 uppercase">{formData.username}</div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Role Assigned</div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${formData.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                                            {formData.role.replace('_', ' ')}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Credentials</div>
                                        <div className="text-xs font-bold text-slate-900 uppercase">
                                            {formData.password ? 'Updated' : (initialData ? 'Retained' : 'Required')}
                                        </div>
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
                            {step === 2 ? (isSubmitting ? 'Provisioning...' : 'Confirm & Save') : 'Continue'}
                            {!isSubmitting && step < 2 && <ArrowRight size={14} />}
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
