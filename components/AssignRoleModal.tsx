import React, { useState, useEffect, useRef } from 'react';
import { UserRole } from '../types';
import { Database } from '../db';
import { X, Shield, Lock, User as UserIcon, Loader2, BadgeCheck, Users } from 'lucide-react';

interface AssignRoleModalProps {
    onCancel: () => void;
    onComplete: (data: { workerId?: string; username: string; password?: string; role: UserRole }) => Promise<void>;
    existingUserToEdit?: any | null;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({ onCancel, onComplete, existingUserToEdit }) => {
    const [workers, setWorkers] = useState<any[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [loadingWorkers, setLoadingWorkers] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        workerId: '',
        username: existingUserToEdit?.username || '',
        password: '',
        role: existingUserToEdit?.role || UserRole.FACTORY_WORKER
    });
    const loginDetailsRef = useRef<HTMLDivElement | null>(null);
    const passwordInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchWorkers = async () => {
            // We only need this if creating a new user binding.
            // If editing, they already have a username, we just update pass or role.
            if (!existingUserToEdit) {
                try {
                    const fetchedUsers = await Database.getUsers();
                    setExistingUsers(fetchedUsers);
                    const allWorkers = await Database.getFactoryWorkers();
                    const assignedUsernames = new Set(
                        fetchedUsers.map((user) => user.username.trim().toLowerCase())
                    );
                    const availableWorkers = allWorkers.filter((worker) => {
                        const normalizedName = worker.full_name.toLowerCase().replace(/\s+/g, '');
                        return !assignedUsernames.has(normalizedName);
                    });
                    setWorkers(availableWorkers);
                } catch (e) {
                    console.error("Failed to load workers", e);
                }
            } else {
                try {
                    const fetchedUsers = await Database.getUsers();
                    setExistingUsers(fetchedUsers);
                } catch (e) {
                    console.error("Failed to load users", e);
                }
            }
            setLoadingWorkers(false);
        };
        fetchWorkers();
    }, [existingUserToEdit]);

    const normalizedUsername = formData.username.trim().toLowerCase();
    const usernameTaken = normalizedUsername.length > 0 && existingUsers.some((user) =>
        user.username.trim().toLowerCase() === normalizedUsername && user.id !== existingUserToEdit?.id
    );
    const canShowLoginDetails = Boolean(existingUserToEdit || formData.workerId);
    const isWorkerBoundUsername = !existingUserToEdit && Boolean(formData.workerId) && formData.workerId !== 'NEW_STANDALONE';
    const canSubmit = !isSubmitting
        && Boolean(existingUserToEdit || formData.workerId)
        && !usernameTaken
        && Boolean(formData.username.trim())
        && (existingUserToEdit ? true : Boolean(formData.password));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameTaken) return;
        setIsSubmitting(true);
        await onComplete(formData);
        setIsSubmitting(false);
    };

    const selectedWorker = workers.find((worker) => worker.id === formData.workerId);

    useEffect(() => {
        if (!canShowLoginDetails || existingUserToEdit) return;

        const timeoutId = window.setTimeout(() => {
            loginDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            passwordInputRef.current?.focus();
        }, 120);

        return () => window.clearTimeout(timeoutId);
    }, [canShowLoginDetails, formData.workerId, existingUserToEdit]);

    return (
        <div className="bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.08),_transparent_40%),linear-gradient(135deg,#ffffff,#f8fafc)] px-8 py-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            {existingUserToEdit ? 'Edit user access' : 'Assign user role'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {existingUserToEdit ? 'Update login details and access level.' : 'Create access for a worker or add a standalone user.'}
                        </p>
                    </div>
                </div>
                <button onClick={onCancel} className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50/60 p-8">
                {/* Worker Selection (Only for New Assignments) */}
                {!existingUserToEdit && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="mx-auto max-w-2xl">
                            <div className="mb-4 flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Worker profile</h4>
                                    <p className="mt-1 text-sm text-slate-500">Choose an existing factory worker or create a standalone user.</p>
                                </div>
                            </div>
                            {loadingWorkers ? (
                                <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-5"><Loader2 size={16} className="animate-spin text-slate-400" /></div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <label className="mb-2 block text-xs font-medium text-slate-500">Select factory worker</label>
                                        <select
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white"
                                            value={formData.workerId}
                                            onChange={e => {
                                                const wid = e.target.value;
                                                setFormData(prev => ({ ...prev, workerId: wid }));

                                                if (wid && !formData.username) {
                                                    const w = workers.find(x => x.id === wid);
                                                    if (w) setFormData(prev => ({ ...prev, workerId: wid, username: w.full_name.toLowerCase().replace(/\s+/g, '') }));
                                                }
                                            }}
                                        >
                                            <option value="">Choose a worker profile</option>
                                            {workers.map(w => (
                                                <option key={w.id} value={w.id}>{w.full_name} ({w.enrollment_no})</option>
                                            ))}
                                            <option value="NEW_STANDALONE">Create standalone user</option>
                                        </select>
                                    </div>

                                    {selectedWorker && formData.workerId !== 'NEW_STANDALONE' && (
                                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <p className="text-xs font-medium text-slate-500">Selected worker</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedWorker.full_name}</p>
                                            <p className="mt-1 text-xs text-slate-500">{selectedWorker.enrollment_no}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {canShowLoginDetails && (
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <div ref={loginDetailsRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5">
                                <h4 className="text-sm font-semibold text-slate-900">Login details</h4>
                                <p className="mt-1 text-sm text-slate-500">Set the username and password for this account.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-500">Login ID</label>
                                    <div className="relative group">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                        <input
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                                            placeholder="e.g. johnsmith"
                                            value={formData.username}
                                            disabled={isWorkerBoundUsername}
                                            onChange={e => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, '') })}
                                        />
                                    </div>
                                    {isWorkerBoundUsername && (
                                        <p className="text-xs font-medium text-slate-500">Username is locked for selected worker profiles.</p>
                                    )}
                                    {usernameTaken && (
                                        <p className="text-xs font-medium text-rose-600">This username already exists. Please choose a different one.</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>Access Password</span>
                                        {existingUserToEdit && <span className="text-indigo-500">Leave empty to keep current</span>}
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                        <input
                                            ref={passwordInputRef}
                                            type="password"
                                            required={!existingUserToEdit}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5">
                                <h4 className="text-sm font-semibold text-slate-900">Access role</h4>
                                <p className="mt-1 text-sm text-slate-500">Choose what this user can do in the app.</p>
                            </div>

                            <div className="space-y-3">
                                {[UserRole.FACTORY_WORKER, UserRole.ADMIN].map(role => (
                                    <button
                                        type="button"
                                        key={role}
                                        onClick={() => setFormData({ ...formData, role: role as UserRole })}
                                        className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${formData.role === role
                                            ? role === UserRole.ADMIN ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/20'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${formData.role === role ? 'bg-white/15' : 'bg-white'}`}>
                                                {role === UserRole.ADMIN ? <Shield size={16} /> : <BadgeCheck size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{role === UserRole.ADMIN ? 'Admin' : 'Factory worker'}</p>
                                                <p className={`mt-1 text-xs ${formData.role === role ? 'text-white/75' : 'text-slate-500'}`}>
                                                    {role === UserRole.ADMIN ? 'Full access to app controls' : 'Operational access for daily use'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {!existingUserToEdit && (
                                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-medium text-slate-500">Account type</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                        {formData.workerId === 'NEW_STANDALONE' ? 'Standalone user' : 'Worker-linked user'}
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {(existingUserToEdit || formData.workerId) && (
                    <div className="flex gap-3 border-t border-slate-100 pt-6">
                        <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-slate-50 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100">Cancel</button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (existingUserToEdit ? 'Update Details' : 'Assign & Create')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};
