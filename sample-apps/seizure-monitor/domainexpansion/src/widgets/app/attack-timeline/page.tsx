'use client';

export const dynamic = 'force-dynamic';

import { useWidgetSDK } from '@nitrostack/widgets';
import { palette, SeverityPill, StatTile, ErrorBanner, LoadingState, WidgetShell, UntrustedField } from '../../components/ui';

interface AttackSessionFindingSummary {
  id: string;
  rule: string;
  severity: string;
  template: string;
}
interface AttackSessionGroup {
  template: string;
  method: string;
  firstTs: string;
  lastTs: string;
  count: number;
  distinctObjectIds: number;
  sampleObjectId: string | null; // neutralised
  findingIds: string[];
}
interface AttackSession {
  actorSub: string;
  eventCount: number;
  timeRange: { from: string; to: string };
  durationSeconds: number;
  distinctTemplates: number;
  distinctObjectIds: number;
  findings: AttackSessionFindingSummary[];
  groups: AttackSessionGroup[];
}
type ToolResult = { ok: true; data: AttackSession } | { ok: false; message: string; nextAction: string };

const SEVERITY_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function clockTime(ts: string): string {
  return ts.split('T')[1]?.slice(0, 8) ?? ts;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function maxSeverityFor(findingIds: string[], findings: AttackSessionFindingSummary[]): string | null {
  let best: string | null = null;
  for (const id of findingIds) {
    const f = findings.find((x) => x.id === id);
    if (!f) continue;
    if (best === null || SEVERITY_RANK[f.severity] > SEVERITY_RANK[best]) best = f.severity;
  }
  return best;
}

export default function AttackTimelineWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const result = getToolOutput<ToolResult>();

  if (!isReady || !result) return <WidgetShell><LoadingState label="Reconstructing attack session…" /></WidgetShell>;
  if (!result.ok) return <WidgetShell><ErrorBanner message={result.message} nextAction={result.nextAction} /></WidgetShell>;

  const session = result.data;

  return (
    <WidgetShell>
      <div style={{ padding: 16, borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
          Attack Session — <span style={{ color: palette.accent, fontFamily: palette.mono }}>{session.actorSub}</span>
        </div>
        <div style={{ fontSize: 11, color: palette.textMuted, marginBottom: 10 }}>
          {clockTime(session.timeRange.from)} → {clockTime(session.timeRange.to)} · {formatDuration(session.durationSeconds)}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatTile label="Requests" value={session.eventCount} />
          <StatTile label="Endpoints Touched" value={session.distinctTemplates} />
          <StatTile label="Distinct Objects" value={session.distinctObjectIds} accent={palette.accent} />
          <StatTile label="Findings Triggered" value={session.findings.length} accent={session.findings.length > 0 ? palette.severity.CRITICAL : undefined} />
        </div>
      </div>

      <div style={{ padding: '8px 16px' }}>
        {session.groups.length === 0 && <LoadingState label="No activity recorded." />}
        {session.groups.map((g, i) => {
          const severity = maxSeverityFor(g.findingIds, session.findings);
          const markerColor = severity ? palette.severity[severity] : palette.border;
          return (
            <div key={`${g.template}-${g.firstTs}-${i}`} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < session.groups.length - 1 ? `1px solid ${palette.border}` : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: markerColor, flexShrink: 0 }} />
                {i < session.groups.length - 1 && <div style={{ width: 2, flex: 1, background: palette.border, marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: palette.textFaint, fontFamily: palette.mono }}>
                  {clockTime(g.firstTs)}{g.count > 1 ? ` – ${clockTime(g.lastTs)}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: palette.text }}>{g.method}</span>
                  <span style={{ fontSize: 12, fontFamily: palette.mono, color: palette.text }}>{g.template}</span>
                  {g.count > 1 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: palette.accent, border: `1px solid ${palette.accent}`, borderRadius: 3, padding: '1px 5px' }}>
                      ×{g.count}{g.distinctObjectIds > 1 ? ` (${g.distinctObjectIds} distinct)` : ''}
                    </span>
                  )}
                  {severity && <SeverityPill severity={severity} />}
                </div>
                {g.sampleObjectId !== null && (
                  <div style={{ marginTop: 4 }}>
                    <UntrustedField value={g.sampleObjectId} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}
