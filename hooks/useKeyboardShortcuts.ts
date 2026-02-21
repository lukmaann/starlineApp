import { useEffect, useState } from 'react';

export interface Shortcut {
    keys: string;
    label: string;
    tab: string;
}

export const SHORTCUTS: Shortcut[] = [
    { keys: 'G H', label: 'Hub Trace', tab: 'scanner' },
    { keys: 'G D', label: 'Dealers', tab: 'dealers' },
    { keys: 'G S', label: 'Settlements', tab: 'settlements' },
    { keys: 'G B', label: 'Batches', tab: 'batches' },
    { keys: 'G A', label: 'Analytics', tab: 'analytics' },
    { keys: 'G C', label: 'Controls', tab: 'controls' },
];

export function useKeyboardShortcuts(
    navigate: (tab: string) => void,
    isLoggedIn: boolean
) {
    const [showHelp, setShowHelp] = useState(false);
    const [gPressed, setGPressed] = useState(false);
    const [gTimer, setGTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isLoggedIn) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore when typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const key = e.key.toUpperCase();

            // '?' or 'Ctrl + Space' toggles help panel
            if (e.key === '?' || (e.ctrlKey && e.code === 'Space')) {
                e.preventDefault();
                setShowHelp(v => !v);
                return;
            }

            // Escape closes help
            if (e.key === 'Escape') {
                setShowHelp(false);
                setGPressed(false);
                return;
            }

            // G prefix
            if (key === 'G' && !gPressed) {
                setGPressed(true);
                // Auto-reset after 1.5s if second key not pressed
                const timer = setTimeout(() => setGPressed(false), 1500);
                setGTimer(timer);
                return;
            }

            if (gPressed) {
                if (gTimer) clearTimeout(gTimer);
                setGPressed(false);
                const match = SHORTCUTS.find(s => s.keys.endsWith(key));
                if (match) {
                    e.preventDefault();
                    navigate(match.tab);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLoggedIn, gPressed, gTimer, navigate]);

    return { showHelp, setShowHelp };
}
