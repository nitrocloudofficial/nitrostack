'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState, useMemo } from 'react';

interface GraphNode  { id: string; type: 'agent' | 'tool' | 'capability'; label: string; }
interface GraphEdge  { id: string; source: string; target: string; danger: boolean; }
interface AttackPath { ruleId: string; source: string; sink: string; viaTools: string[]; severity: 'critical' | 'high' | 'medium'; message: string; }
interface GraphData  { agentId: string; nodes: GraphNode[]; edges: GraphEdge[]; attackPaths: AttackPath[]; riskScore: number; }

const TOOL_META: Record<string, { emoji: string; color: string }> = {
    gmail:      { emoji: '📧', color: '#ea4335' },
    dropbox:    { emoji: '📦', color: '#0061ff' },
    postgres:   { emoji: '🐘', color: '#336791' },
    slack:      { emoji: '💬', color: '#a855f7' },
    filesystem: { emoji: '🗂️', color: '#f59e0b' },
    calendar:   { emoji: '📅', color: '#10b981' },
};

const CAP_ICONS: Record<string, string> = {
    READ_PRIVATE_DATA:'👁️', READ_PUBLIC_DATA:'📖', WRITE_DATA:'✏️',
    WRITE_PUBLIC:'📢', SEND_EXTERNAL:'📤', DELETE_DATA:'🗑️', EXECUTE:'⚡',
};

const W = 460; const H = 460; const CX = 230; const CY = 230;
const R_TOOL = 125; const R_CAP = 215;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function CapabilityTopology() {
    const theme  = useTheme();
    const isDark = theme === 'dark';
    const { callTool } = useWidgetSDK();

    const [agentId,   setAgentId]   = useState('support-agent');
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState<string | null>(null);
    const [hovNode,   setHovNode]   = useState<string | null>(null);

    const fetchGraph = async () => {
        if (!agentId.trim()) return;
        setLoading(true); setError(null); setGraphData(null);
        try {
            const resp = await callTool('get_capability_graph', { agentId: agentId.trim() });
            const data = (resp as any)?.result ?? resp;
            if (data?.error) throw new Error(data.error);
            setGraphData(data as GraphData);
        } catch (err) { setError((err as Error).message); }
        finally { setLoading(false); }
    };

    const bg     = isDark ? '#060b14' : '#f0f4f8';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const text   = isDark ? '#f0f9ff' : '#0f172a';
    const sub    = isDark ? '#64748b' : '#94a3b8';
    const card   = isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.92)';

    const layout = useMemo(() => {
        if (!graphData) return { toolPositions: {}, capPositions: {} };
        const tools = graphData.nodes.filter(n => n.type === 'tool');
        const caps  = graphData.nodes.filter(n => n.type === 'capability');
        const toolPositions: Record<string, {x:number;y:number}> = {};
        const capPositions:  Record<string, {x:number;y:number}> = {};
        tools.forEach((n, i) => {
            toolPositions[n.id] = polar(CX, CY, R_TOOL, (i * 360) / Math.max(tools.length, 1));
        });
        caps.forEach((n, i) => {
            capPositions[n.id] = polar(CX, CY, R_CAP, (i * 360) / Math.max(caps.length, 1));
        });
        return { toolPositions, capPositions };
    }, [graphData]);

    const dangerToolIds = new Set(graphData?.edges.filter(e => e.danger).map(e => e.source) ?? []);
    const dangerCapIds  = new Set(graphData?.edges.filter(e => e.danger).map(e => e.target) ?? []);

    const hovEdges = hovNode
        ? graphData?.edges.filter(e => e.source === hovNode || e.target === hovNode).map(e => e.id) ?? []
        : [];

    return (
        <div style={{ background:bg, fontFamily:'Inter, system-ui, sans-serif', color:text, minHeight:'100vh' }}>
            <style>{`
                @keyframes spin   { to{transform:rotate(360deg)} }
                @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                .input-f:focus { outline:none; border-color:rgba(59,130,246,0.55) !important; box-shadow:0 0 0 3px rgba(59,130,246,0.12) !important; }
            `}</style>

            {/* Header */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg,rgba(9,14,28,0.98),rgba(22,18,60,0.98))'
                    : 'linear-gradient(135deg,rgba(239,246,255,0.99),rgba(240,253,244,0.99))',
                borderBottom:`1px solid ${border}`, backdropFilter:'blur(14px)', padding:'18px 18px 14px',
            }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                    <div style={{
                        width:44, height:44, borderRadius:13, fontSize:21,
                        background:'rgba(139,92,246,0.12)', border:'1.5px solid rgba(139,92,246,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        boxShadow:'0 0 20px rgba(139,92,246,0.2)',
                    }}>🕸️</div>
                    <div>
                        <h2 style={{ margin:'0 0 2px', fontSize:16, fontWeight:800 }}>Capability Topology</h2>
                        <p style={{ margin:0, fontSize:12, color:sub }}>Visual orbital graph — agent → tools → capabilities</p>
                    </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    <input
                        className="input-f"
                        value={agentId}
                        onChange={e => setAgentId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && fetchGraph()}
                        placeholder="Agent ID"
                        style={{
                            flex:1, padding:'10px 13px', borderRadius:11,
                            background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
                            border:`1.5px solid ${border}`, color:text, fontSize:13,
                            fontFamily:'monospace', transition:'all 0.15s ease',
                        }}
                    />
                    <button
                        id="topology-fetch-btn"
                        onClick={fetchGraph}
                        disabled={loading}
                        style={{
                            padding:'10px 18px', borderRadius:11, border:'none', fontWeight:700, fontSize:13,
                            background: loading ? (isDark ? '#1e293b' : '#e2e8f0') : 'linear-gradient(135deg,#8b5cf6,#6366f1)',
                            color: loading ? sub : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: loading ? 'none' : '0 4px 16px rgba(139,92,246,0.32)',
                            display:'flex', alignItems:'center', gap:7,
                        }}
                    >
                        {loading ? <><span style={{ width:14, height:14, border:`2px solid ${sub}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Loading…</> : '🕸️ Render'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ margin:'16px 18px', padding:'12px 14px', borderRadius:11, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:13 }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Empty / prompt */}
            {!graphData && !loading && !error && (
                <div style={{ padding:'44px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:48, marginBottom:14 }}>🕸️</div>
                    <p style={{ margin:'0 0 4px', fontSize:15, fontWeight:700, color: isDark ? '#e2e8f0' : '#1e293b' }}>Enter an agent ID to visualize</p>
                    <p style={{ margin:0, fontSize:12, color:sub }}>Orbital graph: agent → tools (middle) → capabilities (outer)</p>
                </div>
            )}

            {/* SVG Topology */}
            {graphData && !loading && (
                <div style={{ padding:'12px 12px 8px', animation:'fadeUp 0.4s ease both' }}>
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        style={{ width:'100%', maxHeight:400, display:'block' }}
                    >
                        <defs>
                            <filter id="glow-red">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <filter id="glow-blue">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                        </defs>

                        {/* Orbital rings */}
                        <circle cx={CX} cy={CY} r={R_TOOL} fill="none" stroke={isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.1)'} strokeWidth="1" strokeDasharray="4 4" />
                        <circle cx={CX} cy={CY} r={R_CAP}  fill="none" stroke={isDark ? 'rgba(16,185,129,0.1)'  : 'rgba(16,185,129,0.08)'} strokeWidth="1" strokeDasharray="4 4" />

                        {/* Edges: tool → capability */}
                        {graphData.edges.map(edge => {
                            const sPos = layout.toolPositions[edge.source];
                            const tPos = layout.capPositions[edge.target];
                            if (!sPos || !tPos) return null;
                            const danger = edge.danger;
                            const isHov  = hovEdges.includes(edge.id);
                            const toolId = edge.source.replace('tool:','');
                            const meta   = TOOL_META[toolId] ?? { color:'#64748b' };
                            return (
                                <line key={edge.id}
                                    x1={sPos.x} y1={sPos.y} x2={tPos.x} y2={tPos.y}
                                    stroke={ isHov ? (danger ? '#ef4444' : meta.color) : (danger ? 'rgba(239,68,68,0.55)' : (isDark ? 'rgba(100,116,139,0.22)' : 'rgba(100,116,139,0.18)')) }
                                    strokeWidth={ isHov ? 2.5 : 1.5 }
                                    filter={ danger ? 'url(#glow-red)' : undefined }
                                    style={{ transition:'all 0.2s ease' }}
                                />
                            );
                        })}

                        {/* Agent node (center) */}
                        <circle cx={CX} cy={CY} r={30} fill={isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'} stroke="rgba(59,130,246,0.5)" strokeWidth="2" filter="url(#glow-blue)" />
                        <text x={CX} y={CY + 6} textAnchor="middle" fontSize="22" style={{ userSelect:'none' }}>🤖</text>
                        <text x={CX} y={CY + 50} textAnchor="middle" fontSize="10" fill={isDark ? '#60a5fa' : '#2563eb'} fontWeight="700">
                            {graphData.agentId}
                        </text>

                        {/* Tool nodes */}
                        {graphData.nodes.filter(n => n.type === 'tool').map(n => {
                            const pos    = layout.toolPositions[n.id];
                            if (!pos) return null;
                            const toolId = n.id.replace('tool:','');
                            const meta   = TOOL_META[toolId] ?? { emoji:'🔌', color:'#64748b' };
                            const danger = dangerToolIds.has(n.id);
                            const hovHL  = hovNode === n.id;
                            return (
                                <g key={n.id}
                                    onMouseEnter={() => setHovNode(n.id)}
                                    onMouseLeave={() => setHovNode(null)}
                                    style={{ cursor:'pointer' }}
                                >
                                    <circle cx={pos.x} cy={pos.y} r={hovHL ? 24 : 20}
                                        fill={ danger ? (isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)') : (isDark ? `${meta.color}18` : `${meta.color}12`) }
                                        stroke={ hovHL ? meta.color : (danger ? 'rgba(239,68,68,0.65)' : `${meta.color}60`) }
                                        strokeWidth={ hovHL ? 2.5 : 1.5 }
                                        filter={ danger ? 'url(#glow-red)' : undefined }
                                        style={{ transition:'all 0.18s ease' }}
                                    />
                                    <text x={pos.x} y={pos.y + 6} textAnchor="middle" fontSize="15" style={{ userSelect:'none' }}>{meta.emoji}</text>
                                    <text x={pos.x} y={pos.y + 36} textAnchor="middle" fontSize="9" fill={danger ? '#f87171' : (isDark ? '#94a3b8' : '#64748b')} fontWeight="600">
                                        {toolId}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Capability nodes */}
                        {graphData.nodes.filter(n => n.type === 'capability').map(n => {
                            const pos    = layout.capPositions[n.id];
                            if (!pos) return null;
                            const danger = dangerCapIds.has(n.id);
                            const hovHL  = hovNode === n.id;
                            const icon   = CAP_ICONS[n.label] ?? '🔑';
                            return (
                                <g key={n.id}
                                    onMouseEnter={() => setHovNode(n.id)}
                                    onMouseLeave={() => setHovNode(null)}
                                    style={{ cursor:'pointer' }}
                                >
                                    <circle cx={pos.x} cy={pos.y} r={hovHL ? 18 : 15}
                                        fill={ danger ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)') : (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.07)') }
                                        stroke={ danger ? (hovHL ? '#ef4444' : 'rgba(239,68,68,0.55)') : (hovHL ? '#10b981' : 'rgba(16,185,129,0.4)') }
                                        strokeWidth={ hovHL ? 2 : 1.2 }
                                        filter={ danger ? 'url(#glow-red)' : undefined }
                                        style={{ transition:'all 0.18s ease' }}
                                    />
                                    <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize="12" style={{ userSelect:'none' }}>{icon}</text>
                                    <text x={pos.x} y={pos.y + 30} textAnchor="middle" fontSize="7.5" fill={danger ? '#f87171' : (isDark ? '#6ee7b7' : '#047857')} fontWeight="600">
                                        {n.label.replace(/_/g,' ')}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Legend */}
                    <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', marginTop:4, marginBottom:12 }}>
                        {[
                            { shape:'circle', color:'#3b82f6', label:'Agent' },
                            { shape:'circle', color:'#8b5cf6', label:'Tools' },
                            { shape:'circle', color:'#10b981', label:'Capabilities' },
                            { shape:'line',   color:'#ef4444', label:'Danger edge' },
                        ].map(l => (
                            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:sub }}>
                                {l.shape === 'circle'
                                    ? <span style={{ width:9, height:9, borderRadius:'50%', background:l.color, boxShadow:`0 0 5px ${l.color}`, display:'inline-block' }} />
                                    : <span style={{ width:16, height:2, background:l.color, display:'inline-block', boxShadow:`0 0 4px ${l.color}` }} />
                                }
                                {l.label}
                            </div>
                        ))}
                    </div>

                    {/* Risk summary footer */}
                    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:12, padding:'11px 16px', backdropFilter:'blur(10px)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:12, color:sub }}>
                            {graphData.nodes.filter(n=>n.type==='tool').length} tools · {graphData.nodes.filter(n=>n.type==='capability').length} capabilities
                        </span>
                        <span style={{
                            fontSize:12, fontWeight:700,
                            color: graphData.attackPaths.length > 0 ? '#f87171' : '#10b981',
                        }}>
                            {graphData.attackPaths.length > 0 ? `⚠️ ${graphData.attackPaths.length} attack path${graphData.attackPaths.length>1?'s':''}` : '✓ Secure'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
