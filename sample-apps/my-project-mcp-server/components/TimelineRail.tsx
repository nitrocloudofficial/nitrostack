'use client';

import { useState } from 'react';
import { formatDateTime, formatDateTimeLong, formatRelativeTime } from '@/lib/utils';
import type { TimelineActor, TimelineEvent } from '@/lib/types';

const ACTOR_LABEL: Record<TimelineActor, string> = {
  hospital: 'Hospital',
  insurer: 'Insurer',
  patient: 'Patient',
  system: 'System',
};

const ACTOR_DESCRIPTION: Record<TimelineActor, string> = {
  hospital: 'Hospital staff — case submission, cost estimates, and evidence.',
  insurer: 'Insurance agent — policy review and claim adjudication.',
  patient: 'Patient (or their representative) — consent, uploads, and disputes.',
  system: 'Automated Care Mediator check — runs without human input.',
};

const ACTOR_BADGE: Record<TimelineActor, string> = {
  hospital: 'bg-slate-900 text-white',
  insurer: 'bg-slate-600 text-white',
  patient: 'bg-teal-600 text-white',
  system: 'bg-amber-500 text-white',
};

const ACTOR_ICON: Record<TimelineActor, string> = {
  hospital: '🏥',
  insurer: '🛡️',
  patient: '👤',
  system: '🤖',
};

export function TimelineRail({ events }: { events: TimelineEvent[] }) {
  const ordered = [...events].reverse();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between border-b border-white/40 pb-2.5 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Activity Log
        </h2>
        <span className="font-mono text-[10px] font-bold text-slate-400">
          {events.length}
        </span>
      </div>

      <ol className="space-y-3">
        {ordered.map((event, index) => {
          const isOpen = expanded === index;
          return (
            <li key={`${event.timestamp}-${index}`} className="relative flex gap-2.5">
              <div className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${ACTOR_BADGE[event.actor]}`}>
                {ACTOR_ICON[event.actor]}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="w-full rounded-lg -m-1 p-1 text-left transition-colors hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  title="Click to see full details"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900">{ACTOR_LABEL[event.actor]}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600 leading-snug">{event.event}</p>
                </button>

                {isOpen && (
                  <div className="mt-2 rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-3 text-xs animate-route-in">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${ACTOR_BADGE[event.actor]}`}>
                        {ACTOR_ICON[event.actor]}
                      </span>
                      <div>
                        <p className="font-bold text-teal-950">{ACTOR_LABEL[event.actor]}</p>
                        <p className="text-[10px] text-teal-800">{ACTOR_DESCRIPTION[event.actor]}</p>
                      </div>
                    </div>

                    <p className="mt-2.5 text-[13px] font-medium leading-relaxed text-teal-950">
                      {event.event}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-teal-300/30 pt-2 text-[10px] text-teal-800">
                      <span>{formatDateTimeLong(event.timestamp)}</span>
                      <span className="font-mono">{formatRelativeTime(event.timestamp)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpanded(null)}
                      className="mt-2.5 w-full rounded-lg bg-white/50 backdrop-blur-md border border-teal-300/40 py-1 text-[10px] font-bold text-teal-800 hover:bg-white/70"
                    >
                      ✕ Close
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function TimelineRailEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/60 bg-white/25 backdrop-blur-md p-4 text-center">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        Activity Log
      </h2>
      <p className="mt-2 text-xs text-slate-500">{message}</p>
    </div>
  );
}
