'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { palette, StatTile, ErrorBanner, LoadingState, WidgetShell } from '../../components/ui';

interface IngestData {
  counts: number;
  timeRange: { from: string; to: string };
  distinctActors: number;
  templatesDiscovered: number;
  rejected: { count: number; reasons: string[] };
}
type IngestResult = { ok: true; data: IngestData } | { ok: false; message: string; nextAction: string };
type ShadowResult = { ok: true; data: { shadow: unknown[] } } | { ok: false; message: string };
type ScanResult = { ok: true; data: { severity: string }[] } | { ok: false; message: string };

// Explicit tri-state: a failed background call must never render identically
// to a real "0 findings" — a security scorecard silently showing a false
// all-clear on a network/tool error is a false-negative risk, not a
// cosmetic bug. 'loading' -> number (real result) or { error } (never 0).
// The error carries the ACTUAL reason (a real ok:false message, a JSON
// parse failure, or a thrown exception) rather than a generic "call
// failed" — those are different problems (state/session mismatch vs.
// network vs. malformed response) and collapsing them into one message
// hides exactly the information needed to tell which one happened.
type CountState = 'loading' | { error: string } | number;

function describeCallFailure(e: unknown): string {
  return e instanceof Error ? e.message : 'call threw a non-Error value';
}

export default function SurfaceScorecardWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const result = getToolOutput<IngestResult>();

  // list_shadow_endpoints and scan_authorization_risks aren't part of
  // ingest_access_logs' own output — this widget calls them itself on mount
  // to fill in the other two numbers, since the tool it's bound to can't
  // know shadow/critical counts before a spec is even imported.
  const [shadowCount, setShadowCount] = useState<CountState>('loading');
  const [criticalCount, setCriticalCount] = useState<CountState>('loading');

  useEffect(() => {
    if (!result?.ok) return;
    let cancelled = false;

    callTool('list_shadow_endpoints', {})
      .then((res) => {
        if (cancelled) return;
        let parsed: ShadowResult;
        try {
          parsed = JSON.parse(res.result);
        } catch {
          setShadowCount({ error: `malformed response: ${res.result.slice(0, 80)}` });
          return;
        }
        setShadowCount(parsed.ok ? parsed.data.shadow.length : { error: parsed.message });
      })
      .catch((e) => !cancelled && setShadowCount({ error: describeCallFailure(e) }));

    callTool('scan_authorization_risks', { minSeverity: 'CRITICAL' })
      .then((res) => {
        if (cancelled) return;
        let parsed: ScanResult;
        try {
          parsed = JSON.parse(res.result);
        } catch {
          setCriticalCount({ error: `malformed response: ${res.result.slice(0, 80)}` });
          return;
        }
        setCriticalCount(parsed.ok ? parsed.data.length : { error: parsed.message });
      })
      .catch((e) => !cancelled && setCriticalCount({ error: describeCallFailure(e) }));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.ok]);

  if (!isReady || !result) return <WidgetShell><LoadingState label="Ingesting access logs…" /></WidgetShell>;
  if (!result.ok) return <WidgetShell><ErrorBanner message={result.message} nextAction={result.nextAction} /></WidgetShell>;

  const { data } = result;

  // Renders 'loading' as '…', a real number as itself, and a failure as a
  // visibly-broken '!' with a red border and the ACTUAL reason as caption —
  // never silently as 0.
  function countProps(state: CountState, accent: string): { value: string | number; accent: string; caption?: string; captionColor?: string } {
    if (state === 'loading') return { value: '…', accent };
    if (typeof state === 'object') return { value: '!', accent: palette.severity.HIGH, caption: state.error, captionColor: palette.severity.HIGH };
    return { value: state, accent };
  }

  return (
    <WidgetShell>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Access-Log Ingestion Complete</div>
        <div style={{ fontSize: 11, color: palette.textMuted, marginBottom: 14 }}>
          {data.timeRange.from} → {data.timeRange.to}
          {data.rejected.count > 0 && <span style={{ color: palette.severity.HIGH }}> · {data.rejected.count} record(s) rejected</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatTile label="Endpoints Observed" value={data.templatesDiscovered} />
          <StatTile label="Shadow Endpoints" {...countProps(shadowCount, palette.shadow)} />
          <StatTile label="Critical Findings" {...countProps(criticalCount, palette.severity.CRITICAL)} />
          <StatTile label="Actors Seen" value={data.distinctActors} accent={palette.accent} />
        </div>
      </div>
    </WidgetShell>
  );
}
