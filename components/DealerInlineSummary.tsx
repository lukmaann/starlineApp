import React, { useEffect, useState } from 'react';
import { Activity, MapPin, Phone, Store, TrendingUp, ShieldAlert } from 'lucide-react';
import { Dealer } from '../types';
import { Database } from '../db';

interface DealerInlineSummaryProps {
  dealerId?: string | null;
  dealer?: Dealer | null;
  tone?: 'light' | 'dark';
  compact?: boolean;
}

interface DealerSummary {
  activeUnitCount: number;
  last30Sales: number;
  totalClaims: number;
  claimRatio: string;
}

const emptySummary: DealerSummary = {
  activeUnitCount: 0,
  last30Sales: 0,
  totalClaims: 0,
  claimRatio: '0.0',
};

const statCardClass = {
  light: 'bg-white border-slate-200 text-slate-900',
  dark: 'bg-white/10 border-white/10 text-white',
};

export default function DealerInlineSummary({
  dealerId,
  dealer,
  tone = 'light',
  compact = false,
}: DealerInlineSummaryProps) {
  const [summary, setSummary] = useState<DealerSummary>(emptySummary);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!dealerId) {
        setSummary(emptySummary);
        return;
      }

      setIsLoading(true);
      try {
        const data = await Database.getDealerAnalytics(dealerId);
        if (!alive) return;
        setSummary({
          activeUnitCount: data?.activeUnitCount || 0,
          last30Sales: data?.last30Sales || 0,
          totalClaims: data?.totalClaims || 0,
          claimRatio: data?.claimRatio || '0.0',
        });
      } catch {
        if (alive) {
          setSummary(emptySummary);
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [dealerId]);

  if (!dealerId || !dealer) return null;

  const shellClass =
    tone === 'dark'
      ? 'bg-indigo-950/40 border border-indigo-700/70 text-white'
      : 'bg-slate-50 border border-slate-200 text-slate-900';

  const mutedClass = tone === 'dark' ? 'text-indigo-200' : 'text-slate-500';
  const labelClass = tone === 'dark' ? 'text-indigo-200/80' : 'text-slate-400';

  return (
    <div className={`rounded-xl p-4 animate-in fade-in duration-200 ${shellClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${labelClass}`}>Dealer Summary</p>
          <div className="mt-1 flex items-center gap-2 min-w-0">
            <Store size={16} className={tone === 'dark' ? 'text-indigo-200' : 'text-blue-600'} />
            <p className="text-sm font-black uppercase truncate">{dealer.name}</p>
          </div>
          <div className={`mt-2 space-y-1 text-[11px] font-semibold ${mutedClass}`}>
            <div className="flex items-center gap-2">
              <MapPin size={12} />
              <span className="truncate">{dealer.location || 'Location not set'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={12} />
              <span>{dealer.contact || 'Contact not set'}</span>
            </div>
          </div>
        </div>

        {isLoading && (
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${labelClass}`}>
            Loading
          </span>
        )}
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className={`rounded-lg border p-3 ${statCardClass[tone]}`}>
          <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${labelClass}`}>Active Units</p>
          <div className="mt-2 flex items-center gap-2">
            <Activity size={14} className={tone === 'dark' ? 'text-emerald-300' : 'text-emerald-600'} />
            <span className="text-lg font-black">{summary.activeUnitCount}</span>
          </div>
        </div>
        <div className={`rounded-lg border p-3 ${statCardClass[tone]}`}>
          <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${labelClass}`}>Sales 30D</p>
          <div className="mt-2 flex items-center gap-2">
            <TrendingUp size={14} className={tone === 'dark' ? 'text-sky-300' : 'text-sky-600'} />
            <span className="text-lg font-black">{summary.last30Sales}</span>
          </div>
        </div>
        <div className={`rounded-lg border p-3 ${statCardClass[tone]}`}>
          <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${labelClass}`}>Claims</p>
          <div className="mt-2 flex items-center gap-2">
            <ShieldAlert size={14} className={tone === 'dark' ? 'text-amber-300' : 'text-amber-600'} />
            <span className="text-lg font-black">{summary.totalClaims}</span>
          </div>
        </div>
        <div className={`rounded-lg border p-3 ${statCardClass[tone]}`}>
          <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${labelClass}`}>Claim Ratio</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-black">{summary.claimRatio}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
