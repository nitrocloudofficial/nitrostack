'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { palette, SeverityPill, ErrorBanner, LoadingState, WidgetShell } from '../../components/ui';

interface Finding {
  id: string;
  rule: string;
  cwe: string;
  cweTitle: string;
  template: string;
  methods: string[];
  severity: string;
  score: number;
  title: string;
  rationale: string;
  evidenceUri: string;
  documented: boolean;
}
interface EvidenceRecord {
  id: string;
  ts: string;
  method: string;
  path: string;
  status: number;
  actor: { sub: string | null; role: string | null };
}
type ToolResult = { ok: true; data: Finding[] } | { ok: false; message: string; nextAction: string };
type EvidenceResult = { ok: true; data: EvidenceRecord[] } | { ok: false; message: string };

export default function FindingsListWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const result = getToolOutput<ToolResult>();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [evidenceByFinding, setEvidenceByFinding] = useState<Record<string, EvidenceRecord[] | 'loading' | 'error'>>({});

  if (!isReady || !result) return <WidgetShell><LoadingState label="Scanning for authorization risks…" /></WidgetShell>;
  if (!result.ok) return <WidgetShell><ErrorBanner message={result.message} nextAction={result.nextAction} /></WidgetShell>;

  const findings = result.data;

  async function toggleRow(findingId: string) {
    if (expanded === findingId) {
      setExpanded(null);
      return;
    }
    setExpanded(findingId);
    if (!evidenceByFinding[findingId]) {
      setEvidenceByFinding((prev) => ({ ...prev, [findingId]: 'loading' }));
      try {
        const response = await callTool('get_finding_evidence', { findingId });
        const parsed: EvidenceResult = JSON.parse(response.result);
        setEvidenceByFinding((prev) => ({ ...prev, [findingId]: parsed.ok ? parsed.data : 'error' }));
      } catch {
        setEvidenceByFinding((prev) => ({ ...prev, [findingId]: 'error' }));
      }
    }
  }

  return (
    <WidgetShell>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${palette.border}`, fontSize: 15, fontWeight: 700 }}>
        Authorization Findings ({findings.length})
      </div>
      {findings.length === 0 ? (
        <LoadingState label="No findings at the requested severity." />
      ) : (
        <div>
          {findings.map((f) => {
            const isOpen = expanded === f.id;
            const evidence = evidenceByFinding[f.id];
            return (
              <div key={f.id} style={{ borderBottom: `1px solid ${palette.border}` }}>
                <div
                  onClick={() => toggleRow(f.id)}
                  style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: isOpen ? palette.panelAlt : 'transparent' }}
                >
                  <SeverityPill severity={f.severity} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontFamily: palette.mono, color: palette.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.template}
                    </div>
                    <div style={{ fontSize: 11, color: palette.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.rationale}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: palette.textFaint, textAlign: 'right', minWidth: 70 }}>
                    <div>{f.rule}</div>
                    <div>{f.cwe}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: palette.severity[f.severity] ?? palette.text, minWidth: 32, textAlign: 'right' }}>
                    {f.score}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '10px 16px 14px 16px', background: palette.panel }}>
                    {evidence === 'loading' && <div style={{ fontSize: 12, color: palette.textMuted }}>Loading evidence…</div>}
                    {evidence === 'error' && <div style={{ fontSize: 12, color: palette.severity.CRITICAL }}>Failed to load evidence.</div>}
                    {Array.isArray(evidence) && (
                      <div style={{ fontFamily: palette.mono, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {evidence.slice(0, 8).map((r) => (
                          <div key={r.id} style={{ color: palette.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: r.status >= 400 ? palette.severity.HIGH : palette.success }}>{r.status}</span>{' '}
                            <span style={{ color: palette.accent }}>{r.actor.sub ?? 'anon'}</span> {r.method} {r.path}
                          </div>
                        ))}
                        {evidence.length > 8 && <div style={{ color: palette.textFaint }}>+{evidence.length - 8} more — see evidence:// resource</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}
