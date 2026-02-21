import React from 'react';
import { ShieldQuestion, Layers } from 'lucide-react';

interface UnregisteredUnitFoundProps {
    missingSerial: string;
    setBatchMode: (mode: boolean) => void;
    setShowAddStock: (show: boolean) => void;
    setScanBuffer: (buffer: string) => void;
    setMissingSerial: (serial: string) => void;
}

export const UnregisteredUnitFound: React.FC<UnregisteredUnitFoundProps> = ({
    missingSerial,
    setBatchMode,
    setShowAddStock,
    setScanBuffer,
    setMissingSerial
}) => {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl animate-in zoom-in-95 no-print text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldQuestion size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Unregistered Unit Found</h3>
            <p className="text-slate-500 font-medium mb-8">
                The identifier <span className="font-mono font-bold text-slate-900">{missingSerial}</span> is not in the registry.
                To add new stock and assign it to a dealer, please switch to Batch Mode.
            </p>

            <button
                onClick={() => {
                    setBatchMode(true);
                    setShowAddStock(false);
                    setScanBuffer('');
                    setMissingSerial('');
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-3 group"
            >
                <Layers size={18} className="group-hover:scale-110 transition-transform" />
                Switch to Batch Mode
            </button>
        </div>
    );
};
