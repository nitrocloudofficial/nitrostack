'use client';

export const dynamic = 'force-dynamic';

import { useWidgetSDK } from '@nitrostack/widgets';
import { palette, StatTile, ShadowChip, ErrorBanner, LoadingState, WidgetShell } from '../../components/ui';

interface TopologyNode {
  id: string;
  label: string;
  depth: number;
  isEndpoint: boolean;
  isParam: boolean;
  documented: boolean;
  requestCount: number;
  maxSeverity: string | null;
}
interface Topology {
  nodes: TopologyNode[];
  edges: { from: string; to: string; weight: number }[];
  stats: {
    observedEndpoints: number;
    documentedEndpoints: number;
    shadowEndpoints: number;
    totalRequests: number;
    distinctActors: number;
    timeRange: { from: string; to: string };
  };
}
type ToolResult = { ok: true; data: Topology } | { ok: false; message: string; nextAction: string };

export default function TopologyGraphWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const result = getToolOutput<ToolResult>();

  if (!isReady || !result) return <WidgetShell><LoadingState label="Loading API topology…" /></WidgetShell>;
  if (!result.ok) return <WidgetShell><ErrorBanner message={result.message} nextAction={result.nextAction} /></WidgetShell>;

  const { nodes, stats } = result.data;
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const columns: TopologyNode[][] = Array.from({ length: maxDepth + 1 }, (_, d) => nodes.filter((n) => n.depth === d));

  return (
    <WidgetShell>
      <div style={{ padding: 16, borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>API Topology</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatTile label="Observed" value={stats.observedEndpoints} />
          <StatTile label="Documented" value={stats.documentedEndpoints} accent={palette.success} />
          <StatTile label="Shadow" value={stats.shadowEndpoints} accent={palette.shadow} />
          <StatTile label="Total Requests" value={stats.totalRequests.toLocaleString()} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: 16, overflowX: 'auto' }}>
        {columns.map((col, depth) =>
          col.length === 0 ? null : (
            <div key={depth} style={{ minWidth: 180, flex: '0 0 auto' }}>
              <div style={{ fontSize: 10, color: palette.textFaint, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                depth {depth}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {col.map((node) => {
                  const isShadow = node.isEndpoint && !node.documented;
                  const borderColor = node.maxSeverity ? palette.severity[node.maxSeverity] : isShadow ? palette.shadow : palette.border;
                  return (
                    <div
                      key={node.id}
                      title={node.id}
                      style={{
                        background: node.isEndpoint ? palette.panelAlt : palette.panel,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontFamily: node.isParam ? palette.mono : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ color: node.isParam ? palette.accent : palette.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.label}
                        </span>
                        {isShadow && <ShadowChip />}
                      </div>
                      {node.isEndpoint && (
                        <div style={{ fontSize: 10, color: palette.textMuted, marginTop: 2 }}>{node.requestCount.toLocaleString()} req</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        )}
      </div>
    </WidgetShell>
  );
}
