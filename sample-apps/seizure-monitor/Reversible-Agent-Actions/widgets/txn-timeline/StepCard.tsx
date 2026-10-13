import React from 'react';
import type { NormalizedStep } from './normalize';

const REVERSIBILITY_STYLE: Record<string, string> = {
  CLEAN: 'bg-green-600 text-white',
  RESTORATIVE: 'bg-blue-600 text-white',
  TOMBSTONED: 'bg-gray-600 text-white',
  MITIGABLE: 'bg-amber-500 text-gray-900 font-semibold',
  TERMINAL: 'bg-red-600 text-white font-bold',
};

interface StepCardProps {
  step: NormalizedStep;
}

export function StepCard({ step }: StepCardProps) {
  const { compensationState } = step;

  const isCompensated = compensationState === 'COMPENSATED';
  const isFailed = compensationState === 'COMPENSATION_FAILED';
  const isActionFailed = compensationState === 'FAILED';
  const isSkippedTerminal = compensationState === 'SKIPPED_TERMINAL';
  const isCompensating = compensationState === 'COMPENSATING';
  const isSkippedConflict = compensationState === 'SKIPPED_CONFLICT';

  const cardBase =
    'flex-shrink-0 min-w-[180px] max-w-[220px] rounded-lg p-3 border-2 transition-colors ' +
    (isSkippedTerminal
      ? 'bg-red-600 border-red-700'
      : isFailed || isActionFailed
        ? 'bg-white dark:bg-gray-900 border-red-500'
        : isCompensated
          ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-60'
          : isCompensating
            ? 'bg-amber-50 dark:bg-amber-950 border-amber-400'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700');

  const toolNameClass =
    'text-[13px] font-semibold ' +
    (isSkippedTerminal
      ? 'text-white'
      : isFailed || isActionFailed
        ? 'text-red-600 dark:text-red-400'
        : isCompensated
          ? 'text-gray-500 dark:text-gray-400 line-through'
          : 'text-gray-900 dark:text-gray-100');

  return (
    <div className={cardBase} data-seq={step.seq}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400">
          {String(step.seq).padStart(2, '0')}
        </span>
        {isCompensating && (
          <span className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">compensating</span>
          </span>
        )}
      </div>

      <div className={toolNameClass}>{step.toolName}</div>
      {step.server && (
        <div className={'text-[11px] mt-0.5 ' + (isSkippedTerminal ? 'text-red-100' : 'text-gray-500 dark:text-gray-400')}>
          {step.server}
        </div>
      )}

      {step.reversibility ? (
        <span
          className={
            'inline-block mt-2 px-2 py-0.5 rounded text-[11px] leading-tight ' + REVERSIBILITY_STYLE[step.reversibility]
          }
        >
          {step.reversibility}
        </span>
      ) : (
        <span className="inline-block mt-2 px-2 py-0.5 rounded text-[11px] leading-tight bg-gray-400 text-white">
          N/A
        </span>
      )}

      {isSkippedTerminal && <div className="mt-2 text-[11px] font-bold text-white">✕ cannot reverse</div>}
      {isSkippedConflict && (
        <div className="mt-2 text-[11px] font-semibold text-gray-600 dark:text-gray-300">skipped — conflict</div>
      )}
      {isActionFailed && <div className="mt-2 text-[11px] font-semibold text-red-600 dark:text-red-400">action failed</div>}
      {isFailed && step.note && <div className="mt-2 text-[11px] text-red-600 dark:text-red-400">{step.note}</div>}
    </div>
  );
}
