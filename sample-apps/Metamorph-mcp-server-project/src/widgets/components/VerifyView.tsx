import React, { useState } from 'react';
import { reportFromRuns, resumeCall } from '../lib/calls';
import { formatDuration, phpLabel, signed } from '../lib/format';
import type { CheckVM, RunVM, VerifyVM } from '../lib/view-model';
import type { Actions } from './AssessmentView';
import { EvidenceChip } from './Evidence';
import { CopyButton, StatusMark } from './Parts';

// The verdict follows the evidence-pattern rule: VERIFIED is a solid block in the verified colour, NOT VERIFIED is a
// hollow outline. The word is always there. `verified` can only be true when the tool said so and listed no reason
// (see toVerify), so a solid block can never come from a missing field.

const RUN_WORD: Record<string, string> = { queued: 'Queued', running: 'Running', completed: 'Finished', failed: 'Failed', timed_out: 'Timed out' };

function Verdict({ vm }: { vm: VerifyVM }) {
  const waiting = vm.status === 'queued' || vm.status === 'running';
  const t = vm.patched.tests;
  const sub = vm.verified
    ? `The build succeeded and ${t ? `${t.passed} test${t.passed === 1 ? '' : 's'}` : 'the tests'} passed on the patched code.`
    : waiting
      ? 'The runner has not finished. This is not a pass yet.'
      : 'This is not a pass. Do not treat the patch as tested.';
  return (
    <section className={`verdict ${vm.verified ? 'verdict-yes' : 'verdict-no'}`} aria-label={vm.verified ? 'Verified' : 'Not verified'}>
      <p className="eyebrow verdict-eyebrow">Verification{vm.stage ? ` of ${vm.stage}` : ''}</p>
      <p className="verdict-word">
        <span className="verdict-box" aria-hidden="true" />
        {vm.verified ? 'Verified' : 'Not verified'}
      </p>
      <p className="verdict-sub">{sub}</p>
      <p className="verdict-ev">
        <EvidenceChip kind={vm.verified ? 'measured' : 'unverified'} label={vm.verified ? 'Measured on a runner' : 'Unverified'} />
        <span className="verdict-state">{RUN_WORD[vm.status] ?? vm.status}</span>
      </p>
    </section>
  );
}

function Reasons({ vm }: { vm: VerifyVM }) {
  if (vm.verified) return null;
  if (vm.reasons.length === 0) return <p className="muted small">The tool gave no reason. Treat the patch as not verified.</p>;
  return (
    <section aria-labelledby="vf-why">
      <h2 id="vf-why" className="h-small">
        Why it is not verified
      </h2>
      <ul className="vf-reasons">
        {vm.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {vm.reasonCount > vm.reasons.length && <p className="muted small">{vm.reasonCount - vm.reasons.length} more reasons are in the tool result.</p>}
    </section>
  );
}

// Runner notes: which PHP the runner picked, whether the lockfile was regenerated, and the server's own notes.
function RunnerNotes({ vm }: { vm: VerifyVM }) {
  const php = vm.patched.php;
  const rows: string[] = [];
  if (php) {
    const label = phpLabel(php);
    rows.push(label ? `${label} was selected for composer and tests${php.supported ? '.' : ', but the runner image does not support it.'}` : 'The runner reported its PHP selection without a version.');
    if (php.lockRegenerated && !vm.reasons.some((r) => /composer\.lock/.test(r))) rows.push('composer.lock was unusable and was regenerated in a scratch copy, so the committed lockfile was not tested.');
  }
  rows.push(...vm.notes);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="vf-notes">
      <h2 id="vf-notes" className="h-small">
        Runner notes
      </h2>
      <ul className="notes vf-notes">
        {rows.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </section>
  );
}

function Compare({ vm }: { vm: VerifyVM }) {
  const m = vm.measured;
  if (!m) {
    return (
      <section aria-labelledby="vf-cmp">
        <h2 id="vf-cmp" className="h-small">
          Measured, before and after
        </h2>
        <p className="quiet">No before and after score yet. It needs both runs to finish and both results to be readable.</p>
      </section>
    );
  }
  const rows: Array<{ key: string; label: string; sub: string; s: number; n: number }> = [
    { key: 'b', label: 'Baseline', sub: 'without the patch', s: m.baseline, n: m.baselineFindings },
    { key: 'p', label: 'Patched', sub: 'with the patch', s: m.patched, n: m.patchedFindings }
  ];
  const tools = new Map<string, { b?: number; p?: number }>();
  for (const t of m.baselineSide.perTool) tools.set(t.tool, { ...tools.get(t.tool), b: t.reported });
  for (const t of m.patchedSide.perTool) tools.set(t.tool, { ...tools.get(t.tool), p: t.reported });
  const active = [...tools.entries()].filter(([, v]) => (v.b ?? 0) > 0 || (v.p ?? 0) > 0);
  const quiet = [...tools.entries()].filter(([, v]) => !((v.b ?? 0) > 0 || (v.p ?? 0) > 0));
  return (
    <section aria-labelledby="vf-cmp">
      <div className="sec-head">
        <h2 id="vf-cmp" className="h-small vf-cmp-h">
          Measured, before and after
        </h2>
        <EvidenceChip kind="measured" label="Measured by the runner tools" />
      </div>
      <ul className="cmp">
        {rows.map((r) => (
          <li key={r.key} className="cmp-row">
            <span className="cmp-label">
              {r.label}
              <span className="cmp-sub">{r.sub}</span>
            </span>
            <span className="cmp-num">{r.s}</span>
            <span className="bar bar-measured" role="img" aria-label={`${r.label} score ${r.s} out of 100`}>
              <span style={{ ['--v' as string]: `${r.s}%` }} />
            </span>
            <span className="cmp-n">{r.n} findings</span>
          </li>
        ))}
      </ul>
      <p className="cmp-delta">
        <strong>{signed(m.delta)}</strong> points, {m.delta > 0 ? 'higher is healthier' : m.delta < 0 ? 'lower than the baseline' : 'no change'}. Findings are counted after removing duplicates between tools.
      </p>
      {tools.size > 0 && (
        <table className="tbl vf-tools">
          <caption className="sr-only">Findings reported per tool, before and after</caption>
          <thead>
            <tr>
              <th scope="col">Tool</th>
              <th scope="col" className="num">
                Baseline
              </th>
              <th scope="col" className="num">
                Patched
              </th>
            </tr>
          </thead>
          <tbody>
            {active.map(([tool, v]) => (
              <tr key={tool}>
                <th scope="row" className="mono">
                  {tool}
                </th>
                <td className="num">{v.b ?? '\u2013'}</td>
                <td className="num">{v.p ?? '\u2013'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {quiet.length > 0 && <p className="muted small">No findings in either run from {quiet.map(([t]) => t).join(', ')}.</p>}
      {m.note && <p className="muted small">{m.note}</p>}
    </section>
  );
}

function ChecksTable({ rows }: { rows: CheckVM[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th scope="col">Check</th>
          <th scope="col">Result</th>
          <th scope="col" className="num">
            Time
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.tool}>
            <th scope="row" className="mono">
              {c.tool}
            </th>
            <td>
              <StatusMark status={c.status} />
            </td>
            <td className="num">{c.status === 'skipped' ? '\u2013' : formatDuration(c.durationMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Checks({ vm }: { vm: VerifyVM }) {
  if (vm.checks.length === 0) return null;
  const half = Math.ceil(vm.checks.length / 2);
  const counts = vm.checks.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }), {} as Record<string, number>);
  return (
    <section aria-labelledby="vf-checks">
      <div className="sec-head">
        <h2 id="vf-checks" className="h-small vf-cmp-h">
          Checks on the patched run
        </h2>
        <p className="muted small">
          {counts.pass ?? 0} passed, {counts.fail ?? 0} failed, {counts.skipped ?? 0} skipped
          {counts.error ? `, ${counts.error} could not run` : ''}
          {vm.checkCount > vm.checks.length ? `. Showing ${vm.checks.length} of ${vm.checkCount}.` : '.'}
        </p>
      </div>
      <div className="vf-checks">
        <ChecksTable rows={vm.checks.slice(0, half)} />
        {vm.checks.length > 1 && <ChecksTable rows={vm.checks.slice(half)} />}
      </div>
    </section>
  );
}

function RunLinks({ vm, actions }: { vm: VerifyVM; actions: Actions }) {
  const [said, say] = useState('');
  const link = (r: RunVM, label: string) =>
    r.htmlUrl ? (
      <button
        type="button"
        className="btn btn-quiet"
        onClick={async () => {
          try {
            if (!actions.openExternal) throw new Error('none');
            await actions.openExternal(r.htmlUrl as string);
            say('');
          } catch {
            say(`This host cannot open links. The address is ${r.htmlUrl}`);
          }
        }}
      >
        {label}
      </button>
    ) : null;
  const a = link(vm.patched, 'Open the patched run');
  const b = link(vm.baseline, 'Open the baseline run');
  if (!a && !b) return null;
  return (
    <div className="vf-links">
      <div className="actions">
        {a}
        {b}
      </div>
      {said && (
        <p className="status small" role="status">
          {said}
        </p>
      )}
    </div>
  );
}

export function VerifyView({ vm, actions }: { vm: VerifyVM; actions: Actions }) {
  const waiting = vm.status === 'queued' || vm.status === 'running';
  const resume = resumeCall(vm);
  const report = reportFromRuns(vm);
  // One primary action: check again while it runs, else record the run in the report.
  const primary = waiting && resume ? { call: resume, label: 'Copy call to check again' } : { call: report, label: vm.verified ? 'Copy call to record this in the report' : 'Copy call to record the result in the report' };
  return (
    <div className="grid vf" data-view="verify">
      <div className="col-side">
        <Verdict vm={vm} />
        <div className="vf-next">
          <div className="actions">
            <CopyButton text={primary.call.text} label={primary.label} className="btn btn-primary" />
            <RunLinks vm={vm} actions={actions} />
          </div>
          <code className="mono small muted vf-call">{primary.call.text}</code>
          {vm.hint && <p className="muted small">{vm.hint}</p>}
        </div>
        <Reasons vm={vm} />
        <RunnerNotes vm={vm} />
      </div>
      <div className="col-main">
        <Compare vm={vm} />
        <Checks vm={vm} />
      </div>
    </div>
  );
}
