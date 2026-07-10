import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Edit2, Shield, Loader2, Search, RefreshCw, Users, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserWizard } from './UserWizard';
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full text-slate-900">
            {showAddForm ? (
                <UserWizard
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
                    users={users}
                    initialData={editingUser}
                />
            ) : (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">User Accounts</h3>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{filteredUsers.length} active logins</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingUser(null);
                                setShowAddForm(true);
                            }}
                            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-black active:scale-95 shadow-sm"
                        >
                            <UserPlus size={13} />
                            <span>Add User</span>
                        </button>
                    </div>

                    {/* Search and Filter */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            placeholder="Filter users..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Clean List Registry */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {filteredUsers.map((u) => (
                            <div
                                key={u.id}
                                className="group flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 hover:border-slate-200 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-black text-xs uppercase shadow-inner shrink-0">
                                        {u.username.slice(0, 2)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{u.username}</span>
                                        <span className="font-mono text-[8px] text-slate-400 mt-0.5 truncate">{u.id}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                        u.role === UserRole.ADMIN 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {u.role.replace('FACTORY_WORKER', 'WORKER').replace('_', ' ')}
                                    </span>
                                    
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => openEdit(u)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all active:scale-95"
                                            title="Edit user"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(u.id, u.username)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all active:scale-95"
                                            title="Delete user"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredUsers.length === 0 && (
                            <div className="py-12 text-center bg-slate-50 border border-slate-100 rounded-xl">
                                <Users className="mx-auto text-slate-300 mb-2" size={20} />
                                <h4 className="text-[10px] font-bold text-slate-700 uppercase">No users found</h4>
                                <p className="text-[9px] text-slate-400 uppercase mt-0.5">Try a different filter</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
