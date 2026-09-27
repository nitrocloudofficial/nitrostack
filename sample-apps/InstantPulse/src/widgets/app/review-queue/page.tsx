'use client';

import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';
import { Empty, Panel, Pill, SectionTitle, bandColor, money, palette } from '../_shared/ui';

interface QueueItem {
  applicationId: string;
  businessName: string;
  industry: string;
  status: string;
  band: string;
  score: number;
  recommendedLimit: number;
  requestedAmount?: number;
  blockers: Array<{ code: string; label: string }>;
  flags: Array<{ code: string; label: string }>;
  anomalyCount: number;
  openDocumentRequests: number;
  overridden: boolean;
  avgMonthlyRevenue: number;
  daysCashOnHand: number;
  updatedAt: string;
}

interface QueueData {
  total?: number;
  returned?: number;
  summary?: { green: number; yellow: number; red: number; totalRecommendedExposure: number };
  queue?: QueueItem[];
}

export default function ReviewQueue() {
  const theme = useTheme();
  const { getToolOutput, callTool } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ filter: string }>(() => ({ filter: 'ALL' }));

  const data = getToolOutput<QueueData>();
  const p = palette(theme === 'dark');

  if (!data?.queue) {
    return (
      <div style={{ padding: 16, background: p.bg }}>
        <Empty p={p} message="Waiting for the review queue…" />
      </div>
    );
  }

  const filter = state?.filter ?? 'ALL';
  const items = filter === 'ALL' ? data.queue : data.queue.filter((q) => q.band === filter);
  const s = data.summary;

  return (
    <div
      style={{
        background: p.bg,
        color: p.text,
        padding: 16,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 820,
      }}
    >
      {/* ---------- Header + portfolio summary ---------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 13,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 660 }}>Officer review queue</div>
          <div style={{ fontSize: 12, color: p.muted, marginTop: 3 }}>
            {data.total} application{data.total === 1 ? '' : 's'} · ordered by proximity to approval
          </div>
        </div>

        {s && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: p.faint, marginBottom: 3 }}>Recommended exposure</div>
            <div style={{ fontSize: 19, fontWeight: 680, fontVariantNumeric: 'tabular-nums' }}>
              {money(s.totalRecommendedExposure)}
            </div>
          </div>
        )}
      </div>

      {/* ---------- Band filters ---------- */}
      {s && (
        <div style={{ display: 'flex', gap: 7, marginBottom: 13, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: `All ${data.total}`, color: p.muted },
            { key: 'GREEN', label: `Green ${s.green}`, color: p.green },
            { key: 'YELLOW', label: `Yellow ${s.yellow}`, color: p.yellow },
            { key: 'RED', label: `Red ${s.red}`, color: p.red },
          ].map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setState({ filter: f.key })}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: active ? f.color : p.muted,
                  background: active ? `${f.color}1f` : 'transparent',
                  border: `1px solid ${active ? `${f.color}66` : p.border}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ---------- Queue ---------- */}
      {items.length === 0 ? (
        <Empty p={p} message="Nothing in this band." />
      ) : (
        <div style={{ display: 'grid', gap: 9 }}>
          {items.map((item) => {
            const color = bandColor(item.band, p);
            const needsAttention = item.band === 'YELLOW' && !item.overridden;

            return (
              <Panel key={item.applicationId} p={p} style={{ borderLeft: `3px solid ${color}`, padding: 13 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                    marginBottom: 9,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 640 }}>{item.businessName}</span>
                      <Pill p={p} color={color}>
                        {item.band} · {item.score}
                      </Pill>
                      {item.overridden && (
                        <Pill p={p} color={p.blue}>
                          officer override
                        </Pill>
                      )}
                      {item.openDocumentRequests > 0 && (
                        <Pill p={p} color={p.muted}>
                          {item.openDocumentRequests} doc request
                          {item.openDocumentRequests === 1 ? '' : 's'}
                        </Pill>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: p.faint, marginTop: 4 }}>
                      {item.industry} · {item.applicationId}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 670,
                        fontVariantNumeric: 'tabular-nums',
                        color: item.recommendedLimit > 0 ? p.text : p.muted,
                      }}
                    >
                      {money(item.recommendedLimit)}
                    </div>
                    {item.requestedAmount !== undefined && (
                      <div style={{ fontSize: 11, color: p.faint }}>
                        of {money(item.requestedAmount)} asked
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 15,
                    fontSize: 11.5,
                    color: p.muted,
                    marginBottom: item.blockers.length || item.flags.length ? 9 : 0,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>{money(item.avgMonthlyRevenue, true)}/mo revenue</span>
                  <span style={{ color: item.daysCashOnHand < 21 ? p.yellow : p.muted }}>
                    {item.daysCashOnHand}d cash
                  </span>
                  {item.anomalyCount > 0 && <span>{item.anomalyCount} anomalies</span>}
                </div>

                {(item.blockers.length > 0 || item.flags.length > 0) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {item.blockers.map((b) => (
                      <Pill key={b.code} p={p} color={p.red}>
                        {b.label}
                      </Pill>
                    ))}
                    {item.flags.map((f) => (
                      <Pill key={f.code} p={p} color={p.yellow}>
                        {f.label}
                      </Pill>
                    ))}
                  </div>
                )}

                {/* Officer actions. Overriding a decision needs a written
                    justification, so that always goes back through chat rather
                    than becoming a one-click button here. */}
                {needsAttention && (
                  <div
                    style={{
                      marginTop: 11,
                      paddingTop: 10,
                      borderTop: `1px solid ${p.border}`,
                      display: 'flex',
                      gap: 7,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      onClick={() =>
                        callTool?.('review_get_audit_trail', { applicationId: item.applicationId })
                      }
                      style={actionStyle(p, p.muted)}
                    >
                      View audit trail
                    </button>
                    <button
                      onClick={() => callTool?.('risk_explain_score', { applicationId: item.applicationId })}
                      style={actionStyle(p, p.blue)}
                    >
                      Explain the score
                    </button>
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: p.faint, lineHeight: 1.6 }}>
        Approving or declining requires a written justification — use{' '}
        <code style={{ color: p.muted }}>review_override_decision</code>. Both the officer decision and the
        original machine decision are kept.
      </div>
    </div>
  );
}

function actionStyle(p: ReturnType<typeof palette>, color: string) {
  return {
    padding: '5px 11px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    color,
    background: 'transparent',
    border: `1px solid ${p.border}`,
  } as const;
}
