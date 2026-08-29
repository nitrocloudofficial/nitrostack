'use client';

/** MCP widget for `build_risk_graph`. */
import React from 'react';
import { COLORS, useTheme } from '../../lib/theme.js';
import { asArray } from '../../lib/format.js';
import { hasHostData, pick, withFallback } from '../../lib/sdk.js';
import { OFFICER, SAMPLE_GRAPH } from '../../lib/sample-data.js';
import { AppShell, Card, Content, DemoBanner, Empty, MainColumn, TopBar } from '../../components/chrome.jsx';
import { FraudGraph } from '../../components/graph.jsx';
import { StatsCard } from '../../components/teamwork.jsx';
import { IconGraph, IconLink, IconShield, IconUser } from '../../components/icons.jsx';

export default function GraphView({ data }: { data?: unknown }) {
  useTheme();

  const live = hasHostData(data);
  const payload = withFallback(data, SAMPLE_GRAPH as unknown as Record<string, unknown>);
  const nodes = asArray<Record<string, unknown>>(payload.nodes);
  const edges = asArray<Record<string, unknown>>(payload.edges);
  const subject = pick<string>(payload, 'applicationId', '');

  const applications = nodes.filter((n) => n.nodeRole === 'applicant' || n.kind === 'application').length;
  const identifiers = nodes.length - applications;
  const shared = edges.filter(
    (e) => e.relationship === 'shares_identifier' || e.relationship === 'matches',
  ).length;

  const [selected, setSelected] = React.useState<string | null>(subject || null);

  return (
    <AppShell>
      <MainColumn>
        <TopBar
          crumbs={['PassportIQ', 'Fraud graph', subject || '—']}
          live={{ label: `${nodes.length} nodes`, tone: 'live' }}
          officer={{ name: OFFICER.name, role: OFFICER.role }}
        />
        <Content>
          {!live ? <DemoBanner>Sample cluster — open from a `build_risk_graph` call for live data.</DemoBanner> : null}

          <div className="piq-grid-4" style={{ marginBottom: 16 }}>
            <StatsCard
              title="Applications"
              value={applications}
              description="Separate live applications inside this cluster."
              icon={<IconUser size={16} />}
              tone="blue"
            />
            <StatsCard
              title="Identifiers"
              value={identifiers}
              description="Phones, emails, addresses, documents and passport numbers involved."
              icon={<IconShield size={16} />}
            />
            <StatsCard
              title="Shared links"
              value={shared}
              description="Identifiers reused across more than one application."
              icon={<IconLink size={16} />}
              tone={shared > 0 ? 'danger' : 'success'}
            />
            <StatsCard
              title="Total edges"
              value={edges.length}
              description="Every relationship the graph builder resolved."
              icon={<IconGraph size={16} />}
              tone="warning"
            />
          </div>

          <Card
            title="Cross-application relationship graph"
            subtitle="Solid edges are structural. Dashed edges are identifiers reused across separate live applications — the signal a single-application review can never produce."
            eyebrow="Fraud intelligence"
            icon={<IconGraph size={16} color={COLORS.accent} />}
            flush
          >
            {nodes.length === 0 ? (
              <div style={{ padding: 18 }}>
                <Empty>No graph nodes returned.</Empty>
              </div>
            ) : (
              <FraudGraph
                nodes={payload.nodes}
                edges={payload.edges}
                selectedId={selected}
                onSelect={setSelected}
                height={540}
                showLegend
              />
            )}
          </Card>

          <div style={{ marginTop: 16 }}>
            <Card title="Edge evidence" eyebrow="Why these are linked" flush>
              {edges.length === 0 ? (
                <div style={{ padding: 18 }}>
                  <Empty>No edges.</Empty>
                </div>
              ) : (
                <div className="piq-scroll" style={{ overflowX: 'auto', maxHeight: 320 }}>
                  <table className="piq-table">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>Relationship</th>
                        <th>To</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {edges.slice(0, 60).map((e, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{String(e.from ?? e.source ?? '—')}</td>
                          <td>
                            <span className="piq-pill" style={{ fontSize: 11 }}>
                              {String(e.relationship ?? '—').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>{String(e.to ?? e.target ?? '—')}</td>
                          <td style={{ fontSize: 12, color: COLORS.textSecondary }}>{String(e.reason ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </Content>
      </MainColumn>
    </AppShell>
  );
}
