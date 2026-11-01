import React, { useEffect, useRef, useState } from 'react';
import { clock, countdownStart, reportCall, repoLabel, secondsLeft } from '../lib/calls';
import type { ReportFileVM, ReportFormatId, ReportVM } from '../lib/view-model';
import { EvidenceChip } from './Evidence';
import { ScoreBlock, type Actions } from './AssessmentView';
import { CopyButton, Fold, SeverityStrip, copyText } from './Parts';
import { SEVERITY_LABEL, SeverityIcon } from './Severity';

// Peak-end: this is the END of the flow. One idea per region: the score and its state on the left, the three files
// (the thing the user came for) on the right, with the PDF as the single accented action.

const WHAT_IS_INSIDE: Record<ReportFormatId, (pages?: number) => string> = {
  pdf: (pages) => `${pages ? `${pages} pages: ` : ''}ranked findings, the staged plan, dependencies and four appendices.`,
  sarif: () => 'Every finding in SARIF 2.1.0, for code scanning tools and editors.',
  sbom: () => 'The dependency list as a CycloneDX 1.5 bill of materials.'
};
const FORMAT_TAG: Record<ReportFormatId, string> = { pdf: 'PDF', sarif: 'SARIF', sbom: 'SBOM' };

// Mirrors Appendix D of the PDF (src/modules/report/pdf.ts, knownLimits), shortened.
const LIMITS = [
  'Download links last 10 minutes and live in the memory of one server. After that, run generate_report again.',
  'The score counts only what Metamorph checks. 100 means nothing it detects, not that the code is secure.',
  'Measured means a tool run by Metamorph produced the number. Projected means an estimate; nothing was built or tested for it.',
  'Findings that rest on a version guessed from a range (no lockfile) count at half weight and are marked approximate.',
  'Text outside Latin, Greek and Cyrillic shows as "?" in the PDF. The SARIF and SBOM files keep the original text.'
];

// Blob link for a file the server embedded because it could not issue a clickable link. Revoked on unmount.
function useBlobUrl(inline: ReportFileVM['inline']): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!inline) return undefined;
    let made: string | undefined;
    try {
      let part: BlobPart;
      if (inline.encoding === 'base64') {
        const bin = atob(inline.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        part = bytes;
      } else part = inline.data;
      made = URL.createObjectURL(new Blob([part], { type: inline.mimeType }));
      setUrl(made);
    } catch {
      setUrl(undefined);
    }
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [inline]);
  return url;
}

function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [on]);
  return now;
}

type Say = (text: string) => void;

// The signed URL: openExternal (the host's way), else window.open, else copy the link so the user can paste it.
async function openLink(url: string, actions: Actions, say: Say): Promise<void> {
  try {
    if (!actions.openExternal) throw new Error('no openExternal');
    await actions.openExternal(url);
    say('Opening the file in your browser.');
    return;
  } catch {
    /* fall through to window.open */
  }
  try {
    const w = window.open(url, '_blank');
    if (w) {
      w.opener = null;
      say('Opening the file in a new tab.');
      return;
    }
  } catch {
    /* fall through to copy */
  }
  say((await copyText(url)) ? 'This host blocks new windows. The link is copied: paste it into a browser.' : 'This host blocks new windows and copying. Select the link in the message above.');
}

function FileRow({ f, pages, primary, expired, actions, say }: { f: ReportFileVM; pages?: number; primary: boolean; expired: boolean; actions: Actions; say: Say }) {
  const blob = useBlobUrl(f.href ? undefined : f.inline);
  const label = `${FORMAT_TAG[f.format]} file`;
  return (
    <li className="rp-file">
      <span className="rp-fmt" aria-hidden="true">
        {FORMAT_TAG[f.format]}
      </span>
      <div className="rp-info">
        <h3 className="rp-name">{f.label}</h3>
        <p className="rp-what">{WHAT_IS_INSIDE[f.format](pages)}</p>
        <p className="rp-meta mono">
          {f.fileName} <span className="rp-size">{f.sizeLabel}</span>
        </p>
        {!f.href && !blob && (f.path ?? f.uri) && <p className="rp-meta mono rp-path">{f.path ?? f.uri}</p>}
      </div>
      <div className="rp-act">
        {f.href ? (
          <>
            <button type="button" className={`btn ${primary && !expired ? 'btn-primary' : 'btn-quiet'}`} disabled={expired} onClick={() => void openLink(f.href as string, actions, say)}>
              {expired ? 'Expired' : 'Download'}
              <span className="sr-only"> {label}</span>
            </button>
            {!expired && <CopyButton text={f.href} label="Copy link" className="btn-text" aria={`Copy the ${label} link`} />}
          </>
        ) : blob ? (
          <a className={`btn ${primary ? 'btn-primary' : 'btn-quiet'}`} href={blob} download={f.fileName}>
            Save<span className="sr-only"> {label}</span>
          </a>
        ) : (
          <span className="tag tag-off">No link</span>
        )}
      </div>
    </li>
  );
}

// A stylised A4 page built in CSS from the real numbers. It is an illustration, not a rendering of the PDF: a real
// preview is not possible in the sandbox, and the caption says so.
export function CoverPreview({ vm }: { vm: ReportVM }) {
  const repo = repoLabel(vm.repoUrl);
  const present = vm.counts.filter((c) => c.count > 0);
  return (
    <figure className="cover">
      <div className="cover-page" aria-hidden="true">
        <div className="cover-in">
        <span className="cover-brand">metamorph</span>
        <span className="cover-title">Assessment report</span>
        {repo && <span className="cover-repo mono">{repo}</span>}
        <span className="cover-score">{vm.score}</span>
        <span className="cover-of">out of 100</span>
        <span className="cover-strip">
          {present.map((c) => (
            <span key={c.severity} className={`sev-${c.severity}`} style={{ flexGrow: c.count }} />
          ))}
        </span>
        <span className="cover-foot">
          {vm.findingTotal} finding{vm.findingTotal === 1 ? '' : 's'}
          {vm.pages !== undefined ? `, ${vm.pages} pages` : ''}
        </span>
        </div>
      </div>
      <figcaption>Cover preview (illustration)</figcaption>
    </figure>
  );
}

function TopFindings({ vm }: { vm: ReportVM }) {
  if (vm.topFindings.length === 0) return <p className="quiet">No findings. The report confirms a clean result.</p>;
  return (
    <ol className="rp-top">
      {vm.topFindings.map((t, i) => (
        <li key={i} className={`sev-${t.severity}`}>
          <span className="rank rank-sm">{i + 1}</span>
          <span className="fr-sev">
            <SeverityIcon severity={t.severity} />
            {SEVERITY_LABEL[t.severity]}
          </span>
          <span className="rp-top-title">{t.title}</span>
        </li>
      ))}
    </ol>
  );
}

export function ReportView({ vm, actions }: { vm: ReportVM; actions: Actions }) {
  const linked = vm.files.some((f) => f.href);
  const minutes = vm.expiresInMinutes ?? 10;
  const start = useRef<number>(countdownStart(vm.generatedAt, minutes, Date.now()));
  const now = useNow(linked);
  const left = secondsLeft(start.current, minutes, now);
  const expired = linked && left === 0;
  const [said, say] = useState('');
  const call = reportCall(vm);
  const embedded = !linked && vm.files.some((f) => f.inline);
  const order = vm.files.slice().sort((a, b) => (a.format === 'pdf' ? -1 : b.format === 'pdf' ? 1 : 0));

  return (
    <div className="grid rp" data-view="report">
      <div className="col-side">
        <ScoreBlock score={vm.score} origin={vm.origin} label="Score in this report" />
        <SeverityStrip counts={vm.counts} />
        <div className="rp-state">
          <EvidenceChip kind="unverified" label="Verification not recorded" />
          <p className="muted small">
            This result carries no runner verification. Run verify_patch, then give its run ids to generate_report.
          </p>
        </div>
      </div>

      <div className="col-main">
        <div className="sec-head rp-head">
          <h2>{expired ? 'These links have expired' : 'Your report is ready'}</h2>
          {linked && (
            <p className="rp-expiry" role="timer" aria-label={expired ? 'Links expired' : `Links expire in ${clock(left)}`}>
              <span className="eyebrow">{expired ? 'Expired' : 'Links expire in'}</span> <span className="clock">{clock(left)}</span>
            </p>
          )}
        </div>

        {vm.files.length === 0 ? (
          <p className="quiet">No files in this result. Run generate_report again.</p>
        ) : (
          <div className="rp-files">
            <CoverPreview vm={vm} />
            <ul className="rp-list">
              {order.map((f) => (
                <FileRow key={f.format} f={f} pages={vm.pages} primary={f.format === 'pdf'} expired={expired} actions={actions} say={say} />
              ))}
            </ul>
          </div>
        )}
        <p className="status small" role="status" aria-live="polite">
          {said ||
            (embedded
              ? 'The server could not issue links, so the files are embedded in this result. If Save does nothing, the host blocks downloads from widgets.'
              : !linked && vm.files.length > 0
                ? (vm.message ?? 'This server cannot issue download links. Ask the operator to set METAMORPH_PUBLIC_URL.')
                : '')}
        </p>

        <section aria-labelledby="rp-top-h">
          <h2 id="rp-top-h" className="h-small">
            Top findings in the report
          </h2>
          <TopFindings vm={vm} />
        </section>

        <Fold summary="Appendix: what this report cannot tell you" hint="Known limits">
          <ul className="notes rp-limits">
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Fold>

        <div className="rp-again">
          <div className="actions">
            <CopyButton text={call.text} label="Copy call to run again" className={`btn ${expired ? 'btn-primary' : 'btn-quiet'}`} />
            <code className="mono small muted rp-call">{call.text}</code>
          </div>
          {!call.complete && <p className="muted small">The result does not include the repository URL. Replace OWNER/REPO.</p>}
        </div>
      </div>
    </div>
  );
}
