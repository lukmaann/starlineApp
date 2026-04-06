type NotificationType = 'success' | 'error' | 'info';

const suppressedNotifications: Array<{
    type?: NotificationType;
    pattern: RegExp;
}> = [
    { type: 'success', pattern: /^Security Clearance Approved$/i },
    { type: 'success', pattern: /traced successfully$/i },
    { type: 'success', pattern: /staged$/i },
    { type: 'success', pattern: /removed from stage$/i },
    { type: 'success', pattern: /^Inspection started$/i },
    { type: 'success', pattern: /^Inspection record reset$/i },
    { type: 'success', pattern: /^Results saved\. Starting exchange/i },
];

const shouldSuppressNotification = (message: string, type: NotificationType) =>
    suppressedNotifications.some(rule => (!rule.type || rule.type === type) && rule.pattern.test(message));

export const notify = (message: string, type: NotificationType = 'success') => {
    if (shouldSuppressNotification(message, type)) return;

    const event = new CustomEvent('app-notify', {
        detail: { message, type }
    });
    window.dispatchEvent(event);
};
