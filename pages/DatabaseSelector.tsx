import React, { useState } from 'react';
import { HardDrive, Server, ArrowRight, Database as DatabaseIcon, AlertCircle } from 'lucide-react';
import { Database } from '../db';
import { toast } from 'sonner';

interface DatabaseSelectorProps {
    onComplete: () => void;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleInternal = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await Database.switchDatabase('INTERNAL');
            if (res.success) {
                localStorage.setItem('dbConfig', JSON.stringify({ type: 'INTERNAL' }));
                toast.success("Connected to Internal Storage");
                onComplete();
            } else {
                throw new Error(res.error || "Failed to initialize");
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleExternal = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Select Drive
            const path = await Database.selectExternalDrive();
            if (!path) {
                setLoading(false);
                return; // User cancelled
            }

            // 2. Initialize
            const res = await Database.switchDatabase('EXTERNAL', path);
            if (res.success) {
                localStorage.setItem('dbConfig', JSON.stringify({ type: 'EXTERNAL', path }));
                toast.success("Connected to External SSD");
                onComplete();
            } else {
                throw new Error(res.error || "Failed to initialize");
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full">

                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200">
                        <DatabaseIcon size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Select Database Source</h1>
                    <p className="text-slate-500">Choose where your business data is stored to begin.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Internal Option */}
                    <button
                        onClick={handleInternal}
                        disabled={loading}
                        className="group relative bg-white border-2 border-slate-200 hover:border-blue-500 rounded-3xl p-8 transition-all duration-300 hover:shadow-xl text-left disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <ArrowRight size={16} />
                            </div>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-6 transition-colors">
                            <Server size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2">Internal Storage</h3>
                        <p className="text-sm text-slate-500">
                            Use the default local database on this computer. Recommended for standalone setup.
                        </p>
                    </button>

                    {/* External Option */}
                    <button
                        onClick={handleExternal}
                        disabled={loading}
                        className="group relative bg-white border-2 border-slate-200 hover:border-purple-500 rounded-3xl p-8 transition-all duration-300 hover:shadow-xl text-left disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                <ArrowRight size={16} />
                            </div>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center mb-6 transition-colors">
                            <HardDrive size={24} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2">External SSD</h3>
                        <p className="text-sm text-slate-500">
                            Connect a portable drive. Data is read/written to the <code className="bg-slate-100 px-1 rounded text-xs">starline/data</code> folder directly.
                        </p>
                    </button>
                </div>

                {loading && (
                    <div className="mt-8 text-center animate-pulse">
                        <span className="text-slate-400 font-medium">Initializing Database Connection...</span>
                    </div>
                )}

                {error && (
                    <div className="mt-8 bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
                        <AlertCircle size={20} />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

            </div>
        </div>
    );
};

export default DatabaseSelector;
