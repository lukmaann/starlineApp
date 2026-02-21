import { User } from '../types';

const SESSION_KEY = 'starline_auth_session';
const USER_KEY = 'starline_auth_user';
const SESSION_DURATION_MS = 45 * 60 * 1000; // 45 minutes
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // Show warning at 2 minutes remaining
const CHECK_INTERVAL_MS = 10 * 1000; // Check every 10 seconds for smoother countdown

let autoLockTimer: NodeJS.Timeout | null = null;

/**
 * Starts the auto-lock timer that checks session validity every minute.
 * When session expires, it clears the session and refreshes the app.
 */
const startAutoLockTimer = () => {
    // Clear any existing timer
    if (autoLockTimer) {
        clearInterval(autoLockTimer);
    }

    // Check immediately
    checkAndAutoLock();

    // Then check every minute
    autoLockTimer = setInterval(() => {
        checkAndAutoLock();
    }, CHECK_INTERVAL_MS);
};

const checkAndAutoLock = () => {
    if (!AuthSession.isValid()) {
        const lastSession = localStorage.getItem(SESSION_KEY);
        // Only auto-lock if there was a session (don't refresh on initial load)
        if (lastSession) {
            AuthSession.clearSession();
            // Refresh the app to show lock screen
            window.location.reload();
        }
    }
};

export const AuthSession = {
    /**
     * Saves the current timestamp and user data.
     */
    saveSession: (user: User) => {
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('session-changed', { detail: { isAuthenticated: true, user } }));
        // Start the auto-lock timer
        startAutoLockTimer();
    },

    refreshSession: () => {
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        startAutoLockTimer();
    },

    /**
     * Checks if the current session is still valid (less than 45 minutes old).
     * @returns true if session is valid, false otherwise.
     */
    isValid: (): boolean => {
        const lastSession = localStorage.getItem(SESSION_KEY);
        if (!lastSession) return false;

        const lastTime = parseInt(lastSession, 10);
        const now = Date.now();

        return now - lastTime < SESSION_DURATION_MS;
    },

    /**
     * Returns seconds remaining until the session expires.
     * Returns 0 if already expired.
     */
    getSecondsUntilExpiry: (): number => {
        const lastSession = localStorage.getItem(SESSION_KEY);
        if (!lastSession) return 0;
        const lastTime = parseInt(lastSession, 10);
        const remaining = SESSION_DURATION_MS - (Date.now() - lastTime);
        return Math.max(0, Math.floor(remaining / 1000));
    },

    /**
     * Returns the warning threshold in seconds (show warning below this value).
     */
    getWarningThresholdSeconds: (): number => {
        return Math.floor(WARNING_THRESHOLD_MS / 1000);
    },

    /**
     * Clears the current session.
     */
    clearSession: () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        window.dispatchEvent(new CustomEvent('session-changed', { detail: { isAuthenticated: false } }));
        // Stop the auto-lock timer
        if (autoLockTimer) {
            clearInterval(autoLockTimer);
            autoLockTimer = null;
        }
    },

    /**
     * Retrieves the current user from session.
     */
    getCurrentUser: (): User | null => {
        const userJson = localStorage.getItem(USER_KEY);
        if (!userJson) return null;
        try {
            return JSON.parse(userJson);
        } catch (e) {
            return null;
        }
    },

    /**
     * Initializes the auto-lock timer on app start if session is valid.
     */
    initialize: () => {
        if (AuthSession.isValid()) {
            startAutoLockTimer();
        }
    }
};
