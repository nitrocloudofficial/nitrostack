import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SummaryBar } from './SummaryBar';
import { StepCard } from './StepCard';
import { normalize, type NormalizedView, type TxnTimelineData } from './normalize';

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-600 text-white',
  COMMITTED: 'bg-gray-600 text-white',
  ROLLING_BACK: 'bg-amber-500 text-white motion-safe:animate-pulse',
  ROLLED_BACK: 'bg-green-600 text-white',
  PARTIAL: 'bg-amber-500 text-white font-bold ring-2 ring-amber-300',
};

function truncateId(id: string): string {
  return id.slice(0, 12);
}

function formatOpenedAt(d: Date | null): string | null {
  if (!d) return null;
  // Explicit locale/timeZone — `undefined` here would pick up the server's vs.
  // the browser's default locale, producing different strings on each side and
  // a React hydration mismatch.
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
}

interface TxnTimelineProps {
  data: TxnTimelineData;
}

function TxnTimeline({ data }: TxnTimelineProps) {
  const view: NormalizedView = useMemo(() => normalize(data), [data]);

  // Detect ROLLING_BACK -> ROLLED_BACK/PARTIAL between renders (props are
  // re-sent on every txn.step.compensated event) so the progress bar's exit
  // and the final status land in the same render, with no stale local state.
  const previousStatusRef = useRef<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  useEffect(() => {
    const prev = previousStatusRef.current;
    if (prev === 'ROLLING_BACK' && (view.status === 'ROLLED_BACK' || view.status === 'PARTIAL')) {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 1500);
      previousStatusRef.current = view.status;
      return () => clearTimeout(t);
    }
    previousStatusRef.current = view.status;
  }, [view.status]);

  const sortedSteps = useMemo(() => [...view.steps].sort((a, b) => a.seq - b.seq), [view.steps]);

  if (view.kind === 'error') {
    return (
      <div className="w-full max-w-3xl mx-auto p-4 rounded-xl bg-white dark:bg-gray-950 font-sans">
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border-2 border-red-400 text-[13px] text-red-700 dark:text-red-300">
          <span className="font-bold">Couldn't render this transaction: </span>
          {view.errorMessage}
        </div>
      </div>
    );
  }

  const isRollingBack = view.status === 'ROLLING_BACK';
  const compensatedStates = new Set(['COMPENSATED', 'COMPENSATION_FAILED', 'SKIPPED_TERMINAL', 'SKIPPED_CONFLICT']);
  const doneCount = sortedSteps.filter((s) => s.compensationState && compensatedStates.has(s.compensationState)).length;
  const currentStep = sortedSteps.find((s) => s.compensationState === 'COMPENSATING');
  const totalCount = sortedSteps.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="w-full max-w-3xl mx-auto p-4 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* 1. HEADER BAR */}
      <div
        className={
          'rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700 ' +
          (justCompleted ? 'ring-2 ring-green-400' : '')
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {view.transactionId && (
            <code className="text-[12px] font-mono text-gray-500 dark:text-gray-400">{truncateId(view.transactionId)}</code>
          )}
          {view.label && <span className="text-[14px] font-semibold">{view.label}</span>}
          {view.status && (
            <span className={'px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide ' + (STATUS_BADGE[view.status] ?? 'bg-gray-500 text-white')}>
              {view.status.replace('_', ' ')}
            </span>
          )}
          {view.kind === 'preflight' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wide bg-purple-600 text-white">
              preflight preview
            </span>
          )}
        </div>
        {(view.actor || view.openedAt || view.scope) && (
          <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
            {[view.actor, formatOpenedAt(view.openedAt), view.scope?.join(', ')].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      {/* 2. PROGRESS BAR (ROLLING_BACK only) */}
      {isRollingBack && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
            <span>
              ROLLING BACK — step {Math.min(doneCount + 1, totalCount)} of {totalCount}
            </span>
            <span>{currentStep?.toolName ?? ''}</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            {/* Fill grows from the right — compensation runs LIFO, right to left.
                Width is a runtime-computed percentage, so it can't be a static
                Tailwind class; this is the one necessary inline style. */}
            <div
              className="absolute right-0 top-0 h-full bg-amber-500 motion-safe:transition-all motion-safe:duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* 3 & 4. STEP CARDS + POINT-OF-NO-RETURN MARKER */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {sortedSteps.length === 0 ? (
          <div className="text-[12px] text-gray-500 dark:text-gray-400 py-6 w-full text-center">No steps.</div>
        ) : (
          sortedSteps.map((step, i) => (
            <React.Fragment key={step.seq}>
              {view.pivotSeq !== null && step.seq === view.pivotSeq && i > 0 && (
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-8">
                  <div className="h-full border-l-2 border-dashed border-red-500" />
                  <div className="text-[10px] font-bold text-red-600 dark:text-red-400 whitespace-nowrap [writing-mode:vertical-rl] rotate-180 my-1">
                    POINT OF NO RETURN
                  </div>
                  <div className="h-full border-l-2 border-dashed border-red-500" />
                </div>
              )}
              <StepCard step={step} />
            </React.Fragment>
          ))
        )}
      </div>

      {/* 5. SUMMARY BAR */}
      <div className="mt-3">
        <SummaryBar steps={sortedSteps} systemsTouched={view.systemsTouched} />
      </div>

      {/* 6. INTERVENTION PANEL (PARTIAL only) */}
      {view.status === 'PARTIAL' && view.notReversed && (
        <div className="mt-3 p-3 rounded-lg bg-amber-100 dark:bg-amber-950 border-2 border-amber-500">
          <div className="text-[13px] font-bold text-amber-800 dark:text-amber-300 mb-2">MANUAL INTERVENTION REQUIRED</div>
          <ul className="list-disc list-inside space-y-1">
            {view.notReversed.map((r) => (
              <li key={r.seq} className="text-[12px] text-amber-900 dark:text-amber-200">
                <span className="font-semibold">
                  seq {r.seq} {r.tool}
                </span>
                {r.manualAction ? `: ${r.manualAction}` : `: ${r.note}`}
              </li>
            ))}
          </ul>
          <div className="text-[12px] font-semibold text-amber-800 dark:text-amber-300 mt-2">
            Assign to an operator for resolution.
          </div>
        </div>
      )}
    </div>
  );
}

export default TxnTimeline;
