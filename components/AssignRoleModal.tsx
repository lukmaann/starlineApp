import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Database } from '../db';
import { X, Shield, Lock, User as UserIcon, Loader2 } from 'lucide-react';

interface AssignRoleModalProps {
    onCancel: () => void;
    onComplete: (data: { workerId?: string; username: string; password?: string; role: UserRole }) => Promise<void>;
    existingUserToEdit?: any | null;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({ onCancel, onComplete, existingUserToEdit }) => {
    const [workers, setWorkers] = useState<any[]>([]);
    const [loadingWorkers, setLoadingWorkers] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        workerId: '',
        username: existingUserToEdit?.username || '',
        password: '',
        role: existingUserToEdit?.role || UserRole.FACTORY_WORKER
    });

    useEffect(() => {
        const fetchWorkers = async () => {
            // We only need this if creating a new user binding.
            // If editing, they already have a username, we just update pass or role.
            if (!existingUserToEdit) {
                try {
                    const allWorkers = await Database.getFactoryWorkers();
                    setWorkers(allWorkers);
                } catch (e) {
                    console.error("Failed to load workers", e);
                }
            }
            setLoadingWorkers(false);
        };
        fetchWorkers();
    }, [existingUserToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onComplete(formData);
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white animate-in slide-in-from-top-4 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                            {existingUserToEdit ? 'Edit Credentials' : 'Assign Role'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                            {existingUserToEdit ? 'Update existing user profile' : 'Bind access to a worker'}
                        </p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-w-2xl mx-auto">
                {/* Worker Selection (Only for New Assignments) */}
                {!existingUserToEdit && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Factory Worker</label>
                        {loadingWorkers ? (
                            <div className="p-3 bg-slate-50 rounded-xl flex justify-center"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                        ) : (
                            <select
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase"
                                value={formData.workerId}
                                onChange={e => {
                                    const wid = e.target.value;
                                    setFormData(prev => ({ ...prev, workerId: wid }));

                                    // Auto-fill username if empty and worker selected
                                    if (wid && !formData.username) {
                                        const w = workers.find(x => x.id === wid);
                                        if (w) setFormData(prev => ({ ...prev, workerId: wid, username: w.enrollment_no }));
                                    }
                                }}
                            >
                                <option value="">-- Choose a Worker Profile --</option>
                                {workers.map(w => (
                                    <option key={w.id} value={w.id}>{w.full_name} ({w.enrollment_no})</option>
                                ))}
                                <option value="NEW_STANDALONE">+ Create Standalone Admin/User (No Worker Profile)</option>
                            </select>
                        )}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login ID (Username)</label>
                        <div className="relative group">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input
                                required
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase"
                                placeholder="e.g. SL-1001"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, '') })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                            <span>Access Password</span>
                            {existingUserToEdit && <span className="text-indigo-400">Leave empty to keep current</span>}
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input
                                type="password"
                                required={!existingUserToEdit}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorization Level</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[UserRole.FACTORY_WORKER, UserRole.ADMIN].map(role => (
                                <button
                                    type="button"
                                    key={role}
                                    onClick={() => setFormData({ ...formData, role: role as UserRole })}
                                    className={`py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${formData.role === role
                                        ? role === UserRole.ADMIN ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/30' : 'bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-900/30'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {role.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-3">
                    <button type="button" onClick={onCancel} className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-100 transition-all">Cancel</button>
                    <button
                        type="submit"
                        disabled={isSubmitting || (!existingUserToEdit && !formData.workerId)}
                        className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (existingUserToEdit ? 'Update Details' : 'Assign & Create')}
                    </button>
                </div>
            </form>
        </div>
    );
};
