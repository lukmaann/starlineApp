import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Edit2, Shield, Loader2, Search, RefreshCw, Users, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AssignRoleModal } from './AssignRoleModal';
import { scheduleUndoableAction } from '../utils/undoToast';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: UserRole.FACTORY_WORKER
    });

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await Database.getUsers();
            setUsers(data);
        } catch (e) {
            toast.error('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || (!editingUser && !formData.password)) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsActionLoading(true);
        try {
            if (editingUser) {
                await Database.updateUser({
                    id: editingUser.id,
                    username: formData.username,
                    role: formData.role,
                    password: formData.password || undefined
                });
                toast.success('User updated successfully');
            } else {
                await Database.addUser({
                    username: formData.username,
                    password: formData.password,
                    role: formData.role
                });
                toast.success('User created successfully');
            }
            setShowAddForm(false);
            setEditingUser(null);
            setFormData({ username: '', password: '', role: UserRole.FACTORY_WORKER });
            loadUsers();
        } catch (e: any) {
            toast.error(e.message || 'Operation failed');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (username === 'admin') {
            toast.error('Cannot delete the primary admin account');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

        try {
            scheduleUndoableAction({
                label: `User ${username} queued for deletion`,
                description: 'Undo within 5 seconds to keep this account.',
                onCommit: async () => {
                    await Database.deleteUser(id);
                    await loadUsers();
                },
                onSuccess: () => toast.success('User deleted'),
                onError: () => toast.error('Failed to delete user'),
            });
        } catch (e) {
            toast.error('Failed to delete user');
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            role: user.role
        });
        setShowAddForm(true);
    };

    if (isLoading) return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
    );

    const filteredUsers = users.filter((u) => {
        const query = searchQuery.toLowerCase();
        return u.username.toLowerCase().includes(query) || u.role.toLowerCase().includes(query);
    });

    return (
        <div className="space-y-6 text-slate-900">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_45%),linear-gradient(135deg,#ffffff,#f8fafc)] px-6 py-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                            <Shield size={20} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold text-slate-900">Assigned Users</h3>
                            <p className="text-sm text-slate-500">Manage who can log in, what access they have, and add new users from here.</p>
                        </div>
                    </div>
                </div>
            </div>

            {showAddForm ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <AssignRoleModal
                        onCancel={() => {
                            setShowAddForm(false);
                            setEditingUser(null);
                        }}
                        onComplete={async (data) => {
                            setIsActionLoading(true);
                            try {
                                if (editingUser) {
                                    await Database.updateUser({
                                        id: editingUser.id,
                                        username: data.username,
                                        role: data.role,
                                        password: data.password || undefined
                                    });
                                    toast.success('Credentials updated successfully');
                                } else {
                                    await Database.addUser({
                                        username: data.username,
                                        password: data.password || '',
                                        role: data.role
                                        // TODO: We could link workerId explicitly in the `users` table
                                        // schema in the future, but for now they log in via this username/pass.
                                    });
                                    toast.success('Role assigned & credentials created');
                                }
                                setShowAddForm(false);
                                setEditingUser(null);
                                loadUsers();
                            } catch (e: any) {
                                toast.error(e.message || 'Operation failed');
                            } finally {
                                setIsActionLoading(false);
                            }
                        }}
                        existingUserToEdit={editingUser}
                    />
                </div>
            ) : (
                <>
                    {/* Search Bar Container */}
                    <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="relative w-full lg:max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    placeholder="Search by username or role"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={loadUsers}
                                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                    title="Refresh users"
                                >
                                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingUser(null);
                                        setShowAddForm(true);
                                    }}
                                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
                                >
                                    <UserPlus size={16} />
                                    <span>Add user</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Registry Area */}
                    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                                        <th className="px-6 py-4">Account</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-right pr-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="group transition-colors duration-200 odd:bg-white even:bg-slate-50/50 hover:bg-slate-50">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                        <UserCircle2 size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-900">{u.username}</span>
                                                        <span className="mt-1 font-mono text-[11px] text-slate-400">{u.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium capitalize ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    <div className={`h-2 w-2 rounded-full ${u.role === UserRole.ADMIN ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                                                    <span>
                                                        {u.role.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right pr-8">
                                                <div className="flex items-center justify-end gap-2 opacity-70 transition-opacity group-hover:opacity-100">
                                                    <button
                                                        onClick={() => openEdit(u)}
                                                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                        title="Edit user"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u.id, u.username)}
                                                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="py-24 text-center bg-slate-50/50">
                                                <div className="max-w-xs mx-auto">
                                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-300 shadow-sm">
                                                        <Users size={24} />
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-slate-900">No users found</h3>
                                                    <p className="mt-2 text-sm text-slate-500">Try a different search.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserManagement;
