import React from 'react';
import { ArrowLeft, ArrowRight, Trash2, RotateCw } from 'lucide-react';
import { useNavigationHistory } from '../hooks/useNavigationHistory';

interface NavigationControlsProps {
    history: ReturnType<typeof useNavigationHistory>['history'];
    historyIndex: ReturnType<typeof useNavigationHistory>['historyIndex'];
    onBack: ReturnType<typeof useNavigationHistory>['goBack'];
    onForward: ReturnType<typeof useNavigationHistory>['goForward'];
    onClear: ReturnType<typeof useNavigationHistory>['clearHistory'];
    activeTab: string;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
    history,
    historyIndex,
    onBack,
    onForward,
    onClear,
    activeTab
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
        <div className="flex items-center space-x-1 mr-4 bg-slate-100 p-1 rounded-lg">
            <button
                onClick={onBack}
                disabled={historyIndex <= 0}
                className={`p-1.5 rounded-md transition-all ${historyIndex > 0 ? 'hover:bg-white text-slate-500 hover:text-slate-800 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                title="Go Back"
            >
                <ArrowLeft size={16} />
            </button>
            <button
                onClick={onForward}
                disabled={historyIndex >= history.length - 1}
                className={`p-1.5 rounded-md transition-all ${historyIndex < history.length - 1 ? 'hover:bg-white text-slate-500 hover:text-slate-800 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                title="Go Forward"
            >
                <ArrowRight size={16} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
                onClick={handleClearHistory}
                disabled={history.length <= 1}
                className={`p-1.5 rounded-md transition-all ${history.length > 1 ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600' : 'text-slate-400 opacity-40 cursor-not-allowed'}`}
                title="Clear History"
            >
                <Trash2 size={16} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
                onClick={handleRefresh}
                className="p-1.5 rounded-md transition-all hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                title="Refresh App"
            >
                <RotateCw size={16} />
            </button>
        </div>
    );
};

export default NavigationControls;
