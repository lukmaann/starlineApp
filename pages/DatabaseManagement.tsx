import React, { useState } from 'react';
import { HardDrive, Server, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Database } from '../db';
import { toast } from 'sonner';

const DatabaseManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get Current Config
    const currentConfigStr = localStorage.getItem('dbConfig');
    const currentConfig = currentConfigStr ? JSON.parse(currentConfigStr) : { type: 'INTERNAL' };
    const isInternal = currentConfig.type === 'INTERNAL';

    const handleSwitchInternal = async () => {
        if (isInternal) return; // Already on Internal
        if (!confirm("Switch to Internal Storage? The app will restart.")) return;

        setLoading(true);
        try {
            // New config
            const newConfig = { type: 'INTERNAL' };
            localStorage.setItem('dbConfig', JSON.stringify(newConfig));

            // Reload to apply
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleSwitchExternal = async () => {
        if (!isInternal && currentConfig.path) {
            // Already on External, maybe just show path?
            // Allow re-selecting if they want to change drive
        }

        setLoading(true);
        try {
            // 1. Select Drive
            const path = await Database.selectExternalDrive();
            if (!path) {
                setLoading(false);
                return; // User cancelled
            }

            // 2. Confirm & Switch
            if (!confirm(`Switch to External Drive at: ${path}? The app will restart.`)) {
                setLoading(false);
                return;
            }

            const newConfig = { type: 'EXTERNAL', path };
            localStorage.setItem('dbConfig', JSON.stringify(newConfig));

            // Reload to apply
            window.location.reload();

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="max-w-4xl w-full">

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Database Management</h1>
                    <p className="text-slate-500 text-lg">
                        Manage your data storage location. You can switch between internal storage and an external portable drive.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Internal Storage Card */}
                    <div className={`relative group border-2 rounded-3xl p-8 transition-all duration-300 ${isInternal ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                        {isInternal && (
                            <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                ACTIVE
                            </div>
                        )}

                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isInternal ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors'}`}>
                            <Server size={28} />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Internal Storage</h3>
                        <p className="text-sm text-slate-500 mb-8 min-h-[40px]">
                            Data is stored locally on this machine. Use this for a standard single-PC setup.
                        </p>

                        <button
                            onClick={handleSwitchInternal}
                            disabled={isInternal || loading}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isInternal
                                    ? 'bg-blue-200/50 text-blue-400 cursor-default'
                                    : 'bg-slate-900 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-200'
                                }`}
                        >
                            {isInternal ? 'Currently Active' : 'Switch to Internal'}
                        </button>
                    </div>

                    {/* External Storage Card */}
                    <div className={`relative group border-2 rounded-3xl p-8 transition-all duration-300 ${!isInternal ? 'border-purple-500 bg-purple-50/50' : 'border-slate-200 bg-white hover:border-purple-300'}`}>
                        {!isInternal && (
                            <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                ACTIVE
                            </div>
                        )}

                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${!isInternal ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors'}`}>
                            <HardDrive size={28} />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-2">External SSD</h3>
                        <p className="text-sm text-slate-500 mb-8 min-h-[40px]">
                            Data is stored in a <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs font-mono">starline/data</code> folder on a removable drive.
                        </p>

                        <button
                            onClick={handleSwitchExternal}
                            disabled={loading}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${!isInternal
                                    ? 'bg-white border-2 border-purple-200 text-purple-700 hover:bg-purple-50'
                                    : 'bg-slate-900 hover:bg-purple-600 text-white shadow-lg hover:shadow-purple-200'
                                }`}
                        >
                            <RefreshCw size={16} className={!isInternal ? '' : 'hidden'} />
                            {!isInternal ? 'Change Drive / Folder' : 'Switch to External SSD'}
                        </button>

                        {!isInternal && currentConfig.path && (
                            <div className="mt-4 text-xs font-mono text-slate-400 bg-white px-3 py-2 rounded-lg border border-purple-100 truncate">
                                path: {currentConfig.path}
                            </div>
                        )}
                    </div>

                </div>

                {error && (
                    <div className="mt-8 bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in justify-center">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {loading && (
                    <div className="mt-8 text-center animate-pulse">
                        <span className="text-slate-400 font-medium">Processing Database Switch...</span>
                    </div>
                )}

            </div>
        </div>
    );
};

export default DatabaseManagement;
