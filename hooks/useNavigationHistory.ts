import { useState } from 'react';

export const useNavigationHistory = (initialTab: string = 'scanner') => {
    const [activeTab, setActiveTabState] = useState(initialTab);
    const [history, setHistory] = useState<string[]>([initialTab]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [pageStates, setPageStates] = useState<Record<string, any>>({});

    const navigate = (tab: string) => {
        if (tab === activeTab) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(tab);

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setActiveTabState(tab);
    };

    const goBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setActiveTabState(history[newIndex]);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setActiveTabState(history[newIndex]);
        }
    };

    const clearHistory = () => {
        setHistory([activeTab]);
        setHistoryIndex(0);
    };

    const savePageState = (tab: string, state: any) => {
        setPageStates(prev => ({ ...prev, [tab]: state }));
    };

    const getPageState = (tab: string) => {
        return pageStates[tab];
    };

    return {
        activeTab,
        history,
        historyIndex,
        navigate,
        goBack,
        goForward,
        clearHistory,
        savePageState,
        getPageState,
        // Direct setters if needed for specific edge cases (like logout reset)
        reset: () => {
            setActiveTabState(initialTab);
            setHistory([initialTab]);
            setHistoryIndex(0);
            setPageStates({});
        }
    };
};
