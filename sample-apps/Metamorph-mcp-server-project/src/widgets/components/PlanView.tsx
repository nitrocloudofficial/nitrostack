import React, { useState } from 'react';
import { previewCall } from '../lib/calls';
import type { PlanVM, Risk, StageVM } from '../lib/view-model';
import type { Actions } from './AssessmentView';
import { EvidenceChip, Swatch } from './Evidence';
import { CopyButton, Fold } from './Parts';
import { SeverityIcon } from './Severity';

// The plan is a vertical stepper: one rule connects the stages in order. Hick: each stage has at most one action.
// The preview button is the only call the widget runs by itself (read scope, changes nothing); plan and write tools
// are never called from here.

const GOALS = [
  { id: 'patch_advisory', label: 'Patch advisories', what: 'Fix vulnerable packages' },
  { id: 'upgrade_runtime', label: 'Upgrade runtime', what: 'Also leave an end-of-life runtime' },
  { id: 'modernize_all', label: 'Modernize all', what: 'Everything the plan can do' }
] as const;

const RISK_ICON: Record<Risk, 'low' | 'medium' | 'high'> = { low: 'low', medium: 'medium', high: 'high' };
const RISK_WORD: Record<Risk, string> = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' };
const SHOWN_STEPS = 3;

function Goal({ goal }: { goal: string }) {
  const known = GOALS.some((g) => g.id === goal);
  return (
    <section aria-labelledby="pl-goal">
      <h2 id="pl-goal" className="h-small">
        Goal of this plan
      </h2>
      <ul className="pl-chips" aria-label="Goal">
        {GOALS.map((g) => (
          <li key={g.id} className={`pl-chip ${g.id === goal ? 'pl-chip-on' : ''}`} aria-current={g.id === goal ? 'true' : undefined} title={g.what}>
            {g.label}
          </li>
        ))}
      </ul>
      {!known && <p className="muted small">The plan reports the goal "{goal}".</p>}
      <p className="muted small">Shown for reference. To change the goal, ask for a new plan.</p>
    </section>
  );
}

function Scores({ vm }: { vm: PlanVM }) {
  if (vm.scoreBefore === undefined && vm.scoreAfter === undefined) return null;
  return (
    <section className="pl-scores" aria-label="Score before and projected after">
      <div>
        <p className="eyebrow">Score now</p>
        <p className="numeral numeral-md">{vm.scoreBefore ?? '–'}</p>
        <p className="of">out of 100</p>
      </div>
      {vm.scoreAfter !== undefined && (
        <div>
          <p className="eyebrow">Projected, all stages</p>
          <p className="numeral numeral-md num-projected" aria-label={`Projected ${vm.scoreAfter}`}>
            {vm.scoreAfter}
          </p>
          <p className="of">
            <EvidenceChip kind="projected" />
          </p>
        </div>
      )}
    </section>
  );
}

function Stage({ s, vm, primary, last, actions }: { s: StageVM; vm: PlanVM; primary: boolean; last: boolean; actions: Actions }) {
  const [all, setAll] = useState(false);
  const [run, setRun] = useState<'idle' | 'running' | 'sent' | 'failed'>('idle');
  const call = previewCall(vm, s);
  const canRun = call.complete && typeof actions.callTool === 'function';
  const steps = all ? s.steps : s.steps.slice(0, SHOWN_STEPS);
  const hidden = s.steps.length - SHOWN_STEPS;
  const onRun = async () => {
    setRun('running');
    try {
      await actions.callTool!(call.tool, call.args);
      setRun('sent');
    } catch {
      setRun('failed');
    }
  };
  return (
    <li className={`stage ${last ? 'stage-last' : ''}`}>
      <span className="stage-n" aria-hidden="true">
        {s.index}
      </span>
      <div className="stage-body">
        <p className="eyebrow">
          Stage {s.index} <span className="stage-kind">{s.kind}</span>
        </p>
        <div className="stage-head">
          <h3 className="stage-title">{s.title}</h3>
          <p className="stage-tags">
            <span className={`tag ${s.automated ? 'tag-auto' : 'tag-guided'}`}>{s.automated ? 'Automated' : 'Guided'}</span>
            <span className={`risk sev-${s.risk === 'high' ? 'high' : s.risk === 'medium' ? 'medium' : 'low'}`}>
              <SeverityIcon severity={RISK_ICON[s.risk]} />
              {RISK_WORD[s.risk]}
            </span>
            {s.scoreAfter !== undefined && (
              <span className="proj-chip" title="Projected score after this stage and the ones before it. Nothing was changed.">
                <Swatch kind="projected" />
                {s.scoreAfter} projected
              </span>
            )}
          </p>
        </div>
        <ul className="stage-steps">
          {steps.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        {hidden > 0 && (
          <button type="button" className="btn-text" onClick={() => setAll(!all)} aria-expanded={all}>
            {all ? 'Show fewer steps' : `Show ${hidden} more step${hidden === 1 ? '' : 's'}`}
          </button>
        )}
        <div className="stage-foot">
          <div className="stage-foot-text">
            {s.rollback && (
              <p className="stage-rollback">
                <strong>Rollback.</strong> {s.rollback}
              </p>
            )}
            {!s.automated && <p className="muted small stage-guided">Guided stage: follow the steps yourself, then run assess_project to confirm.</p>}
          </div>
          {s.automated && (
            <div className="stage-act">
              <div className="actions">
                {canRun ? (
                  <button type="button" className={`btn ${primary ? 'btn-primary' : 'btn-quiet'}`} onClick={onRun} disabled={run === 'running' || run === 'sent'}>
                    {run === 'running' ? 'Requesting…' : run === 'sent' ? 'Requested' : 'Preview this stage'}
                  </button>
                ) : (
                  <CopyButton text={call.text} label="Copy preview call" className={`btn ${primary ? 'btn-primary' : 'btn-quiet'}`} />
                )}
                {canRun && <CopyButton text={call.text} label="Copy call" className="btn-text" />}
              </div>
            </div>
          )}
        </div>
        {s.automated && (
          <>
            {!canRun && <code className="mono small muted stage-call">{call.text}</code>}
            {!call.complete && <p className="muted small">The result does not include the repository URL. Replace OWNER/REPO.</p>}
            <p className="status small" role="status" aria-live="polite">
              {run === 'sent' && 'Requested. The preview appears in the conversation. Nothing is changed by a preview.'}
              {run === 'failed' && 'The host did not run it from here. Copy the call instead.'}
            </p>
          </>
        )}
      </div>
    </li>
  );
}

export function PlanView({ vm, actions }: { vm: PlanVM; actions: Actions }) {
  const firstAuto = vm.stages.findIndex((s) => s.automated);
  const auto = vm.stages.filter((s) => s.automated).length;
  return (
    <div className="grid pl" data-view="plan">
      <div className="col-side">
        <section className="pl-intro">
          <p className="eyebrow">Modernization plan</p>
          <h2 className="pl-h">
            {vm.stages.length} stage{vm.stages.length === 1 ? '' : 's'}, {auto} automated
          </h2>
          <p className="muted small">Stack: {vm.stack}. Stages run in order; each one builds on the one before.</p>
        </section>
        <Scores vm={vm} />
        <Goal goal={vm.goal} />
        {vm.hint && (
          <Fold summary="Server hint" hint="Next call">
            <p className="small">{vm.hint}</p>
          </Fold>
        )}
      </div>
      <div className="col-main">
        <ol className="stepper" aria-label="Stages in order">
          {vm.stages.map((s, i) => (
            <Stage key={s.id} s={s} vm={vm} primary={i === firstAuto} last={i === vm.stages.length - 1} actions={actions} />
          ))}
        </ol>
      </div>
    </div>
  );
}
