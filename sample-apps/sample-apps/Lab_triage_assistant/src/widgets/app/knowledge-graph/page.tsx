'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

type GraphNodeType = 'test' | 'panel' | 'specialist';

interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const COLUMN_ORDER: GraphNodeType[] = ['test', 'panel', 'specialist'];
const COLUMN_TITLES: Record<GraphNodeType, string> = {
  test: 'Lab Tests',
  panel: 'Panel',
  specialist: 'Specialist'
};

interface LinePath {
  key: string;
  d: string;
}

export default function KnowledgeGraphWidget() {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<KnowledgeGraphData>();

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLDivElement>());
  const [paths, setPaths] = useState<LinePath[]>([]);

  const textColor = isDark ? '#f5f5f5' : '#111827';
  const mutedColor = isDark ? 'rgba(245,245,245,0.6)' : 'rgba(17,24,39,0.6)';
  const cardBg = isDark ? '#1f2430' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const lineColor = isDark ? 'rgba(129,140,248,0.55)' : 'rgba(79,70,229,0.4)';
  const nodeColors: Record<GraphNodeType, { bg: string; fg: string }> = isDark
    ? {
        test: { bg: 'rgba(96,165,250,0.15)', fg: '#93c5fd' },
        panel: { bg: 'rgba(196,181,253,0.15)', fg: '#c4b5fd' },
        specialist: { bg: 'rgba(74,222,128,0.15)', fg: '#86efac' }
      }
    : {
        test: { bg: '#eaf2fe', fg: '#1d4ed8' },
        panel: { bg: '#f3ecfe', fg: '#6d28d9' },
        specialist: { bg: '#e7f8ee', fg: '#15803d' }
      };

  useEffect(() => {
    if (!data) return;

    const computePaths = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      const next: LinePath[] = [];
      for (const edge of data.edges) {
        const sourceEl = nodeRefs.current.get(edge.source);
        const targetEl = nodeRefs.current.get(edge.target);
        if (!sourceEl || !targetEl) continue;

        const sRect = sourceEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();

        const x1 = sRect.right - containerRect.left;
        const y1 = sRect.top + sRect.height / 2 - containerRect.top;
        const x2 = tRect.left - containerRect.left;
        const y2 = tRect.top + tRect.height / 2 - containerRect.top;
        const midX = (x1 + x2) / 2;

        next.push({
          key: `${edge.source}->${edge.target}`,
          d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
        });
      }
      setPaths(next);
    };

    const raf = requestAnimationFrame(computePaths);
    window.addEventListener('resize', computePaths);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', computePaths);
    };
  }, [data, isDark]);

  if (!isReady) {
    return <div style={{ padding: 24, color: textColor }}>Connecting to host...</div>;
  }

  if (!data) {
    return <div style={{ padding: 24, color: textColor }}>No graph data received.</div>;
  }

  const columns = COLUMN_ORDER.map((type) => ({
    type,
    nodes: data.nodes.filter((n) => n.type === type)
  }));

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: textColor, maxWidth: 640 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Test → Panel → Specialist
      </div>
      <div ref={containerRef} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 32 }}>
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill="none" stroke={lineColor} strokeWidth={1.5} />
          ))}
        </svg>

        {columns.map((col) => (
          <div key={col.type} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: mutedColor, marginBottom: 4 }}>
              {COLUMN_TITLES[col.type]}
            </div>
            {col.nodes.map((node) => {
              const c = nodeColors[node.type];
              return (
                <div
                  key={node.id}
                  ref={(el) => {
                    if (el) nodeRefs.current.set(node.id, el);
                    else nodeRefs.current.delete(node.id);
                  }}
                  style={{
                    background: c.bg,
                    color: c.fg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: col.type === 'test' ? 'left' : col.type === 'specialist' ? 'right' : 'center'
                  }}
                >
                  {node.label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
