import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { AuthSession } from '../utils/AuthSession';

const SessionLock: React.FC<{
    isLocked?: boolean;
    onToggle?: (locked: boolean) => void;
    onUnlockRequest?: () => void;
    className?: string;
}> = ({ isLocked: propIsLocked, onToggle, onUnlockRequest, className }) => {
    const [internalIsLocked, setInternalIsLocked] = useState(true);

    const isLocked = propIsLocked !== undefined ? propIsLocked : internalIsLocked;

    useEffect(() => {
        const checkStatus = () => {
            const valid = AuthSession.isValid();
            if (propIsLocked === undefined) setInternalIsLocked(!valid);
        };

        checkStatus();

        // Listen for global session changes
        const handleSessionChange = (e: any) => {
            if (propIsLocked === undefined) {
                setInternalIsLocked(!e.detail.isAuthenticated);
            }
            if (e.detail.isAuthenticated) {
                if (onToggle) onToggle(false);
            }
        };

        window.addEventListener('session-changed' as any, handleSessionChange);
        return () => window.removeEventListener('session-changed' as any, handleSessionChange);
    }, []);

    const handleToggle = () => {
        if (!isLocked) {
            // Dispatch event so App.tsx can show the 3-second countdown before locking
            window.dispatchEvent(new CustomEvent('request-manual-lock'));
        } else {
            // If locked, request unlock (navigate to page)
            if (onUnlockRequest) {
                onUnlockRequest();
            }
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            <button
                onClick={handleToggle}
                className={`flex items-center justify-center p-2 rounded-full transition-all active:scale-95 group/lock ${isLocked
                    ? 'text-rose-600 hover:bg-rose-50 active:bg-rose-100'
                    : 'text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100'
                    }`}
                title={isLocked ? "Click to Unlock Session" : "Click to Lock Session"}
            >
                {isLocked ? <Lock size={20} strokeWidth={2} /> : <Unlock size={20} strokeWidth={2} />}
            </button>
        </div>
    );
};

export default SessionLock;
