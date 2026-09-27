'use client';

import { useState } from 'react';
import { useCase } from '@/lib/case-context';

const CASE_LABELS: Record<string, string> = {
  'clean-case': 'Clean Case (Smooth Approval)',
  'gotcha-case': 'Gotcha Case (Coverage Gap)',
};

export function DevCaseSwitcher() {
  const { caseId, setCaseId, availableCaseIds, loading } = useCase();
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="glass no-print fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-slate-800 transition-all"
      >
        <span>⚡ Switch Demo Case</span>
      </button>
    );
  }

  return (
    <div className="glass no-print fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-2xl p-3 animate-route-in">
      <span className="rounded-lg bg-teal-600 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white shadow-2xs">
        Demo
      </span>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        Active Case:
        <select
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className="glass-input rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          {availableCaseIds.map((id) => (
            <option key={id} value={id}>
              {CASE_LABELS[id] ?? id}
            </option>
          ))}
        </select>
      </label>
      {loading && <span className="text-[11px] text-teal-600 animate-pulse">loading…</span>}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-white/50 hover:text-slate-700"
        title="Minimize switcher"
      >
        ✕
      </button>
    </div>
  );
}
