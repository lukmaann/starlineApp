import React from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Wrench, Zap, Info, ArrowUpRight, History } from 'lucide-react';
import { releaseNotes } from '../data/releaseNotes';

const ReleaseNotes: React.FC = () => {
  const latestRelease = releaseNotes[0];
  const totalFixes = releaseNotes.reduce((count, release) => count + release.fixes.length, 0);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900">
      {/* Header Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/20 to-transparent pointer-events-none" />
        
        <div className="flex flex-col gap-4 relative z-10">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
              <History size={16} className="text-white" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
              Starline Release Ledger
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">System Updates</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 italic">
              "Keeping you informed about the latest improvements and refinements to your Starline enterprise experience."
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
            Stable Release
          </div>
          <div className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20">
            Build v1.0.2
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { label: 'Latest Version', value: latestRelease?.version || 'N/A', icon: Zap, color: 'text-blue-600' },
          { label: 'Total Improvements', value: totalFixes, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Sync Cycle Status', value: 'Complete', icon: ArrowUpRight, color: 'text-violet-600' },
        ].map((metric) => (
          <div key={metric.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{metric.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center ${metric.color}`}>
                <metric.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Release Timeline */}
      <div className="space-y-6">
        {releaseNotes.map((release) => (
          <section key={`${release.version}-${release.date}`} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            {/* Release Header */}
            <div className="px-6 py-5 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Release Entry</span>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                    <CalendarDays size={12} strokeWidth={2.5} />
                    {release.date}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{release.title}</h2>
                <p className="text-sm font-medium text-slate-500 italic">{release.summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {release.areas.map((area) => (
                  <span key={area} className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm group-hover:border-blue-200 transition-colors">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Release Content */}
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] divide-y xl:divide-y-0 xl:divide-x divide-slate-100">
              {/* Fixes List */}
              <div className="p-8 space-y-6 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">What's Improved</h3>
                </div>
                
                <div className="space-y-3">
                  {release.fixes.map((fix) => (
                    <div key={fix} className="group/fix flex items-start gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/20 transition-all duration-300">
                      <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 group-hover/fix:scale-110 transition-transform" />
                      <p className="text-[13px] font-bold leading-relaxed text-slate-700">{fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar / Info */}
              <div className="p-8 flex flex-col gap-6 bg-slate-50/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Info size={14} className="text-blue-600" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Information</h3>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribution</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">Internal enterprise</p>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accessibility</p>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">
                            This panel is accessible by clicking the <span className="font-bold text-slate-900">Starline</span> brand in the sidebar anytime.
                        </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-slate-900/20 relative overflow-hidden group/maint">
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50" />
                    <div className="relative z-10 space-y-3">
                        <div className="flex items-center gap-2">
                            <Wrench size={14} className="text-blue-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/90">For Developers</h3>
                        </div>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed">
                            Maintain this ledger in <span className="text-blue-400 font-bold">`data/releaseNotes.ts`</span>. New entries will automatically reflect here.
                        </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ReleaseNotes;
