'use client';

export const dynamic = 'force-dynamic';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GraphNode  { id: string; type: 'agent' | 'tool' | 'capability'; label: string; }
interface GraphEdge  { id: string; source: string; target: string; danger: boolean; }
interface AttackPath { ruleId: string; source: string; sink: string; viaTools: string[]; severity: 'critical' | 'high' | 'medium'; message: string; }
interface CapabilityGraphData { agentId: string; nodes: GraphNode[]; edges: GraphEdge[]; attackPaths: AttackPath[]; riskScore: number; }

const TOOL_META: Record<string, { emoji: string; color: string }> = {
    gmail:      { emoji: '📧', color: '#ea4335' },
    dropbox:    { emoji: '📦', color: '#0061ff' },
    postgres:   { emoji: '🐘', color: '#336791' },
    slack:      { emoji: '💬', color: '#a855f7' },
    filesystem: { emoji: '🗂️', color: '#f59e0b' },
    calendar:   { emoji: '📅', color: '#10b981' },
};

const CAP_ICONS: Record<string, string> = {
    READ_PRIVATE_DATA: '👁️', READ_PUBLIC_DATA: '📖', WRITE_DATA: '✏️',
    WRITE_PUBLIC: '📢', SEND_EXTERNAL: '📤', DELETE_DATA: '🗑️', EXECUTE: '⚡',
};

const SEV_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308' };

export default function CapabilityGraphWidget() {
    const theme  = useTheme();
    const isDark = theme === 'dark';
    const { getToolOutput, callTool, isReady, sendFollowUpMessage } = useWidgetSDK();
    const data   = getToolOutput<CapabilityGraphData>();

    const [applying, setApplying] = useState<string | null>(null);
    const [fixed,    setFixed]    = useState<string[]>([]);
    const [hovPath,  setHovPath]  = useState<string | null>(null);

    const applyFix = async (e: React.MouseEvent, ruleId: string) => {
        e.stopPropagation();
        if (!data) return;
        setApplying(ruleId);
        try {
            await callTool('apply_policy_fix', { agentId: data.agentId, ruleId });
            setFixed(prev => [...prev, ruleId]);
        } finally { setApplying(null); }
    };

    const bg     = isDark ? '#020617' : '#f8fafc';
    const card   = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)';
    const border = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const text   = isDark ? '#f8fafc' : '#0f172a';
    const sub    = isDark ? '#94a3b8' : '#64748b';
    const inset  = isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,1)';
    const laneBg = isDark ? 'rgba(15,23,42,0.3)' : 'rgba(241,245,249,0.5)';

    if (!isReady || !data) {
        return (
            <div style={{ background:bg, minHeight:500, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, fontFamily:'Inter, system-ui, sans-serif' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 44, height: 44, border: `3px solid ${border}`, borderTopColor: '#3b82f6', borderRadius: '50%' }}
                />
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color:sub, fontSize:14, fontWeight:500, margin:0 }}>
                    Compiling capability matrix...
                </motion.p>
            </div>
        );
    }

    const riskPct   = Math.round(data.riskScore * 100);
    const riskColor = riskPct === 0 ? '#10b981' : riskPct < 60 ? '#f97316' : '#ef4444';
    
    const toolNodes  = data.nodes.filter(n => n.type === 'tool');
    const capNodes   = data.nodes.filter(n => n.type === 'capability');
    const agentNode  = data.nodes.find(n => n.type === 'agent');

    const dangerCapIds  = new Set(data.edges.filter(e => e.danger).map(e => e.target));
    const dangerToolIds = new Set(data.edges.filter(e => e.danger).map(e => e.source));

    const activePaths   = data.attackPaths.filter(p => !fixed.includes(p.ruleId));
    const allFixed      = data.attackPaths.length > 0 && activePaths.length === 0;

    const hovPathObj = hovPath ? data.attackPaths.find(p => p.ruleId === hovPath) : null;
    const hovToolIds = new Set(hovPathObj?.viaTools.map(t => `tool:${t}`) ?? []);
    const hovCapIds  = new Set([ ...(hovPathObj ? data.edges.filter(e => hovToolIds.has(e.source)).map(e => e.target) : []) ]);

    const laneVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } };

    return (
        <div style={{ background:bg, fontFamily:'Inter, system-ui, sans-serif', color:text, overflow:'hidden', minHeight:'100vh', position:'relative' }}>
            {/* Ambient Background Glow */}
            <motion.div animate={{ opacity:[0.1, 0.2, 0.1] }} transition={{ duration:10, repeat:Infinity }}
                style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:'80vw', height:'40vh', background:`radial-gradient(ellipse, ${riskColor}30 0%, transparent 70%)`, filter:'blur(80px)', pointerEvents:'none' }}
            />

            {/* Header */}
            <div style={{ position:'relative', zIndex:10, background: isDark ? 'rgba(2,6,23,0.7)' : 'rgba(255,255,255,0.7)', borderBottom: `1px solid ${border}`, backdropFilter:'blur(24px)', padding:'24px', display:'flex', alignItems:'center', gap:20 }}>
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                    style={{ width:56, height:56, borderRadius:18, background:`${riskColor}15`, border:`1px solid ${riskColor}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow: `0 0 30px ${riskColor}30`, flexShrink:0 }}
                >
                    🗺️
                </motion.div>
                <div style={{ flex:1, minWidth:0 }}>
                    <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:800, letterSpacing:'-0.02em' }}>Security Topology</h2>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <motion.span animate={allFixed ? {} : { opacity:[1, 0.3, 1] }} transition={{ duration:2, repeat:Infinity }} style={{ width:8, height:8, borderRadius:'50%', background:riskColor, display:'inline-block', boxShadow:`0 0 10px ${riskColor}` }} />
                        <span style={{ fontSize:14, color:text, fontWeight:600 }}>{data.agentId}</span>
                        {allFixed && <span style={{ fontSize:12, color:'#10b981', fontWeight:700, marginLeft:6, padding:'2px 8px', borderRadius:20, background:'rgba(16,185,129,0.1)' }}>✓ Secure</span>}
                    </div>
                </div>
                <div style={{ textAlign:'right', padding:'10px 20px', background:`${riskColor}10`, border:`1px solid ${riskColor}30`, borderRadius:16, boxShadow:inset }}>
                    <div style={{ fontSize:28, fontWeight:900, color:riskColor, lineHeight:1, fontFamily:'monospace', letterSpacing:'-0.05em' }}>{riskPct}%</div>
                    <div style={{ fontSize:10, color:riskColor, fontWeight:800, marginTop:4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Risk</div>
                </div>
            </div>

            {/* Risk bar */}
            <div style={{ position:'relative', zIndex:10, height:3, background: isDark ? '#0f172a' : '#e2e8f0', overflow:'hidden' }}>
                <motion.div initial={{ width:0 }} animate={{ width:`${riskPct}%` }} transition={{ duration:1.5, ease:'circOut' }}
                    style={{ height:'100%', background:`linear-gradient(90deg, transparent, ${riskColor})`, boxShadow:`0 0 12px ${riskColor}` }}
                />
            </div>

            {/* 3-Lane Graph Content */}
            <div style={{ position:'relative', zIndex:1, padding:'40px 24px', overflowX:'auto' }}>
                <motion.div variants={laneVariants} initial="hidden" animate="show" style={{ display:'grid', gridTemplateColumns:'1fr 40px 1.2fr 40px 1.5fr', minWidth:600, alignItems:'start', gap:0 }}>
                    
                    {/* Lane 1: Agent */}
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:sub, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', display:'inline-block' }} /> IDENTITY
                        </div>
                        {agentNode && (
                            <motion.div variants={itemVariants} style={{ padding:'24px', borderRadius:20, background: isDark?'rgba(59,130,246,0.1)':'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.4)', display:'flex', flexDirection:'column', alignItems:'center', gap:12, boxShadow:`0 0 40px rgba(59,130,246,0.1), ${inset}`, backdropFilter:'blur(20px)' }}>
                                <span style={{ fontSize:32 }}>🤖</span>
                                <span style={{ fontSize:13, fontWeight:800, color:'#60a5fa', textAlign:'center', wordBreak:'break-all' }}>{agentNode.label}</span>
                            </motion.div>
                        )}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', paddingTop:60 }}>
                        <svg width="40" height="2" overflow="visible"><line x1="0" y1="0" x2="40" y2="0" stroke={border} strokeWidth="2" strokeDasharray="4 4" /></svg>
                    </div>

                    {/* Lane 2: Tools */}
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:sub, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:'#8b5cf6', display:'inline-block' }} /> GATEWAYS
                        </div>
                        {toolNodes.map(n => {
                            const ti = n.id.replace('tool:','');
                            const m = TOOL_META[ti] || { emoji:'🔌', color:'#64748b' };
                            const danger = dangerToolIds.has(n.id);
                            const hov = hovToolIds.has(n.id);
                            return (
                                <motion.div key={n.id} variants={itemVariants} whileHover={{ x:4 }} style={{
                                    padding:'14px 16px', borderRadius:16,
                                    background: hov ? `${m.color}20` : danger ? 'rgba(239,68,68,0.15)' : card,
                                    border: `1px solid ${hov ? `${m.color}60` : danger ? 'rgba(239,68,68,0.6)' : border}`,
                                    display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(20px)',
                                    boxShadow: danger ? `0 0 20px rgba(239,68,68,0.3), ${inset}` : inset,
                                }}>
                                    <span style={{ fontSize:22 }}>{m.emoji}</span>
                                    <span style={{ flex:1, fontSize:13, fontWeight:700, color: danger ? '#f87171' : text }}>{n.label}</span>
                                    {danger && <motion.span animate={{ opacity:[1,0.5,1] }} transition={{ duration:1.5, repeat:Infinity }} style={{ fontSize:10, fontWeight:900, background:'#ef444430', color:'#fca5a5', padding:'2px 8px', borderRadius:20 }}>RISK</motion.span>}
                                </motion.div>
                            );
                        })}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', paddingTop:60 }}>
                        <svg width="40" height="20" overflow="visible">
                            {/* Animated data flow borders for danger edges */}
                            {data.edges.filter(e => e.danger).length > 0 ? (
                                <motion.line x1="0" y1="10" x2="40" y2="10" stroke="#ef4444" strokeWidth="2" strokeDasharray="8 8"
                                    animate={{ strokeDashoffset: -16 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }}
                                />
                            ) : (
                                <line x1="0" y1="10" x2="40" y2="10" stroke={border} strokeWidth="2" strokeDasharray="4 4" />
                            )}
                        </svg>
                    </div>

                    {/* Lane 3: Capabilities */}
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:sub, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block' }} /> CAPABILITIES
                        </div>
                        {capNodes.map(n => {
                            const danger = dangerCapIds.has(n.id);
                            const hov = hovCapIds.has(n.id);
                            return (
                                <motion.div key={n.id} variants={itemVariants} whileHover={{ x:4 }} style={{
                                    padding:'12px 16px', borderRadius:14,
                                    background: hov ? (danger ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)') : danger ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.05)',
                                    border: `1px solid ${hov ? (danger?'#ef4444':'#10b981') : danger ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.2)'}`,
                                    display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(20px)',
                                    boxShadow: danger ? `0 0 20px rgba(239,68,68,0.2)` : 'none',
                                }}>
                                    <span style={{ fontSize:16 }}>{CAP_ICONS[n.label] ?? '🔑'}</span>
                                    <span style={{ flex:1, fontSize:12, fontWeight:700, color: danger ? '#fca5a5' : isDark ? '#6ee7b7' : '#059669' }}>{n.label}</span>
                                    {danger && <motion.span animate={{ scale:[1,1.2,1] }} transition={{ duration:1.5, repeat:Infinity }} style={{ fontSize:14 }}>⚠️</motion.span>}
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Attack Paths Panel */}
            <AnimatePresence>
                {data.attackPaths.length > 0 && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ padding: '0 24px 34px', position:'relative', zIndex:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                            <h3 style={{ margin:0, fontSize:14, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:text }}>Active Attack Paths</h3>
                            <div style={{ flex:1, height:1, background:border }} />
                            {allFixed && (
                                <motion.button whileHover={{ scale:1.05 }} onClick={() => sendFollowUpMessage(`Show updated capability graph for ${data.agentId}`)}
                                    style={{ padding:'6px 14px', borderRadius:12, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', color:'#10b981', fontWeight:700, fontSize:12, cursor:'pointer' }}
                                >
                                    ↻ Refresh Dashboard
                                </motion.button>
                            )}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            {data.attackPaths.map(path => {
                                const isFixed = fixed.includes(path.ruleId);
                                const color = SEV_COLOR[path.severity] ?? '#64748b';
                                return (
                                    <motion.div key={path.ruleId} layout onHoverStart={() => setHovPath(path.ruleId)} onHoverEnd={() => setHovPath(null)}
                                        style={{
                                            background: isFixed ? laneBg : isDark ? `${color}15` : `${color}10`,
                                            border: `1px solid ${isFixed ? border : `${color}40`}`,
                                            borderRadius: 20, padding: 20, opacity: isFixed ? 0.6 : 1,
                                            boxShadow: isFixed ? 'none' : `inset 0 0 40px ${color}10`,
                                            backdropFilter: 'blur(20px)',
                                        }}
                                    >
                                        <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                                            <div style={{ flex:1 }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                                                    <span style={{ fontSize:10, fontWeight:900, background:`${color}20`, color, padding:'4px 10px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.05em' }}>{path.severity}</span>
                                                    <code style={{ fontSize:15, fontWeight:800, color: isFixed ? sub : text }}>{path.ruleId}</code>
                                                    {isFixed && <span style={{ fontSize:13, fontWeight:800, color:'#10b981' }}>✓ Neutralized</span>}
                                                </div>
                                                <p style={{ margin:'0 0 12px', fontSize:14, color: isDark ? '#cbd5e1' : '#475569', lineHeight:1.6 }}>{path.message}</p>
                                                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                                    {path.viaTools.map((t, ti) => (
                                                        <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                                                            <span style={{ background:isDark?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.7)', border:`1px solid ${border}`, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, color:text }}>
                                                                {(TOOL_META[t]?.emoji ?? '🔌')} {t}
                                                            </span>
                                                            {ti < path.viaTools.length - 1 && <span style={{ color, fontWeight:800 }}>+</span>}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            {!isFixed && (
                                                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.95 }}
                                                    onClick={(e: React.MouseEvent) => applyFix(e, path.ruleId)} disabled={applying === path.ruleId}
                                                    style={{
                                                        padding:'12px 20px', borderRadius:14, border:'none',
                                                        background: applying === path.ruleId ? laneBg : `linear-gradient(135deg, ${color}, ${color}cc)`,
                                                        color: applying === path.ruleId ? sub : '#fff',
                                                        fontWeight:800, fontSize:13, cursor: applying === path.ruleId ? 'wait' : 'pointer',
                                                        boxShadow: `0 8px 24px ${color}30, inset 0 1px 0 rgba(255,255,255,0.3)`,
                                                        display:'flex', alignItems:'center', gap:8
                                                    }}
                                                >
                                                    {applying === path.ruleId ? 'Fixing...' : '🔧 Fix Workflow'}
                                                </motion.button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
