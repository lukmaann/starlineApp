import React from 'react';
import { ArrowLeft, ArrowRight, Trash2, RotateCw } from 'lucide-react';
import { useNavigationHistory } from '../hooks/useNavigationHistory';

interface NavigationControlsProps {
    history: ReturnType<typeof useNavigationHistory>['history'];
    historyIndex: ReturnType<typeof useNavigationHistory>['historyIndex'];
    onBack: ReturnType<typeof useNavigationHistory>['goBack'];
    onForward: ReturnType<typeof useNavigationHistory>['goForward'];
    onClear: ReturnType<typeof useNavigationHistory>['clearHistory'];
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
    history,
    historyIndex,
    onBack,
    onForward,
    onClear,
}) => {
    const handleRefresh = () => {
        window.dispatchEvent(new CustomEvent('app-refresh'));
    };

    const handleClearHistory = () => {
        onClear();
        // Assuming showToast is handled elsewhere or via callback prop if needed
        // Actually, createPortal or context might be better, but simpler:
        window.dispatchEvent(new CustomEvent('app-notify', { detail: { message: 'Navigation History Cleared', type: 'success' } }));
    };

    return (
        <div className="flex items-center space-x-0.5 mr-4">
            <button
                onClick={onBack}
                disabled={historyIndex <= 0}
                className={`p-2 rounded-full transition-all ${historyIndex > 0 ? 'text-slate-600 hover:bg-slate-100 active:bg-slate-200' : 'text-slate-300 cursor-not-allowed'}`}
                title="Go Back"
            >
                <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <button
                onClick={onForward}
                disabled={historyIndex >= history.length - 1}
                className={`p-2 rounded-full transition-all ${historyIndex < history.length - 1 ? 'text-slate-600 hover:bg-slate-100 active:bg-slate-200' : 'text-slate-300 cursor-not-allowed'}`}
                title="Go Forward"
            >
                <ArrowRight size={20} strokeWidth={2} />
            </button>
            <button
                onClick={handleRefresh}
                className="p-2 rounded-full transition-all text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                title="Refresh App"
            >
                <RotateCw size={19} strokeWidth={2} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
                onClick={handleClearHistory}
                disabled={history.length <= 1}
                className={`p-2 rounded-full transition-all ${history.length > 1 ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100' : 'text-slate-400 opacity-30 cursor-not-allowed'}`}
                title="Clear History"
            >
                <Trash2 size={18} strokeWidth={2} />
            </button>
        </div>
    );
};

export default NavigationControls;
