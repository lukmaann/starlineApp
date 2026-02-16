import React, { useState, useEffect } from 'react';

interface AnalyticsLoaderProps {
    title: string;
    subtitle?: string;
    duration?: number;
    onComplete?: () => void;
}


export const AnalyticsLoader: React.FC<AnalyticsLoaderProps> = ({
    title,
    subtitle,
    duration = 4000,
    onComplete
}) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Initializing');

    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const currentProgress = Math.min((elapsed / duration) * 100, 100);

            setProgress(currentProgress);

            // Dynamic Status based on progress
            if (currentProgress < 25) setStatus('Syncing Registry...');
            else if (currentProgress < 50) setStatus('Analyzing Data Patterns...');
            else if (currentProgress < 75) setStatus('Generating Intelligence...');
            else if (currentProgress < 100) setStatus('Finalizing Report...');
            else {
                setStatus('Ready');
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [duration, onComplete]);

    return (
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-sm space-y-8 text-center">
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{title}</h2>
                    {subtitle && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-slate-900 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center px-0.5">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{status}</span>
                        <span className="text-[10px] font-black text-slate-400 font-mono">{Math.round(progress)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


// export default AnalyticsLoader; 
