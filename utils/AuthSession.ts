
const SESSION_KEY = 'starline_auth_session';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every 1 minute

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
     * Saves the current timestamp as the last successful unlock.
     */
    saveSession: () => {
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        window.dispatchEvent(new CustomEvent('session-changed', { detail: { isAuthenticated: true } }));
        // Start the auto-lock timer
        startAutoLockTimer();
    },

    /**
     * Checks if the current session is still valid (less than 30 minutes old).
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
     * Clears the current session.
     */
    clearSession: () => {
        localStorage.removeItem(SESSION_KEY);
        window.dispatchEvent(new CustomEvent('session-changed', { detail: { isAuthenticated: false } }));
        // Stop the auto-lock timer
        if (autoLockTimer) {
            clearInterval(autoLockTimer);
            autoLockTimer = null;
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
