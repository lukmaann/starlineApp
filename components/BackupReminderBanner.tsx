import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, X } from 'lucide-react';
import { Database } from '../db';

interface BackupReminderBannerProps {
  activeTab: string;
  onOpenBackup: () => void;
}

const getDaysSince = (isoDate: string | null) => {
  if (!isoDate) return null;
  const past = new Date(isoDate).getTime();
  const now = new Date().getTime();
  return Math.floor((now - past) / (1000 * 60 * 60 * 24));
};

export default function BackupReminderBanner({ activeTab, onOpenBackup }: BackupReminderBannerProps) {
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const lastBackup = await Database.getConfig('last_backup_date');
      if (!alive) return;
      setLastBackupDate(lastBackup);
      setDaysSinceBackup(getDaysSince(lastBackup));
    };

    load();

    const refresh = () => load();
    window.addEventListener('backup-status-updated' as any, refresh);
    window.addEventListener('focus', refresh);

    return () => {
      alive = false;
      window.removeEventListener('backup-status-updated' as any, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const bannerKey = useMemo(() => lastBackupDate || 'never', [lastBackupDate]);
  const isDismissed = dismissedKey === bannerKey;
  const shouldShow = activeTab !== 'backup' && !isDismissed && (daysSinceBackup === null || daysSinceBackup >= 6);

  useEffect(() => {
    setDismissedKey(null);
  }, [bannerKey]);

  if (!shouldShow) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-8 py-2.5 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-800 min-w-0">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider truncate">
            {daysSinceBackup === null
              ? 'No backup recorded yet. Secure the database before more work is added.'
              : `${daysSinceBackup} day${daysSinceBackup === 1 ? '' : 's'} since the last backup. It is time to secure a fresh copy.`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenBackup}
            className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <Download size={12} />
              Backup Now
            </span>
          </button>
          <button
            onClick={() => setDismissedKey(bannerKey)}
            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
