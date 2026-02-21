import React, { useState, useEffect } from 'react';
import { Database } from '../db';
import { User, UserRole } from '../types';
import { UserPlus, Trash2, Edit2, Shield, User as UserIcon, Loader2, X, CheckCircle2, Search, RefreshCw, Layers } from 'lucide-react';
import { toast } from 'sonner';

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
            await Database.deleteUser(id);
            toast.success('User deleted');
            loadUsers();
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

    const adminCount = users.filter(u => u.role === UserRole.ADMIN).length;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 text-slate-900 pb-20">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none mb-1">User Registry</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">System Access & Roles</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-1 rounded-lg flex items-center gap-1">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 shadow-sm border border-slate-200 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-default">
                            <Shield size={14} className="text-indigo-600" />
                            Admins
                            {adminCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[8px] leading-none">{adminCount}</span>
                            )}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <button
                        onClick={loadUsers}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all hover:text-slate-900 shadow-sm active:scale-95"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingUser(null);
                            setFormData({ username: '', password: '', role: UserRole.FACTORY_WORKER });
                            setShowAddForm(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 ml-2 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-sm active:scale-95"
                    >
                        <UserPlus size={16} />
                        <span>Add User</span>
                    </button>
                </div>
            </div>

            {/* Search Bar Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                    <input
                        placeholder="Search Registry by Username or Role..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-sm transition-all uppercase tracking-wide mono text-slate-900 focus:bg-white focus:border-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {showAddForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                                {editingUser ? 'Edit User Credentials' : 'Register New User'}
                            </h3>
                            <button onClick={() => setShowAddForm(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                                <input
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="e.g. jdoe"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    {editingUser ? 'New Password (Leave blank to keep current)' : 'Password'}
                                </label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Access Role</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                    <option value={UserRole.ADMIN}>ADMIN (Full Access)</option>
                                    <option value={UserRole.FACTORY_WORKER}>FACTORY WORKER (Limited)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                {editingUser ? 'Update User' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Registry Area */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold border-b border-slate-200 uppercase tracking-widest">
                                <th className="px-6 py-4 pl-8">Username</th>
                                <th className="px-6 py-4">Account Type</th>
                                <th className="px-6 py-4">Identity Hash</th>
                                <th className="px-6 py-4 text-right pr-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                                    <td className="px-6 py-5 pl-8">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {u.role === UserRole.ADMIN ? <Shield size={16} /> : <UserIcon size={16} />}
                                            </div>
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block ${u.role === UserRole.ADMIN ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">{u.id}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right pr-8">
                                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(u)}
                                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                                                title="Edit Credentials"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id, u.username)}
                                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                                                title="Terminate Access"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center bg-slate-50/50">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                                                <Search size={24} />
                                            </div>
                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">No Users Found</h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Adjust search query.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
