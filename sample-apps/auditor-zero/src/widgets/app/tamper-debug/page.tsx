'use client';

/**
 * Widget for `debug_tamper_record` — before/after comparison of the tampered
 * ledger record with highlighted differences and one-click chain verification
 * to prove the Black Box catches it.
 */

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import type { ReplayResult } from '../../lib/types';
import {
  Shell, Header, Footer, Btn, Banner, ErrorBanner, LoadingCard,
  usePalette, unwrap, shortId, shortHash, MONO, type Palette,
} from '../../components/ui';

interface TamperOutput {
  tampered: boolean;
  recordId: string;
  auditId?: string;
  agentName?: string;
  sealedHash?: string;
  before?: { output: unknown };
  after?: { output: unknown };
  error?: string;
}

function prettyLines(v: unknown): string[] {
  let text: string;
  if (typeof v === 'string') {
    try { text = JSON.stringify(JSON.parse(v), null, 2); } catch { text = v; }
  } else {
    try { text = JSON.stringify(v, null, 2); } catch { text = String(v); }
  }
  return (text ?? '').split('\n');
}

/** Multiset line-diff: lines with no counterpart on the other side get highlighted. */
function diffLines(a: string[], b: string[]): Set<number> {
  const pool = new Map<string, number>();
  for (const line of b) pool.set(line, (pool.get(line) ?? 0) + 1);
  const changed = new Set<number>();
  a.forEach((line, i) => {
    const n = pool.get(line) ?? 0;
    if (n > 0) pool.set(line, n - 1);
    else changed.add(i);
  });
  return changed;
}

function DiffPane({ c, title, tone, lines, changed }: {
  c: Palette; title: string; tone: 'good' | 'bad'; lines: string[]; changed: Set<number>;
}) {
  const hi = tone === 'bad' ? { bg: c.redBg, fg: c.red } : { bg: c.greenBg, fg: c.green };
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: hi.fg, marginBottom: 6 }}>
        {title}
      </div>
      <pre style={{
        margin: 0, padding: '10px 0', borderRadius: 10, background: c.panel2,
        border: `1px solid ${c.border}`, fontSize: 11.5, fontFamily: MONO, lineHeight: 1.55,
        overflow: 'auto', maxHeight: 260,
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            padding: '0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: changed.has(i) ? hi.bg : 'transparent',
            color: changed.has(i) ? hi.fg : c.sub,
            fontWeight: changed.has(i) ? 700 : 400,
          }}>
            {line || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}

export default function TamperDebug() {
  const c = usePalette();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const data = unwrap<TamperOutput | null>(getToolOutput<any>());

  const [verify, setVerify] = useState<ReplayResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isReady || data == null) return <LoadingCard lines={2} label="Tampering with the ledger…" />;

  if (!data.tampered) {
    return (
      <Shell>
        <Header title="Tamper Demo" />
        <ErrorBanner
          title="Tamper failed"
          detail={data.error ?? JSON.stringify(data)}
          hint="The tamper tool is disabled in production unless ALLOW_TAMPER_DEMO=true."
        />
        <Footer />
      </Shell>
    );
  }

  const beforeLines = prettyLines(data.before?.output);
  const afterLines = prettyLines(data.after?.output);
  const removed = diffLines(beforeLines, afterLines);
  const added = diffLines(afterLines, beforeLines);

  const runVerify = async () => {
    if (!data.auditId) return;
    setVerifying(true);
    try {
      setVerify(unwrap<ReplayResult>(await callTool('verify_replay_chain', { auditId: data.auditId })));
    } catch { /* noop */ } finally { setVerifying(false); }
  };

  return (
    <Shell maxWidth={760}>
      <Header
        title="Tamper Demo · Record Edited"
        subtitle={<>record {shortId(data.recordId)}{data.agentName ? <> · {data.agentName}</> : null}</>}
        right={data.auditId && (
          <Btn kind="primary" onClick={runVerify} disabled={verifying}>
            {verifying ? 'Verifying…' : '🔐 Catch it — verify chain'}
          </Btn>
        )}
      />

      <Banner tone="warn">
        ⚠ The stored output was overwritten WITHOUT re-sealing — the record's HMAC no longer matches its content.
      </Banner>

      {verify && (
        <Banner tone={verify.verified ? 'good' : 'bad'}>
          {verify.verified
            ? '✓ Chain still verifies (the tampered record is outside this scope)'
            : `✕ Caught — verification breaks at record ${shortId(verify.brokenAt)}`}
        </Banner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 12 }}>
        <DiffPane c={c} title="Before — as sealed" tone="good" lines={beforeLines} changed={removed} />
        <DiffPane c={c} title="After — tampered" tone="bad" lines={afterLines} changed={added} />
      </div>

      {data.sealedHash && (
        <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: '11px 13px', fontSize: 11.5, color: c.sub }}>
          Stored seal <span style={{ fontFamily: MONO, color: c.text }} title={data.sealedHash}>{shortHash(data.sealedHash)}</span> was
          computed over the <span style={{ color: c.green, fontWeight: 700 }}>before</span> payload. Recomputing it over the{' '}
          <span style={{ color: c.red, fontWeight: 700 }}>after</span> payload yields a different HMAC — which is exactly what{' '}
          <span style={{ fontFamily: MONO }}>verify_replay_chain</span> detects.
        </div>
      )}

      <Footer />
    </Shell>
  );
}
