'use client';

import { useState } from 'react';
import { CASE_STAGES } from '@/lib/utils';

export type CaseStatusStepperProps = {
  stage: number;
  activeSelectedStage?: number;
  onSelectStage?: (stageNumber: number) => void;
};

const STAGE_DESCRIPTIONS: Record<number, { title: string; subtitle: string; details: string }> = {
  1: {
    title: 'Stage 1: Case Submitted',
    subtitle: 'Intake details & patient consent logged',
    details: 'Hospital submitted patient details, procedure estimate, and clinical notes. Patient digital authorization recorded on file.',
  },
  2: {
    title: 'Stage 2: Objectivity Check',
    subtitle: 'Automated rate audit against CGHS master schedule',
    details: 'Objectivity agent cross-checked hospital procedure codes and cost estimates against neutral CGHS rate caps. Inconsistencies or overbilling are flagged automatically.',
  },
  3: {
    title: 'Stage 3: Insurer Review',
    subtitle: 'Policy coverage check & adjudication',
    details: 'Insurance agent reviews pre-audited claim, verifies policy waiting periods and exclusions, and inputs approved claim amount.',
  },
  4: {
    title: 'Stage 4: Final Decision & Settlement',
    subtitle: 'Ledger finalized & 0% APR financing options generated',
    details: 'Claim decision committed. Approved funds disbursed to hospital and out-of-pocket patient gap covered with zero-interest financing.',
  },
};

export function CaseStatusStepper({
  stage,
  activeSelectedStage,
  onSelectStage,
}: CaseStatusStepperProps) {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  if (stage === 0) {
    return (
      <div className="glass-nav no-print border-b py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
            <span>No active case started — submit patient details to initialize claim timeline.</span>
          </div>
        </div>
      </div>
    );
  }

  const currentActive = activeSelectedStage ?? selectedStage ?? stage;

  function handleStageClick(n: number) {
    setSelectedStage(n);
    if (onSelectStage) {
      onSelectStage(n);
    }
  }

  return (
    <div className="glass-nav no-print border-b">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1 scrollbar-none">
          {CASE_STAGES.map((label, i) => {
            const n = i + 1;
            const done = stage > n;
            const isCurrentStage = stage === n;
            const isSelected = currentActive === n;

            return (
              <div key={label} className="flex flex-1 items-center gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => handleStageClick(n)}
                  className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 backdrop-blur-md transition-all text-left focus-visible:outline-none ${
                    isSelected
                      ? 'bg-slate-900/80 text-white shadow-2xs font-bold ring-2 ring-slate-900/20'
                      : done
                        ? 'hover:bg-teal-500/10 text-teal-900 font-semibold'
                        : isCurrentStage
                          ? 'hover:bg-white/50 text-slate-900 font-bold'
                          : 'hover:bg-white/50 text-slate-600'
                  }`}
                  title={`Click to view details for Stage ${n}: ${label}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-teal-500 text-white shadow-xs'
                        : done
                          ? 'bg-teal-600 text-white shadow-xs'
                          : isCurrentStage
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'border border-white/50 bg-white/30 text-slate-400 group-hover:border-slate-400'
                    }`}
                  >
                    {done ? (
                      <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      n
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span
                      className={`text-xs sm:text-sm tracking-tight ${
                        isSelected
                          ? 'text-white font-extrabold'
                          : isCurrentStage
                            ? 'text-slate-900 font-bold'
                            : done
                              ? 'text-teal-800 font-semibold'
                              : 'text-slate-500 font-medium'
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-[9px] opacity-70 font-mono">
                      {isSelected ? '● Viewing Stage' : done ? '✓ Completed' : isCurrentStage ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </button>

                {i !== CASE_STAGES.length - 1 && (
                  <div className="mx-2 hidden sm:block flex-1 h-0.5 min-w-[20px] rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        stage > n ? 'bg-teal-500' : 'bg-transparent'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Stage Detail Panel */}
        {selectedStage && STAGE_DESCRIPTIONS[selectedStage] && (
          <div className="mt-3 rounded-xl border border-teal-300/40 bg-teal-500/10 backdrop-blur-md p-3 text-xs animate-route-in flex items-center justify-between">
            <div>
              <span className="font-bold text-teal-950">
                {STAGE_DESCRIPTIONS[selectedStage].title}:
              </span>{' '}
              <span className="text-teal-900 font-semibold">
                {STAGE_DESCRIPTIONS[selectedStage].subtitle}
              </span>
              <p className="mt-0.5 text-[11px] text-teal-800 leading-relaxed">
                {STAGE_DESCRIPTIONS[selectedStage].details}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStage(null)}
              className="ml-3 text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-white/50 backdrop-blur-md border border-teal-300/40 px-2 py-1 rounded-lg shrink-0"
            >
              ✕ Close Info
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
