import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Database, User, X, Briefcase, Network } from 'lucide-react';

interface DecisionNode extends d3.SimulationNodeDatum {
  id: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  status: string;
  owner: string;
  canonical_owner_id?: string;
  is_group_consensus?: boolean;
  topic: string;
  quote: string;
  created_at: string;
}

interface DecisionEdge extends d3.SimulationLinkDatum<DecisionNode> {
  source: string | DecisionNode;
  target: string | DecisionNode;
  relationship_type: string;
}

interface GraphData {
  nodes: DecisionNode[];
  source_links: any[];
  cross_links: any[];
}

interface DecisionGraphViewProps {
  highlightedNodeIds: string[];
}

export const DecisionGraphView: React.FC<DecisionGraphViewProps> = ({ highlightedNodeIds }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<DecisionNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph');
      const data: GraphData = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to fetch graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const width = 1100;
    const height = 620;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Define Arrowhead Markers for Edges
    const defs = svg.append('defs');

    // Supersedes Marker (Crimson Red)
    defs.append('marker')
      .attr('id', 'arrow-supersedes')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 95) // Termination offset matching capsule edge
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ef4444');

    // Depends_on Marker (Vibrant Blue)
    defs.append('marker')
      .attr('id', 'arrow-depends_on')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 95)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3b82f6');

    // Revises Marker (Purple)
    defs.append('marker')
      .attr('id', 'arrow-revises')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 95)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#8b5cf6');

    const nodes: DecisionNode[] = graphData.nodes.map(n => ({ ...n }));
    const edges: DecisionEdge[] = [];

    // Filter out weak 'related' edges to avoid cluttering the view.
    if (Array.isArray(graphData.cross_links)) {
      graphData.cross_links.forEach(link => {
        if (link.relationship_type !== 'related') {
          if (nodes.some(n => n.id === link.from_id) && nodes.some(n => n.id === link.to_id)) {
            edges.push({
              source: link.from_id,
              target: link.to_id,
              relationship_type: link.relationship_type
            });
          }
        }
      });
    }

    // Stable grid coordinates for capsules
    nodes.forEach((d, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      d.x = 140 + col * 260;
      d.y = 80 + row * 130;
    });

    const container = svg.append('g');

    // Zoom & Pan Behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // 1. Draw Edges (Clean Solid Slate/Rose/Blue lines)
    const link = container.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke-width', 2)
      .attr('stroke', d => {
        if (d.relationship_type === 'supersedes') return '#ef4444';
        if (d.relationship_type === 'depends_on') return '#3b82f6';
        if (d.relationship_type === 'revises') return '#8b5cf6';
        return '#334155';
      })
      .attr('marker-end', d => `url(#arrow-${d.relationship_type})`);

    // 2. Draw Edge labels
    const linkText = container.append('g')
      .selectAll('text')
      .data(edges)
      .enter()
      .append('text')
      .attr('font-size', '8px')
      .attr('font-family', 'var(--font-mono)')
      .attr('font-weight', '700')
      .attr('fill', d => {
        if (d.relationship_type === 'supersedes') return '#ef4444';
        if (d.relationship_type === 'depends_on') return '#3b82f6';
        return '#64748b';
      })
      .attr('text-anchor', 'middle')
      .text(d => d.relationship_type.toUpperCase());

    // 3. Draw Nodes (Rounded SaaS Capsules)
    const node = container.append('g')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Node Capsule Body
    node.append('rect')
      .attr('x', -90)
      .attr('y', -25)
      .attr('width', 180)
      .attr('height', 50)
      .attr('rx', 6)
      .attr('fill', 'var(--bg-card)')
      .attr('stroke', d => highlightedNodeIds.includes(d.id) ? 'var(--accent-purple)' : 'var(--border-color)')
      .attr('stroke-width', d => highlightedNodeIds.includes(d.id) ? 2 : 1)
      .style('filter', d => highlightedNodeIds.includes(d.id) ? 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.2))' : 'none');

    // Left accent category color bar
    node.append('rect')
      .attr('x', -90)
      .attr('y', -25)
      .attr('width', 4)
      .attr('height', 50)
      .attr('rx', 1)
      .attr('fill', d => {
        const topic = d.topic?.toLowerCase() || '';
        if (topic.includes('database') || topic.includes('vector')) return '#3b82f6'; // Blue
        if (topic.includes('security') || topic.includes('auth')) return '#ef4444'; // Rose
        if (topic.includes('caching') || topic.includes('cache')) return '#8b5cf6'; // Purple
        if (topic.includes('hiring') || topic.includes('oncall')) return '#10b981'; // Green
        return '#6366f1';
      });

    // Topic Label (Top-left inside capsule)
    node.append('text')
      .attr('x', -78)
      .attr('y', -8)
      .attr('font-size', '8px')
      .attr('font-family', 'var(--font-mono)')
      .attr('font-weight', '700')
      .attr('fill', 'var(--text-muted)')
      .text(d => d.topic ? d.topic.slice(0, 20).toUpperCase() : 'DECISION');

    // Decision Title (Truncated, bottom-left inside capsule)
    node.append('text')
      .attr('x', -78)
      .attr('y', 10)
      .attr('font-size', '10px')
      .attr('font-family', 'var(--font-sans)')
      .attr('font-weight', '600')
      .attr('fill', '#ffffff')
      .text(d => d.decision.length > 22 ? d.decision.slice(0, 20) + '...' : d.decision);

    // Initial Badge Circle for Decision Owner (Top-right inside capsule)
    node.append('circle')
      .attr('cx', 72)
      .attr('cy', -10)
      .attr('r', 8)
      .attr('fill', '#1e293b')
      .attr('stroke', 'var(--border-color)')
      .attr('stroke-width', 0.5);

    // Initial text inside badge
    node.append('text')
      .attr('x', 72)
      .attr('y', -7)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-family', 'var(--font-sans)')
      .attr('font-weight', '700')
      .attr('fill', 'var(--text-secondary)')
      .text(d => {
        if (!d.owner) return '?';
        if (d.is_group_consensus) return 'G';
        const parts = d.owner.split(' ');
        return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
      });

    // 4. Initialize D3 Force Simulation
    const simulation = d3.forceSimulation<DecisionNode>(nodes)
      .force('link', d3.forceLink<DecisionNode, DecisionEdge>(edges).id(d => d.id).distance(220))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(100));

    // Simulation Ticks
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as DecisionNode).x!)
        .attr('y1', d => (d.source as DecisionNode).y!)
        .attr('x2', d => (d.target as DecisionNode).x!)
        .attr('y2', d => (d.target as DecisionNode).y!);

      linkText
        .attr('x', d => ((d.source as DecisionNode).x! + (d.target as DecisionNode).x!) / 2)
        .attr('y', d => (((d.source as DecisionNode).y! + (d.target as DecisionNode).y!) / 2) - 6);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

  }, [graphData, highlightedNodeIds]);

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }} className="fade-in">
      {/* Legend Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={18} color="var(--accent-purple)" />
            Architecture Decision Graph Timeline ({graphData?.nodes?.length || 0} Nodes)
          </h2>
          <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Timeline layout of architectural choices. Edges represent dependencies and override history.
          </p>
        </div>

        {/* Legend Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
            SUPERSEDES
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#3b82f6', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
            DEPENDS_ON
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#8b5cf6', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }}></span>
            REVISES
          </div>
        </div>
      </div>

      {/* Main SVG Canvas */}
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', minHeight: '620px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading Decision Graph...</p>
        ) : (
          <svg ref={svgRef} width="100%" height="620px" style={{ background: 'transparent' }}></svg>
        )}

        {/* Node Detail Inspection Drawer */}
        {selectedNode && (
          <div
            className="glass-card fade-in"
            style={{
              position: 'absolute',
              right: '20px',
              top: '20px',
              bottom: '20px',
              width: '380px',
              padding: '20px',
              zIndex: 20,
              background: '#111625',
              overflowY: 'auto',
              border: '1px solid #1f293d',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--accent-purple)',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                textTransform: 'uppercase'
              }}>
                {selectedNode.topic || 'Architecture'}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ fontSize: '14px', fontWeight: 700, lineHeight: '1.4', marginBottom: '12px', color: '#ffffff' }}>
              {selectedNode.decision}
            </h3>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
              <strong>Rationale:</strong> {selectedNode.rationale || 'No stated rationale recorded.'}
            </div>

            {selectedNode.alternatives?.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Evaluated Non-Selected Alternatives:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {selectedNode.alternatives.map((alt, idx) => (
                    <span key={idx} style={{ fontSize: '11px', background: '#1e293b', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} color="var(--text-muted)" />
              <strong>Decision Owner:</strong>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>
                {selectedNode.owner || 'Unknown / Unclear'}
              </span>
            </div>

            {selectedNode.quote && (
              <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-muted)', background: '#151b2c', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--accent-purple)', marginTop: '12px' }}>
                "{selectedNode.quote}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
