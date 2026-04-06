import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface ShortcutsModalProps {
    onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[2000] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 z-[2100] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
                            <Keyboard size={14} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Keyboard Shortcuts</h3>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Press G then the key to navigate</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Shortcut list */}
                <div className="p-4 space-y-1.5">
                    {SHORTCUTS.map((s) => {
                        const [prefix, key] = s.keys.split(' ');
                        return (
                            <div key={s.tab} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                                <span className="text-xs font-semibold text-slate-700">{s.label}</span>
                                <div className="flex items-center gap-1.5">
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-black text-slate-700 shadow-sm">{prefix}</kbd>
                                    <span className="text-[9px] text-slate-400 font-bold">then</span>
                                    <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-[10px] font-black text-white shadow-sm">{key}</kbd>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-center gap-2 text-slate-400">
                    <span className="text-[9px] font-bold uppercase tracking-widest">Press</span>
                    <kbd className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-600 shadow-sm">Ctrl</kbd>
                    <span className="text-[9px] font-black">+</span>
                    <kbd className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-600 shadow-sm">Space</kbd>
                    <span className="text-[9px] font-bold uppercase tracking-widest ml-1">to toggle</span>
                </div>
            </div>
        </>
    );
};

export default ShortcutsModal;
