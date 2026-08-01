import React from 'react';
import type { NormalizedStep } from './normalize';
import type { ReversibilityClass } from '../../src/txn/types';

const CLASS_TEXT_STYLE: Record<ReversibilityClass, string> = {
  CLEAN: 'text-green-600 dark:text-green-400',
  RESTORATIVE: 'text-blue-600 dark:text-blue-400',
  TOMBSTONED: 'text-gray-600 dark:text-gray-300',
  MITIGABLE: 'text-amber-600 dark:text-amber-400',
  TERMINAL: 'text-red-600 dark:text-red-400 font-bold',
};

const CLASS_ORDER: ReversibilityClass[] = ['CLEAN', 'RESTORATIVE', 'TOMBSTONED', 'MITIGABLE', 'TERMINAL'];

interface SummaryBarProps {
  steps: NormalizedStep[];
  systemsTouched: number;
}

export function SummaryBar({ steps, systemsTouched }: SummaryBarProps) {
  const counts: Record<ReversibilityClass, number> = { CLEAN: 0, RESTORATIVE: 0, TOMBSTONED: 0, MITIGABLE: 0, TERMINAL: 0 };
  for (const s of steps) {
    if (s.reversibility) counts[s.reversibility]++;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="text-[12px] text-gray-700 dark:text-gray-200">
        <span className="font-semibold">
          {steps.length} action{steps.length === 1 ? '' : 's'}
        </span>
        {CLASS_ORDER.map((cls) => (
          <span key={cls}>
            {' · '}
            <span className={CLASS_TEXT_STYLE[cls]}>
              {counts[cls]} {cls.toLowerCase()}
            </span>
          </span>
        ))}
      </div>
      <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{systemsTouched} systems touched</div>
    </div>
  );
}
