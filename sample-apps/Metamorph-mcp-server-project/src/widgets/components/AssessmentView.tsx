import React, { useState } from 'react';
import { SeverityStrip as Strip, useCopy } from './Parts';
import { scoreBand, type AssessmentVM, type FindingVM, type Severity } from '../lib/view-model';
import { nextCallAfterAssessment, type NextCall } from '../lib/calls';
import { EvidenceChip, type Evidence } from './Evidence';
import { SEVERITY_LABEL, SeverityIcon } from './Severity';
import { Logo } from './Logo';
import { WingVeins } from './WingVeins';

// What the host lets the widget do. Every member can be missing: the widget then falls back to copying the call.
export interface Actions {
  callTool?: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  requestFullscreen?: () => Promise<void>;
  openExternal?: (url: string) => void | Promise<void>;
}

// Miller: show the top 5-7 findings, the rest behind a toggle.
const VISIBLE = 5;

const BAND_TEXT = { ok: 'Healthy', warn: 'Needs work', danger: 'At risk' } as const;

export function ScoreBlock({ score, origin, compact, label = 'Modernization score' }: { score: number; origin: Evidence; compact?: boolean; label?: string }) {
  const band = scoreBand(score);
  return (
    <section className={`score ${compact ? 'score-compact' : ''}`} aria-label={`${label} ${score} out of 100`}>
      <p className="eyebrow">{label}</p>
      <p className="numeral" aria-hidden="true">
        {score}
      </p>
      <p className="score-sub">
        <span className="of">out of 100</span>
        <EvidenceChip kind={origin} />
      </p>
      <p className="band">{BAND_TEXT[band]}</p>
    </section>
  );
}

function FindingRow({ f, rank, top }: { f: FindingVM; rank: number; top: boolean }) {
  return (
    <li className={`finding-row sev-${f.severity} ${top ? 'is-top' : ''}`}>
      <span className="rank" aria-label={`Rank ${rank}`}>
        {rank}
      </span>
      <div className="fr-body">
        <p className="fr-sev">
          <SeverityIcon severity={f.severity} />
          {SEVERITY_LABEL[f.severity]}
          <span className="fr-cat">{f.category}</span>
          {f.project && <span className="fr-proj mono">{f.project}</span>}
        </p>
        <h3 className="fr-title">{f.title}</h3>
        {f.rankReason && <p className="fr-why">Ranked here: {f.rankReason}</p>}
      </div>
      <div className="fr-chips">
        {f.kev && <span className="tag tag-kev">Known exploited</span>}
        {f.epss !== undefined && <span className="tag">EPSS {f.epss.toFixed(2)}</span>}
      </div>
    </li>
  );
}

export function FindingsList({ vm }: { vm: AssessmentVM }) {
  const [all, setAll] = useState(false);
  const shown = all ? vm.findings : vm.findings.slice(0, VISIBLE);
  const partial = vm.findingCount > vm.findings.length;
  return (
    <section aria-labelledby="mm-find">
      <div className="sec-head">
        <h2 id="mm-find">Findings, ranked</h2>
        <p className="muted">
          {vm.findingCount} in total. Known exploited first, then severity, then likelihood of exploitation.
        </p>
      </div>
      {vm.findings.length === 0 ? (
        <p className="quiet">No findings. Nothing to rank.</p>
      ) : (
        <ol className="findings">
          {shown.map((f, i) => (
            <FindingRow key={`${f.id}-${i}`} f={f} rank={i + 1} top={i === 0} />
          ))}
        </ol>
      )}
      <div className="more">
        {vm.findings.length > VISIBLE && (
          <button type="button" className="btn btn-quiet" onClick={() => setAll(!all)} aria-expanded={all}>
            {all ? `Show the top ${VISIBLE}` : `Show all ${vm.findings.length} listed findings`}
          </button>
        )}
        {partial && <p className="muted small">The result lists the {vm.findings.length} highest ranked of {vm.findingCount}; the report holds the rest.</p>}
      </div>
    </section>
  );
}

function Facts({ vm }: { vm: AssessmentVM }) {
  const d = vm.dependencies;
  return (
    <section aria-labelledby="mm-facts">
      <h2 id="mm-facts" className="h-small">
        Dependencies and runtime
      </h2>
      <dl className="facts">
        {d && (
          <>
            <div>
              <dt>Checked</dt>
              <dd>
                {d.checked}
                {vm.dependencyTotal !== undefined && <span className="of"> of {vm.dependencyTotal}</span>}
              </dd>
            </div>
            <div>
              <dt>Vulnerable</dt>
              <dd>{d.vulnerable}</dd>
            </div>
            <div>
              <dt>Urgent</dt>
              <dd>{d.urgent}</dd>
            </div>
          </>
        )}
        <div className="wide">
          <dt>Stack</dt>
          <dd className="mono">{vm.stack}</dd>
        </div>
        <div className="wide">
          <dt>Runtime</dt>
          <dd className="mono">{vm.runtime.declared ?? 'not declared'}</dd>
        </div>
        <div className="wide">
          <dt>Hosting</dt>
          <dd>{vm.hosting.length ? vm.hosting.join(', ') : 'none detected'}</dd>
        </div>
      </dl>
      {d?.approximateVersions && <p className="muted small">Some versions are approximate (no lockfile).</p>}
    </section>
  );
}

function Projects({ vm }: { vm: AssessmentVM }) {
  if (vm.projects.length === 0) return null;
  return (
    <section aria-labelledby="mm-proj">
      <h2 id="mm-proj" className="h-small">
        Projects in this repository
      </h2>
      <ul className="rows">
        {vm.projects.map((p) => (
          <li key={p.path}>
            <span className="mono">{p.path}</span>
            <span className="muted">{p.stack}</span>
            <span className={p.assessed ? 'tag' : 'tag tag-off'}>{p.assessed ? 'assessed' : 'not assessed'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notes({ vm }: { vm: AssessmentVM }) {
  const notes = [...vm.notes, ...(vm.truncated ? ['Large repository: only part of it was scanned.'] : [])];
  if (notes.length === 0) return null;
  return (
    <section aria-labelledby="mm-notes">
      <h2 id="mm-notes" className="h-small">
        Notes
      </h2>
      <ul className="notes">
        {notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </section>
  );
}

// Tesler: the exact next call, composed for the user. Fitts: the primary button is large and sits in the card that
// describes what it does. Hick: at most two actions here (run, copy).
export function NextStep({ call, actions }: { call: NextCall; actions: Actions }) {
  const { state: copyState, copy } = useCopy(call.text);
  const [run, setRun] = useState<'idle' | 'running' | 'sent' | 'failed'>('idle');
  const canRun = call.complete && typeof actions.callTool === 'function';
  const onRun = async () => {
    setRun('running'); // Doherty: instant feedback before the host answers
    try {
      await actions.callTool!(call.tool, call.args);
      setRun('sent');
    } catch {
      setRun('failed');
    }
  };
  return (
    <section className="next" aria-labelledby="mm-next">
      <p className="eyebrow">Next step</p>
      <h2 id="mm-next" className="next-title">
        Plan the modernization
      </h2>
      <pre className="call mono" tabIndex={0} aria-label="The next tool call">
        {call.text}
      </pre>
      {!call.complete && <p className="muted small">This result does not include the repository URL. Copy the call and replace OWNER/REPO.</p>}
      <div className="actions">
        {canRun ? (
          <button type="button" className="btn btn-primary" onClick={onRun} disabled={run === 'running' || run === 'sent'}>
            {run === 'running' ? 'Requesting the plan…' : run === 'sent' ? 'Requested' : `Run ${call.tool}`}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={copy}>
            {copyState === 'copied' ? 'Copied' : 'Copy call'}
          </button>
        )}
        {canRun && (
          <button type="button" className="btn btn-quiet" onClick={copy}>
            {copyState === 'copied' ? 'Copied' : 'Copy call'}
          </button>
        )}
      </div>
      <p className="status small" role="status" aria-live="polite">
        {run === 'sent' && 'Requested. The plan appears in the conversation.'}
        {run === 'failed' && 'The host did not run it from here. Copy the call instead.'}
        {copyState === 'failed' && 'Copying is blocked here. Select the call above and copy it.'}
      </p>
    </section>
  );
}

export function AssessmentFull({ vm, actions }: { vm: AssessmentVM; actions: Actions }) {
  const call = nextCallAfterAssessment(vm);
  return (
    <div className="grid">
      <div className="col-side">
        <ScoreBlock score={vm.score} origin={vm.origin} />
        <Strip counts={vm.counts} />
        <Facts vm={vm} />
        <Projects vm={vm} />
        <Notes vm={vm} />
      </div>
      <div className="col-main">
        <FindingsList vm={vm} />
        <NextStep call={call} actions={actions} />
      </div>
    </div>
  );
}

// Inline: a compact summary card. One idea (the score), one finding, one action (Hick, Fitts).
export function AssessmentInline({ vm, actions }: { vm: AssessmentVM; actions: Actions }) {
  const top = vm.findings[0];
  const [state, setState] = useState<'idle' | 'asking' | 'failed'>('idle');
  const open = async () => {
    setState('asking');
    try {
      if (!actions.requestFullscreen) throw new Error('no fullscreen');
      await actions.requestFullscreen();
      setState('idle');
    } catch {
      setState('failed');
    }
  };
  return (
    <section className="card-inline" aria-label="Assessment summary">
      <div className="ci-top">
        <Logo size={24} title="Metamorph" />
        <span className="wordmark">metamorph</span>
      </div>
      <div className="ci-main">
        <ScoreBlock score={vm.score} origin={vm.origin} compact />
        <div className="ci-side">
          <Strip counts={vm.counts} />
          {top && (
            <div className={`ci-top-finding sev-${top.severity}`}>
              <p className="eyebrow">Top finding</p>
              <p className="ci-title">{top.title}</p>
            </div>
          )}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={open} disabled={state === 'asking'}>
          {state === 'asking' ? 'Opening…' : 'Open full view'}
        </button>
        {state === 'failed' && <span className="muted small">This host cannot expand the widget.</span>}
      </div>
    </section>
  );
}

// Doherty: the skeleton appears at once; there is no spinner and no loop, only flat dithered blocks.
export function LoadingState() {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <span className="sr-only">Loading results</span>
      <div className="grid" aria-hidden="true">
        <div className="col-side">
          <div className="sk sk-numeral" />
          <div className="sk sk-line w40" />
          <div className="sk sk-strip" />
          <div className="sk sk-line w60" />
          <div className="sk sk-line w60" />
        </div>
        <div className="col-main">
          <div className="sk sk-line w40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sk sk-row" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ onCopy }: { onCopy?: () => void }) {
  const text = 'assess_project {"repo_url": "https://github.com/OWNER/REPO"}';
  const { state, copy } = useCopy(text);
  return (
    <div className="state state-empty" role="status">
      <WingVeins width={320} className="art" />
      <h2 className="state-title">No results yet</h2>
      <p className="muted">Nothing has been assessed in this conversation. Start with the first call:</p>
      <pre className="call mono">{text}</pre>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            onCopy?.();
            void copy();
          }}
        >
          {state === 'copied' ? 'Copied' : 'Copy call'}
        </button>
      </div>
    </div>
  );
}

export function ErrorState({ headline, detail }: { headline: string; detail?: string }) {
  const text = 'assess_project {"repo_url": "https://github.com/OWNER/REPO"}';
  const { state, copy } = useCopy(text);
  return (
    <div className="state state-error" role="alert">
      <h2 className="state-title">{headline}</h2>
      {detail && <p className="muted mono small">{detail}</p>}
      <p>Next step: run the assessment again and the result will replace this message.</p>
      <pre className="call mono">{text}</pre>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={copy}>
          {state === 'copied' ? 'Copied' : 'Copy call'}
        </button>
      </div>
    </div>
  );
}

export type { Severity };
