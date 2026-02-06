
const SESSION_KEY = 'starline_auth_session';
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const AuthSession = {
    /**
     * Saves the current timestamp as the last successful unlock.
     */
    saveSession: () => {
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        window.dispatchEvent(new CustomEvent('session-changed', { detail: { isAuthenticated: true } }));
    },

    /**
     * Checks if the current session is still valid (less than 1 hour old).
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
    }
};
