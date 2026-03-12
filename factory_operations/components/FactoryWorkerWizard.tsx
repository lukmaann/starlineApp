import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, Calendar, CheckCircle2, ChevronRight, Hash, Phone, ShieldPlus, User, AlertCircle, Fingerprint, BadgeCheck, X, UserSquare2, Loader2, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const getLocalDate = () => new Date().toISOString().slice(0, 10);

export interface FactoryWorkerFormData {
    enrollment_no: string;
    full_name: string;
    gender: string;
    phone: string;
    join_date: string;
    date_of_birth?: string; // Phase 2: Added DOB
    base_salary: string;
    emergency_contact: string;
    status: 'ACTIVE' | 'INACTIVE';
    passkey_credential?: string | null; // Added passkey_credential
}

interface FactoryWorkerWizardProps {
    initialData?: FactoryWorkerFormData | null;
    generatedEnrollment: string;
    onCancel: () => void;
    onComplete: (data: FactoryWorkerFormData) => Promise<void>;
}

export const FactoryWorkerWizard: React.FC<FactoryWorkerWizardProps> = ({
    initialData,
    generatedEnrollment,
    onCancel,
    onComplete,
}) => {
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState<FactoryWorkerFormData>(initialData || {
        enrollment_no: generatedEnrollment,
        full_name: '',
        gender: '',
        phone: '',
        join_date: getLocalDate(),
        date_of_birth: '',
        base_salary: '',
        emergency_contact: '',
        status: 'ACTIVE'
    });

    const [useTouchId, setUseTouchId] = useState(!!initialData?.passkey_credential);
    const [capturedCredential, setCapturedCredential] = useState<string | null>(initialData?.passkey_credential || null);
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setUseTouchId(!!initialData.passkey_credential);
            setCapturedCredential(initialData.passkey_credential || null);
        } else {
            setFormData({
                enrollment_no: generatedEnrollment,
                full_name: '',
                gender: '',
                phone: '',
                join_date: getLocalDate(), // Auto-set join_date invisibly
                date_of_birth: '',
                base_salary: '',
                emergency_contact: '',
                status: 'ACTIVE',
            });
            setUseTouchId(false);
            setCapturedCredential(null);
        }
    }, [initialData, generatedEnrollment]);

    const handleNext = () => {
        setError('');
        if (step === 0 && !formData.full_name.trim()) {
            setError('Worker name is required.');
            return;
        }
        if (step === 0 && !formData.gender.trim()) {
            setError('Gender is required.');
            return;
        }
        if (step === 0 && !formData.phone.trim()) {
            setError('Phone number is required.');
            return;
        }
        if (step === 0 && !formData.emergency_contact.trim()) {
            setError('Emergency contact is required.');
            return;
        }
        if (step === 1 && !formData.base_salary.trim()) {
            setError('Base salary is required.');
            return;
        }

        if (step < 2) {
            setStep((s) => s + 1);
            return;
        }

        handleFinish();
    };

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            await onComplete({ ...formData, passkey_credential: useTouchId ? capturedCredential : null });
        } catch (err: any) {
            setError(err?.message || 'Failed to save worker.');
            setIsSubmitting(false);
        }
    };

    const registerTouchId = async () => {
        setIsCapturing(true);
        try {
            if (!formData.full_name) {
                toast.error('Please enter the worker name first before scanning fingerprint.');
                setIsCapturing(false);
                return;
            }

            if (!window.PublicKeyCredential) {
                toast.error('WebAuthn/Touch ID is not supported on this browser or device.');
                setIsCapturing(false);
                return;
            }

            // Create a randomized user ID for the strict WebAuthn requirement
            const randomUserId = new Uint8Array(16);
            crypto.getRandomValues(randomUserId);

            // A randomized challenge
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: {
                        name: "Starline Enterprise",
                    },
                    user: {
                        id: randomUserId,
                        name: formData.enrollment_no,
                        displayName: formData.full_name,
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" }, // ES256
                        { alg: -257, type: "public-key" } // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform", // Forces Touch ID/Face ID/Windows Hello
                        userVerification: "discouraged" // Changed from 'required' to 'discouraged' temporarily to see if it unblocks Safari/Chrome local test
                    },
                    attestation: "none"
                }
            }) as PublicKeyCredential;

            if (credential) {
                // We need to store just enough to verify them later without full strict auth,
                // Or simply their credential ID to pass back into navigator.credentials.get
                const credString = JSON.stringify({
                    id: credential.id,
                    rawId: Array.from(new Uint8Array(credential.rawId)),
                    type: credential.type,
                });

                setCapturedCredential(credString);
                toast.success('Touch ID fingerprint registered successfully!');
            }
        } catch (error: any) {
            console.error('Touch ID Registration Error:', error);
            if (error.name === 'NotAllowedError') {
                toast.error('Fingerprint scan was canceled or failed.');
            } else {
                toast.error('Error: ' + error.message);
                alert("Touch ID Error: " + error.message);
            }
        } finally {
            setIsCapturing(false);
        }
    };

    const steps = [
        { title: 'Identity', icon: Hash },
        { title: 'Joining', icon: Briefcase },
        { title: 'Review', icon: BadgeCheck },
    ];

    return createPortal(
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 font-sans">
            {/* Header Navigation */}
            <div className="sticky top-0 bg-white border-b border-slate-100 z-10 px-6 flex items-center justify-between h-16">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-widest">Step {step + 1} of 3</span>
                    <span className="text-xs font-semibold text-slate-400 ml-2">{step === 0 ? 'Identity' : step === 1 ? 'Joining Details' : 'Review & Confirm'}</span>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="max-w-2xl mx-auto py-12 px-6">
                {/* Header Title Area */}
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl mb-6">
                        <UserSquare2 size={28} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {initialData ? 'Update Worker' : 'New Enrollment'}
                    </h1>
                </div>

                {/* Main Form Area */}
                <div className="text-left w-full max-w-lg mx-auto min-h-[300px]">
                    {step === 0 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Enrollment No</label>
                                    <input
                                        readOnly
                                        className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none uppercase cursor-not-allowed"
                                        value={formData.enrollment_no}
                                    />
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        autoFocus
                                        placeholder="Full Name"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                    <select
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase appearance-none cursor-pointer"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                    <input
                                        placeholder="Phone"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emergency Contact</label>
                                    <input
                                        placeholder="Emergency"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase placeholder:text-slate-300"
                                        value={formData.emergency_contact}
                                        onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                                    />
                                </div>
                            </div>
                            {/* Touch ID Biometric Section */}
                            <div className="pt-6 border-t border-slate-100">
                                <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                    <div className="mt-0.5">
                                        <input
                                            type="checkbox"
                                            id="touchIdToggle"
                                            checked={useTouchId}
                                            onChange={(e) => {
                                                if (!e.target.checked) setCapturedCredential(null);
                                                setUseTouchId(e.target.checked);
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="touchIdToggle" className="text-sm font-bold text-slate-900 block cursor-pointer">Enable Touch ID Biometrics</label>
                                        <p className="text-xs text-slate-500 font-medium mt-1">Allow this worker to clock in/out using the Mac's built-in fingerprint sensor instead of an external scanner.</p>

                                        {useTouchId && (
                                            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 flex flex-col gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${capturedCredential ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        <Fingerprint size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{capturedCredential ? 'Fingerprint Registered' : 'No Fingerprint Configured'}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{capturedCredential ? 'Worker can now scan to mark attendance.' : 'Click below to scan for the first time.'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={registerTouchId}
                                                    disabled={isCapturing}
                                                    className={`py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2
                                                    ${capturedCredential
                                                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            : 'bg-slate-900 text-white hover:bg-black focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 disabled:opacity-50'}`}
                                                >
                                                    {isCapturing ? 'Scanning...' : capturedCredential ? 'Rescan Fingerprint' : 'Scan Fingerprint Now'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="group space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase"
                                        value={formData.date_of_birth || ''}
                                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                    />
                                </div>
                                <div className="group space-y-2 col-span-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-base text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all uppercase appearance-none cursor-pointer"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Base Salary</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₹</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-900 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-300"
                                        value={formData.base_salary}
                                        onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                                <div className="p-8 text-center border-b border-slate-200 bg-white">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Base Salary</p>
                                    <p className="text-5xl font-black text-slate-900 tracking-tight">₹{Number(formData.base_salary || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="p-8 space-y-5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enrollment No</span>
                                        <span className="text-sm font-bold text-slate-900 uppercase">{formData.enrollment_no}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Name</span>
                                        <span className="text-sm font-bold text-slate-900 uppercase">{formData.full_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date of Birth</span>
                                        <span className="text-sm font-bold text-slate-900 uppercase">{formData.date_of_birth || '—'}</span>
                                    </div>
                                    {useTouchId && (
                                        <div className="flex justify-between items-center border-t border-slate-200/60 pt-5">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Touch ID</span>
                                            <span className="text-sm font-bold text-slate-900 uppercase">{capturedCredential ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="mt-12 flex items-center justify-between w-full max-w-lg mx-auto relative flex-col gap-4">
                    {error && (
                        <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-4 py-2 rounded-md border border-rose-100 uppercase animate-in fade-in w-full text-center">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between w-full">
                        <button
                            onClick={() => step > 0 ? setStep(s => s - 1) : onCancel()}
                            className="px-6 py-4 rounded-xl text-slate-500 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
                        >
                            {step === 0 ? 'Cancel' : 'Back'}
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {step === 2 ? (isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />) : 'Continue'}
                            {step === 2 ? (isSubmitting ? 'Saving...' : 'Confirm') : <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
