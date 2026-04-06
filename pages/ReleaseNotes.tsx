import React from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, Wrench, Zap } from 'lucide-react';
import { releaseNotes } from '../data/releaseNotes';

const ReleaseNotes: React.FC = () => {
  const latestRelease = releaseNotes[0];
  const totalFixes = releaseNotes.reduce((count, release) => count + release.fixes.length, 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20 text-slate-900">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.10),_transparent_35%)]" />
        <div className="relative grid gap-6 px-6 py-7 md:grid-cols-[1.5fr_1fr] md:px-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
              <Zap size={12} className="text-blue-600" />
              Starline Release Ledger
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Version fixes and rollout history</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                This page keeps a running record of what we fixed, when we fixed it, and which part of the system changed in that release.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Latest Version</p>
              <p className="mt-2 text-xl font-black text-slate-900">{latestRelease?.version || 'N/A'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logged Fixes</p>
              <p className="mt-2 text-xl font-black text-slate-900">{totalFixes}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Release Entries</p>
              <p className="mt-2 text-xl font-black text-slate-900">{releaseNotes.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {releaseNotes.map((release) => (
          <section key={`${release.version}-${release.date}`} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                      {release.version}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <CalendarDays size={12} />
                      {release.date}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">{release.title}</h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{release.summary}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Changed Areas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {release.areas.map((area) => (
                      <span key={area} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-6 md:grid-cols-[1.25fr_0.75fr] md:px-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">Fixes Included</h3>
                </div>
                <div className="space-y-3">
                  {release.fixes.map((fix) => (
                    <div key={fix} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 border border-slate-200">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                      <p className="text-sm font-medium leading-6 text-slate-700">{fix}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-slate-700" />
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">How To Use</h3>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                    Click the Starline brand in the sidebar or the top header breadcrumb anytime you want to review the fix record for this build.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-blue-300" />
                    <h3 className="text-sm font-black uppercase tracking-[0.18em]">Maintenance Note</h3>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-300">
                    Add future fixes by appending a new release entry in <span className="font-black text-white">`data/releaseNotes.ts`</span>. This keeps the changelog local to the app and easy to maintain.
                  </p>
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
