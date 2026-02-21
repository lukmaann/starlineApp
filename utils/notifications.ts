export const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const event = new CustomEvent('app-notify', {
        detail: { message, type }
    });
    window.dispatchEvent(event);
};
