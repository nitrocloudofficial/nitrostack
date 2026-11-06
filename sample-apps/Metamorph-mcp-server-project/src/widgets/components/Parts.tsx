import React, { useState } from 'react';
import type { CheckStatus, Severity } from '../lib/view-model';
import { SEVERITY_LABEL, SEVERITY_ORDER } from './Severity';

// Small parts shared by every view: copy, collapsible, status marks, counts strip.

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sandboxed iframes often block the async clipboard API; fall back to a selection + execCommand.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function useCopy(text: string) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    setState((await copyText(text)) ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 2200);
  };
  return { state, copy };
}

// A copy button whose label never changes width (the longer word is reserved), so nothing shifts when it flips.
export function CopyButton({ text, label = 'Copy', className = 'btn btn-quiet', aria }: { text: string; label?: string; className?: string; aria?: string }) {
  const { state, copy } = useCopy(text);
  return (
    <button type="button" className={`${className} copy-btn`} onClick={copy} aria-label={aria}>
      <span className="copy-label" data-w={label}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select it' : label}
      </span>
    </button>
  );
}

// One command with its own copy button (checklists).
export function CmdRow({ text, label = 'Copy' }: { text: string; label?: string }) {
  return (
    <div className="cmd">
      <code className="mono cmd-text">{text}</code>
      <CopyButton text={text} label={label} className="btn btn-quiet btn-small" aria={`Copy: ${text}`} />
    </div>
  );
}

// A collapsible region built on <details>: keyboard and screen reader support come with it, no script needed.
export function Fold({ summary, hint, children, open }: { summary: string; hint?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="fold" open={open}>
      <summary>
        <span className="fold-mark" aria-hidden="true" />
        <span className="fold-title">{summary}</span>
        {hint && <span className="fold-hint">{hint}</span>}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

// Status is never colour alone: a distinct shape plus the word.
const MARK: Record<CheckStatus, { word: string; d: string }> = {
  pass: { word: 'Pass', d: 'M2 2h8v8h-8z' },
  fail: { word: 'Fail', d: 'M2 2l8 8M10 2l-8 8' },
  error: { word: 'Error', d: 'M6 1l5 10h-10z' },
  skipped: { word: 'Skipped', d: 'M2 6h8' }
};

export function StatusMark({ status }: { status: CheckStatus }) {
  const m = MARK[status];
  const stroke = status === 'fail' || status === 'skipped';
  return (
    <span className={`mark mark-${status}`}>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
        {stroke ? <path d={m.d} fill="none" stroke="currentColor" strokeWidth="2" /> : status === 'error' ? <path d={m.d} fill="none" stroke="currentColor" strokeWidth="1.6" /> : <path d={m.d} fill="currentColor" />}
      </svg>
      {m.word}
    </span>
  );
}

// Findings by severity: five segments, the fill is the designer ramp, the number and the word carry the meaning.
export function SeverityStrip({ counts, small }: { counts: Array<{ severity: Severity; count: number }>; small?: boolean }) {
  const by = new Map(counts.map((c) => [c.severity, c.count]));
  return (
    <ul className={`strip ${small ? 'strip-small' : ''}`} aria-label="Findings by severity">
      {SEVERITY_ORDER.map((s) => {
        const n = by.get(s) ?? 0;
        return (
          <li key={s} className={`seg sev-${s} ${n === 0 ? 'seg-zero' : ''}`}>
            <span className="seg-bar" aria-hidden="true" />
            <span className="seg-n">{n}</span>
            <span className="seg-label">{SEVERITY_LABEL[s]}</span>
          </li>
        );
      })}
    </ul>
  );
}
