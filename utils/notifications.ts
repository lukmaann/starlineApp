type NotificationType = 'success' | 'error' | 'info';

let outcomeAudioContext: AudioContext | null = null;
let lastOutcomeSound: { type: 'success' | 'error'; at: number } | null = null;

export const playOutcomeSound = (type: 'success' | 'error') => {
    const nowMs = Date.now();
    if (lastOutcomeSound?.type === type && nowMs - lastOutcomeSound.at < 350) return;
    lastOutcomeSound = { type, at: nowMs };

    try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;
        const context = outcomeAudioContext ?? new AudioContextCtor();
        outcomeAudioContext = context;

        const play = () => {
            const start = context.currentTime;
            const notes = type === 'success'
                ? [{ frequency: 660, offset: 0 }, { frequency: 880, offset: 0.12 }]
                : [{ frequency: 440, offset: 0 }, { frequency: 330, offset: 0.14 }];

            notes.forEach(({ frequency, offset }) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const noteStart = start + offset;
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, noteStart);
                gain.gain.setValueAtTime(0.001, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.055, noteStart + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.16);
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(noteStart);
                oscillator.stop(noteStart + 0.17);
            });
        };

        if (context.state === 'suspended') {
            void context.resume().then(play).catch(() => undefined);
        } else {
            play();
        }
    } catch {
        // Audio is an enhancement; notifications should still work if unavailable.
    }
};

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
