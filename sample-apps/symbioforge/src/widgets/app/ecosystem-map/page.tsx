'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState } from 'react';
import { MapPin, ArrowRight, RefreshCw, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Node {
  id: string;
  name: string;
  industryType: string;
  lat: number;
  lng: number;
  co2Avoided: number;
  savingsEarned: number;
  complianceStatus: 'filed' | 'pending' | 'overdue';
}

interface Edge {
  id: string;
  source: string;
  target: string;
  wasteStreamName: string;
  compatibilityScore: number;
  volumeTonsPerYear: number;
  co2SavedTonsPerYear: number;
  status: 'New' | 'Evaluated' | 'Blueprint Ready' | 'Active';
}

interface EcosystemMapData {
  success: boolean;
  circularScore: number;
  nodes: Node[];
  edges: Edge[];
}

export default function EcosystemMap() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<EcosystemMapData>();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  if (!isReady) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Initializing SDK...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading Ecosystem Map Data...
      </div>
    );
  }

  const nodes = data.nodes ?? [];
  const edges = data.edges ?? [];
  const circularScore = data.circularScore ?? 0;

  const getIndustryColor = (industryType: string): string => {
    if (industryType === 'Metal Forging') return '#ef4444';
    if (industryType === 'Cement Manufacturing') return '#64748b';
    if (industryType === 'Textile Manufacturing') return '#3b82f6';
    if (industryType === 'Paper & Pulp') return '#10b981';
    if (industryType === 'Chemical Processing') return '#8b5cf6';
    if (industryType === 'Food Processing') return '#f59e0b';
    if (industryType === 'Plastic Recycling') return '#ec4899';
    if (industryType === 'Electronics Assembly') return '#06b6d4';
    if (industryType === 'Glass Manufacturing') return '#14b8a6';
    if (industryType === 'Fertilizer Plant') return '#84cc16';
    return '#94a3b8';
  };

  // Map coordinates to SVG space (Coimbatore area is roughly lat 10.9 to 11.1, lng 76.8 to 77.1)
  const mapCoordsToSvg = (lat: number, lng: number) => {
    const minLat = 10.95;
    const maxLat = 11.05;
    const minLng = 76.90;
    const maxLng = 77.05;

    // Normalize to 0-100%
    const x = ((lng - minLng) / (maxLng - minLng)) * 320 + 40;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 240 + 40;

    return { x, y };
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin style={{ color: '#10b981' }} /> SymbioForge Ecosystem Map
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Interactive node-edge graph of industrial symbiosis in Coimbatore
          </p>
        </div>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Circular Score:</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{circularScore}%</span>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px' }}>
        {/* SVG Map Area */}
        <div style={{
          position: 'relative',
          height: '360px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          <svg style={{ width: '100%', height: '100%' }}>
            {/* Grid Lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges (Symbiotic Flows) */}
            {edges.map((edge) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const p1 = mapCoordsToSvg(sourceNode.lat, sourceNode.lng);
              const p2 = mapCoordsToSvg(targetNode.lat, targetNode.lng);

              const isSelected = selectedEdge?.id === edge.id;
              const strokeColor = edge.status === 'Active' ? '#10b981' : '#f59e0b';

              return (
                <g key={edge.id} style={{ cursor: 'pointer' }} onClick={() => handleEdgeClick(edge)}>
                  {/* Glow effect for selected edge */}
                  {isSelected && (
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth="6"
                      opacity="0.4"
                    />
                  )}
                  {/* Main line */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 3 : 1.5}
                    strokeDasharray={edge.status === 'Active' ? 'none' : '4,4'}
                    opacity={isSelected ? 1 : 0.7}
                  />
                  {/* Animated flow dot */}
                  {edge.status === 'Active' && (
                    <circle r="3" fill="#fff">
                      <animateMotion
                        path={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Nodes (Factories) */}
            {nodes.map((node) => {
              const { x, y } = mapCoordsToSvg(node.lat, node.lng);
              const isSelected = selectedNode?.id === node.id;
              const color = getIndustryColor(node.industryType);

              return (
                <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(node)}>
                  {/* Glow effect for selected node */}
                  {isSelected && (
                    <circle
                      cx={x}
                      cy={y}
                      r="14"
                      fill={color}
                      opacity="0.3"
                    />
                  )}
                  {/* Outer ring */}
                  <circle
                    cx={x}
                    cy={y}
                    r="9"
                    fill="#0f172a"
                    stroke={color}
                    strokeWidth="2"
                  />
                  {/* Inner dot */}
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={color}
                  />
                </g>
              );
            })}
          </svg>

          {/* Map Legend */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #334155',
            fontSize: '9px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#94a3b8', marginBottom: '2px' }}>Legend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              <span>Active Symbiosis</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
              <span>Blueprint Ready</span>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '360px',
          boxSizing: 'border-box'
        }}>
          {selectedNode ? (
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{selectedNode.name}</h3>
              <span style={{
                fontSize: '10px',
                backgroundColor: getIndustryColor(selectedNode.industryType),
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {selectedNode.industryType}
              </span>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Compliance Status</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: selectedNode.complianceStatus === 'filed' ? '#10b981' : '#f59e0b',
                    textTransform: 'capitalize'
                  }}>
                    {selectedNode.complianceStatus}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>CO2 Avoided</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>{selectedNode.co2Avoided} tons/yr</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Savings Earned</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>₹{(selectedNode.savingsEarned / 100000).toFixed(1)}L/yr</div>
                </div>
              </div>
            </div>
          ) : selectedEdge ? (
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Symbiotic Flow</h3>
              <span style={{
                fontSize: '10px',
                backgroundColor: selectedEdge.status === 'Active' ? '#10b981' : '#f59e0b',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {selectedEdge.status}
              </span>

              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Material</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{selectedEdge.wasteStreamName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Compatibility Score</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>{selectedEdge.compatibilityScore}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>Volume</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{selectedEdge.volumeTonsPerYear} tons/yr</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>CO2 Saved</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>{selectedEdge.co2SavedTonsPerYear} tons/yr</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', textAlign: 'center' }}>
              <Info size={32} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '12px' }}>Click on any factory node or symbiotic edge to view details.</p>
            </div>
          )}

          <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
              <span>Total Factories:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{nodes.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
              <span>Total Connections:</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{edges.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
