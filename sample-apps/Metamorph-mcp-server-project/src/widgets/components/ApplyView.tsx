import React from 'react';
import type { ApplyVM } from '../lib/view-model';
import { EvidenceChip } from './Evidence';
import { CmdRow } from './Parts';
import { SEVERITY_LABEL, SeverityIcon } from './Severity';

// Apply is a projection: the patch ran on a temporary copy. Same page grammar as the Plan view: scores and note on the
// left, hairline-separated lists on the right. The after score uses the dithered PROJECTED treatment.

const RISK_WORD = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' } as const;
const SHOWN = 5;

// "Run: git apply fix.patch" -> a copyable command; other steps stay plain text.
function commandOf(step: string): string | undefined {
  const m = step.match(/^Run:\s*(.+?)\.?$/);
  return m ? m[1] : undefined;
}

function More({ shown, total }: { shown: number; total: number }) {
  return total > shown ? <p className="muted small ap-more">Showing {shown} of {total}.</p> : null;
}

export function ApplyView({ vm }: { vm: ApplyVM }) {
  const d = vm.scoreDelta;
  const delta = d > 0 ? `+${d}` : `${d}`;
  const remaining = vm.remaining.slice(0, SHOWN);
  return (
    <div className="grid ap" data-view="apply">
      <div className="col-side">
        <section className="pl-intro">
          <p className="eyebrow">Projected result</p>
          <h2 className="pl-h">
            Stage {vm.stage.index !== undefined ? `${vm.stage.index}: ` : ''}
            {vm.stage.title}
          </h2>
          <p className="muted small">{RISK_WORD[vm.stage.risk]}. Nothing in your repository was changed.</p>
        </section>
        <section className="pl-scores" aria-label="Score before and projected after">
          <div>
            <p className="eyebrow">Score before</p>
            <p className="numeral numeral-md">{vm.scoreBefore}</p>
            <p className="of">out of 100</p>
          </div>
          <div>
            <p className="eyebrow">Projected after</p>
            <p className="numeral numeral-md num-projected" aria-label={`Projected ${vm.scoreAfter}`}>
              {vm.scoreAfter}
            </p>
            <p className="of">
              <EvidenceChip kind="projected" />
              <span className="ap-delta" aria-label={`Score change ${delta}`}>
                {delta}
              </span>
            </p>
          </div>
        </section>
        <p className="ap-note small" role="note">
          {vm.note ?? 'Projected result: the changes ran on a temporary copy. Nothing in your repository was changed.'}
        </p>
      </div>
      <div className="col-main">
        <section aria-labelledby="ap-fixed">
          <h2 id="ap-fixed" className="h-small">
            Findings fixed ({vm.fixedCount})
          </h2>
          {vm.findingsFixed.length === 0 ? (
            <p className="muted">No findings were fixed by this stage.</p>
          ) : (
            <ul className="ap-list">
              {vm.findingsFixed.map((f, i) => (
                <li key={`${f}-${i}`} className="ap-row mono">
                  {f}
                </li>
              ))}
            </ul>
          )}
          <More shown={vm.findingsFixed.length} total={vm.fixedCount} />
        </section>

        <section aria-labelledby="ap-rem">
          <h2 id="ap-rem" className="h-small">
            Still remaining, top {Math.min(SHOWN, vm.remainingCount)} of {vm.remainingCount}
          </h2>
          {remaining.length === 0 ? (
            <p className="muted">Nothing remaining.</p>
          ) : (
            <ul className="ap-list">
              {remaining.map((r, i) => (
                <li key={`${r.id}-${i}`} className={`ap-row ap-rem sev-${r.severity}`}>
                  <span className="fr-sev">
                    <SeverityIcon severity={r.severity} />
                    {SEVERITY_LABEL[r.severity]}
                  </span>
                  <span className="ap-title">{r.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {vm.files.length > 0 && (
          <section aria-labelledby="ap-files">
            <h2 id="ap-files" className="h-small">
              Files changed ({vm.fileCount})
            </h2>
            <ul className="ap-list">
              {vm.files.map((f, i) => (
                <li key={`${f.path}-${i}`} className="ap-row ap-file">
                  <span className="mono">{f.path}</span>
                  <span className="tag">{f.action}</span>
                </li>
              ))}
            </ul>
            <More shown={vm.files.length} total={vm.fileCount} />
          </section>
        )}

        {vm.howToApply.length > 0 && (
          <section aria-labelledby="ap-how">
            <h2 id="ap-how" className="h-small">
              How to apply it
            </h2>
            <ol className="ap-how">
              {vm.howToApply.map((s, i) => {
                const cmd = commandOf(s);
                return (
                  <li key={i}>
                    <span className="stage-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="ap-how-body">{cmd ? <CmdRow text={cmd} label="Copy" /> : <p>{s}</p>}</div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
        {vm.nextStep && <p className="muted small ap-next">{vm.nextStep}</p>}
      </div>
    </div>
  );
}
