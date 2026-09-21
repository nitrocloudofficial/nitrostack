'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

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

const SEV_COLOR: Record<string, string> = { critical:'#ef4444', high:'#f97316', medium:'#eab308' };

const DANGER_CAPS = new Set(['READ_PRIVATE_DATA','SEND_EXTERNAL','WRITE_PUBLIC','DELETE_DATA','EXECUTE']);

export default function AgentInspector() {
    const theme  = useTheme();
    const isDark = theme === 'dark';
    const { callTool, sendFollowUpMessage } = useWidgetSDK();

    const [agentId,   setAgentId]   = useState('support-agent');
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState<string | null>(null);

    const inspect = async () => {
        if (!agentId.trim()) return;
        setLoading(true);
        setError(null);
        setGraphData(null);
        try {
            const resp = await callTool('get_capability_graph', { agentId: agentId.trim() });
            const data = (resp as any)?.result ?? resp;
            if (data?.error) throw new Error(data.error);
            setGraphData(data as GraphData);
        } catch (err) {
            setError((err as Error).message || 'Failed to fetch capability graph');
        } finally { setLoading(false); }
    };

    const runFollowUp = (prompt: string) => {
        sendFollowUpMessage(prompt).catch(() => {
            setError('This action needs a connected host — open this project in NitroStack Studio or a chat client to run it live.');
        });
    };

    const bg     = isDark ? '#060b14' : '#f0f4f8';
    const card   = isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.92)';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const text   = isDark ? '#f0f9ff' : '#0f172a';
    const sub    = isDark ? '#64748b' : '#94a3b8';
    const hr     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';

    const toolNodes  = graphData?.nodes.filter(n => n.type === 'tool') ?? [];
    const capNodes   = graphData?.nodes.filter(n => n.type === 'capability') ?? [];
    const riskPct    = graphData ? Math.round(graphData.riskScore * 100) : 0;
    const riskColor  = riskPct === 0 ? '#10b981' : riskPct < 60 ? '#f97316' : '#ef4444';
    const activePaths = graphData?.attackPaths ?? [];

    return (
        <div style={{ background:bg, fontFamily:'Inter, system-ui, sans-serif', color:text, minHeight:'100vh' }}>
            <style>{`
                @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin    { to{transform:rotate(360deg)} }
                @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
                @keyframes danger-glow { 0%,100%{box-shadow:0 0 8px rgba(239,68,68,0.35)} 50%{box-shadow:0 0 20px rgba(239,68,68,0.7)} }
                .input-field:focus { outline:none; border-color: rgba(59,130,246,0.6) !important; box-shadow:0 0 0 3px rgba(59,130,246,0.12) !important; }
                .inspect-btn:hover:not(:disabled) { transform:scale(1.02); box-shadow:0 6px 20px rgba(59,130,246,0.4) !important; }
                .inspect-btn { transition:all 0.15s ease; }
            `}</style>

            {/* ── Header ───────────────────────────────────────────────── */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg,rgba(9,14,28,0.98) 0%,rgba(22,18,60,0.98) 100%)'
                    : 'linear-gradient(135deg,rgba(239,246,255,0.99) 0%,rgba(240,253,244,0.99) 100%)',
                borderBottom:`1px solid ${border}`, backdropFilter:'blur(14px)', padding:'20px 20px 16px',
            }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{
                        width:44, height:44, borderRadius:13,
                        background:'rgba(59,130,246,0.12)', border:'1.5px solid rgba(59,130,246,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:21,
                        boxShadow:'0 0 20px rgba(59,130,246,0.2)',
                    }}>
                        🔍
                    </div>
                    <div>
                        <h2 style={{ margin:'0 0 2px', fontSize:16, fontWeight:800 }}>Agent Inspector</h2>
                        <p style={{ margin:0, fontSize:12, color:sub }}>Audit any agent's blast radius in real time</p>
                    </div>
                </div>

                {/* Agent input */}
                <div style={{ display:'flex', gap:8 }}>
                    <input
                        className="input-field"
                        type="text"
                        value={agentId}
                        onChange={e => setAgentId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && inspect()}
                        placeholder="Agent ID (e.g. support-agent)"
                        style={{
                            flex:1, padding:'10px 14px', borderRadius:11,
                            background: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.9)',
                            border:`1.5px solid ${border}`, color:text, fontSize:13,
                            fontFamily:'monospace', backdropFilter:'blur(8px)',
                            transition:'all 0.15s ease',
                        }}
                    />
                    <button
                        id="inspect-agent-btn"
                        className="inspect-btn"
                        onClick={inspect}
                        disabled={loading}
                        style={{
                            padding:'10px 20px', borderRadius:11, border:'none', fontWeight:700, fontSize:13,
                            background: loading ? (isDark ? '#1e293b' : '#e2e8f0') : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                            color: loading ? sub : '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.32)',
                            display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap',
                        }}
                    >
                        {loading ? <><span style={{ width:14, height:14, border:`2px solid ${sub}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} /> Inspecting…</> : '🔍 Inspect'}
                    </button>
                </div>
            </div>

            <div style={{ padding:'20px 18px 32px', display:'flex', flexDirection:'column', gap:24 }}>

                {/* Error */}
                {error && (
                    <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', fontSize:13 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Empty state */}
                {!graphData && !loading && !error && (
                    <div style={{ padding:'40px 20px', textAlign:'center' }}>
                        <div style={{ fontSize:46, marginBottom:14 }}>🔍</div>
                        <p style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color: isDark ? '#e2e8f0' : '#1e293b' }}>
                            Enter an agent ID above
                        </p>
                        <p style={{ margin:'0 0 20px', fontSize:12, color:sub, lineHeight:1.6 }}>
                            Inspect any agent's connected tools, live capabilities, and active attack paths.
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8 }}>
                            {['support-agent', 'data-agent', 'automation-agent'].map(id => (
                                <button
                                    key={id}
                                    onClick={() => { setAgentId(id); }}
                                    style={{
                                        padding:'6px 14px', borderRadius:20, border:`1px solid ${border}`,
                                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                        color:sub, fontSize:12, cursor:'pointer', fontFamily:'monospace',
                                    }}
                                >
                                    {id}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results */}
                {graphData && (
                    <>
                        {/* Risk summary */}
                        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:'18px', backdropFilter:'blur(12px)', animation:'fadeUp 0.4s ease both' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                                <div style={{
                                    flex:1, height:8, borderRadius:20,
                                    background: isDark ? '#0f172a' : '#e2e8f0', overflow:'hidden',
                                }}>
                                    <div style={{
                                        height:'100%', width:`${riskPct}%`, borderRadius:20,
                                        background:`linear-gradient(90deg, ${riskColor}88, ${riskColor})`,
                                        transition:'width 1s ease', boxShadow:`0 0 10px ${riskColor}70`,
                                    }} />
                                </div>
                                <div style={{ textAlign:'right', flexShrink:0 }}>
                                    <div style={{ fontSize:24, fontWeight:900, color:riskColor, lineHeight:1, fontFamily:'monospace' }}>{riskPct}%</div>
                                    <div style={{ fontSize:10, color:riskColor, fontWeight:700, opacity:0.8, textTransform:'uppercase', letterSpacing:0.5 }}>
                                        {riskPct === 0 ? 'Secure' : riskPct < 40 ? 'Low Risk' : riskPct < 70 ? 'High Risk' : 'Critical'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:16, marginTop:14 }}>
                                {[
                                    { label:'Tools', value:toolNodes.length, color:'#8b5cf6' },
                                    { label:'Capabilities', value:capNodes.length, color:'#10b981' },
                                    { label:'Attack Paths', value:activePaths.length, color: activePaths.length > 0 ? '#ef4444' : '#10b981' },
                                ].map(s => (
                                    <div key={s.label} style={{ flex:1, textAlign:'center', padding:'10px', borderRadius:10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border:`1px solid ${border}` }}>
                                        <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
                                        <div style={{ fontSize:10, color:sub, fontWeight:600, marginTop:2 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Connected Tools */}
                        {toolNodes.length > 0 && (
                            <section style={{ animation:'fadeUp 0.4s ease 0.1s both' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                                    <h3 style={{ margin:0, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, color:sub }}>Connected Tools</h3>
                                    <div style={{ flex:1, height:1, background:hr }} />
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                                    {toolNodes.map(n => {
                                        const toolId = n.id.replace('tool:','');
                                        const meta   = TOOL_META[toolId] ?? { emoji:'🔌', color:'#64748b' };
                                        const danger = graphData.edges.some(e => e.source === n.id && e.danger);
                                        return (
                                            <div key={n.id} style={{
                                                background:card, border:`1.5px solid ${danger ? 'rgba(239,68,68,0.40)' : border}`,
                                                borderRadius:12, padding:'11px 14px',
                                                display:'flex', alignItems:'center', gap:12,
                                                backdropFilter:'blur(10px)',
                                                animation: danger ? 'danger-glow 2.5s ease infinite' : 'none',
                                            }}>
                                                <span style={{ fontSize:20 }}>{meta.emoji}</span>
                                                <span style={{ flex:1, fontSize:13, fontWeight:700, color: danger ? '#f87171' : (isDark ? '#e2e8f0' : '#1e293b') }}>{n.label}</span>
                                                {danger && (
                                                    <span style={{ fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:20, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', animation:'pulse 1.8s ease infinite' }}>
                                                        RISK
                                                    </span>
                                                )}
                                                <span style={{ width:7, height:7, borderRadius:'50%', background:meta.color, boxShadow:`0 0 5px ${meta.color}` }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Capabilities */}
                        {capNodes.length > 0 && (
                            <section style={{ animation:'fadeUp 0.4s ease 0.18s both' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                                    <h3 style={{ margin:0, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, color:sub }}>Effective Capabilities</h3>
                                    <div style={{ flex:1, height:1, background:hr }} />
                                </div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                                    {capNodes.map(n => {
                                        const danger = DANGER_CAPS.has(n.label);
                                        const c      = danger ? '#ef4444' : '#10b981';
                                        return (
                                            <span key={n.id} style={{
                                                padding:'7px 13px', borderRadius:20, fontSize:12, fontWeight:700,
                                                display:'inline-flex', alignItems:'center', gap:6,
                                                background:`${c}${danger ? '12' : '08'}`,
                                                border:`1.5px solid ${c}${danger ? '40' : '28'}`,
                                                color:c,
                                                animation: danger ? 'pulse 2.5s ease infinite' : 'none',
                                            }}>
                                                {CAP_ICONS[n.label] ?? '🔑'} {n.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Attack Paths */}
                        {activePaths.length > 0 && (
                            <section style={{ animation:'fadeUp 0.4s ease 0.26s both' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                                    <h3 style={{ margin:0, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.2, color:sub }}>Active Attack Paths</h3>
                                    <div style={{ flex:1, height:1, background:hr }} />
                                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
                                        {activePaths.length} detected
                                    </span>
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                    {activePaths.map(path => {
                                        const color = SEV_COLOR[path.severity] ?? '#64748b';
                                        return (
                                            <div key={path.ruleId} style={{
                                                background:card, border:`1.5px solid ${color}35`,
                                                borderRadius:13, padding:'14px 16px',
                                                backdropFilter:'blur(10px)', borderLeft:`4px solid ${color}`,
                                            }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                                                    <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20, background:`${color}18`, border:`1px solid ${color}42`, color, textTransform:'uppercase', letterSpacing:0.7 }}>
                                                        {path.severity}
                                                    </span>
                                                    <code style={{ fontSize:13, fontWeight:700 }}>{path.ruleId}</code>
                                                </div>
                                                <p style={{ margin:'0 0 10px', fontSize:12, color:sub, lineHeight:1.55 }}>{path.message}</p>
                                                <button
                                                    onClick={() => runFollowUp(`Fix the ${path.ruleId} path on ${graphData.agentId}`)}
                                                    style={{
                                                        padding:'7px 14px', borderRadius:9, border:'none', fontSize:12, fontWeight:700,
                                                        background:`linear-gradient(135deg, ${color}ee, ${color}99)`, color:'#fff',
                                                        cursor:'pointer', boxShadow:`0 3px 12px ${color}30`,
                                                    }}
                                                >
                                                    🔧 Fix in Chat
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {activePaths.length === 0 && toolNodes.length > 0 && (
                            <div style={{ padding:'28px', textAlign:'center', background:card, borderRadius:16, border:`1px solid ${border}`, backdropFilter:'blur(10px)' }}>
                                <div style={{ fontSize:42, marginBottom:10 }}>✅</div>
                                <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#10b981' }}>No attack paths detected — this agent is safe!</p>
                            </div>
                        )}

                        {toolNodes.length === 0 && (
                            <div style={{ padding:'28px', textAlign:'center', background:card, borderRadius:16, border:`1px solid ${border}`, backdropFilter:'blur(10px)' }}>
                                <div style={{ fontSize:42, marginBottom:10 }}>🔌</div>
                                <p style={{ margin:'0 0 6px', fontSize:14, fontWeight:700, color: isDark ? '#e2e8f0' : '#1e293b' }}>No tools connected to {graphData.agentId}</p>
                                <p style={{ margin:'0 0 14px', fontSize:12, color:sub }}>Connect a tool to start auditing this agent.</p>
                                <button
                                    onClick={() => runFollowUp(`Connect dropbox to ${graphData.agentId}`)}
                                    style={{
                                        padding:'9px 18px', borderRadius:10, border:'none', fontWeight:700, fontSize:13,
                                        background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff',
                                        cursor:'pointer', boxShadow:'0 4px 14px rgba(59,130,246,0.3)',
                                    }}
                                >
                                    + Connect a Tool
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
