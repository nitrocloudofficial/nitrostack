'use client';

export const dynamic = 'force-dynamic';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttackPath { ruleId: string; source: string; sink: string; viaTools: string[]; severity: 'critical' | 'high' | 'medium'; message: string; }
interface AttackPathData { agentId: string; paths: AttackPath[]; riskScore: number; }

const TOOL_META: Record<string, { emoji: string; color: string }> = {
    gmail:      { emoji: '📧', color: '#ea4335' },
    dropbox:    { emoji: '📦', color: '#0061ff' },
    postgres:   { emoji: '🐘', color: '#336791' },
    slack:      { emoji: '💬', color: '#a855f7' },
    filesystem: { emoji: '🗂️', color: '#f59e0b' },
    calendar:   { emoji: '📅', color: '#10b981' },
};

const SEV_COLOR: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308' };

export default function AttackPathAlert() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { getToolOutput, callTool, sendFollowUpMessage, isReady } = useWidgetSDK();
    const data = getToolOutput<AttackPathData>();

    const [applying, setApplying] = useState<string | null>(null);
    const [fixed, setFixed] = useState<string[]>([]);
    const [viewGraph, setViewGraph] = useState(false);

    const applyFix = async (ruleId: string) => {
        if (!data) return;
        setApplying(ruleId);
        try {
            await callTool('apply_policy_fix', { agentId: data.agentId, ruleId });
            setFixed(prev => [...prev, ruleId]);
        } finally {
            setApplying(null);
        }
    };

    const bg     = isDark ? '#020617' : '#f8fafc';
    const card   = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)';
    const border = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const text   = isDark ? '#f8fafc' : '#0f172a';
    const sub    = isDark ? '#94a3b8' : '#64748b';
    const inset  = isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,1)';

    if (!isReady || !data) {
        return (
            <div style={{ background:bg, minHeight:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, fontFamily:'Inter, system-ui, sans-serif' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 44, height: 44, border: `3px solid ${border}`, borderTopColor: '#ef4444', borderRadius: '50%' }}
                />
                <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color:sub, fontSize:14, fontWeight:500, margin:0 }}>
                    Scanning capability combinations...
                </motion.p>
            </div>
        );
    }

    const activePaths = data.paths.filter(p => !fixed.includes(p.ruleId));
    const isAllClear  = data.paths.length === 0 || activePaths.length === 0;

    return (
        <div style={{ background:bg, fontFamily:'Inter, system-ui, sans-serif', color:text, overflow:'hidden', minHeight:'100%', position:'relative' }}>
            
            {/* Ambient Background Glow based on state */}
            <motion.div animate={{ opacity:[0.15, 0.25, 0.15] }} transition={{ duration:8, repeat:Infinity }}
                style={{ position:'absolute', top:'-30%', left:'50%', transform:'translateX(-50%)', width:'100vw', height:'60vh', background:`radial-gradient(ellipse, ${isAllClear ? '#10b981' : '#ef4444'}30 0%, transparent 70%)`, filter:'blur(80px)', pointerEvents:'none' }}
            />

            <div style={{ position:'relative', zIndex:1, padding: 24, maxWidth: 800, margin: '0 auto' }}>
                <AnimatePresence mode="wait">
                    {isAllClear ? (
                        <motion.div key="clear" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            style={{
                                background: card, border: `1px solid rgba(16,185,129,0.3)`,
                                borderRadius: 24, padding: 48, textAlign: 'center',
                                backdropFilter: 'blur(20px)', boxShadow: inset
                            }}
                        >
                            <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.7, type: "spring" }}
                                style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}
                            >
                                ✓
                            </motion.div>
                            <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#10b981' }}>All Clear</h2>
                            <p style={{ margin: '0 0 32px', fontSize: 15, color: sub, lineHeight: 1.6 }}>
                                No active attack paths detected on <strong>{data.agentId}</strong>.<br/>Policies enforced successfully.
                            </p>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => sendFollowUpMessage(`Show the capability graph for ${data.agentId}`)}
                                style={{
                                    padding: '14px 28px', borderRadius: 16, border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                                    boxShadow: '0 8px 30px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                                }}
                            >
                                🗺️ View Secured Graph
                            </motion.button>
                        </motion.div>
                    ) : (
                        <motion.div key="alert" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ staggerChildren: 0.1 }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 0 30px rgba(239,68,68,0.3)', flexShrink: 0 }}
                                >
                                    🚨
                                </motion.div>
                                <div>
                                    <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#ef4444' }}>Threat Detected</h2>
                                    <p style={{ margin: 0, fontSize: 13, color: sub, fontWeight: 600 }}>
                                        {activePaths.length} toxic combination{activePaths.length === 1 ? '' : 's'} on <strong style={{ color: text }}>{data.agentId}</strong>
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {data.paths.map((path, idx) => {
                                    const isFixed = fixed.includes(path.ruleId);
                                    if (isFixed) return null; // We remove it immediately or leave it? Let's remove it for impact.

                                    const color = SEV_COLOR[path.severity] ?? '#64748b';
                                    const isApplying = applying === path.ruleId;
                                    
                                    return (
                                        <motion.div key={path.ruleId} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                            style={{
                                                background: card, border: `1px solid ${color}40`,
                                                borderRadius: 24, padding: 24,
                                                backdropFilter: 'blur(20px)',
                                                boxShadow: `0 20px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 40px ${color}10`,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 900, background: `${color}20`, color, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${color}30` }}>
                                                            {path.severity}
                                                        </span>
                                                        <code style={{ fontSize: 16, fontWeight: 800, color: text }}>{path.ruleId}</code>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: 15, color: isDark ? '#cbd5e1' : '#475569', lineHeight: 1.6, fontWeight:500 }}>{path.message}</p>
                                                </div>
                                                <div style={{ width: 48, height: 48, borderRadius: 16, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                                                    {path.severity === 'critical' ? '☣️' : '⚠️'}
                                                </div>
                                            </div>

                                            {/* Circuit Board Tool Chain */}
                                            <div style={{ padding: 20, borderRadius: 16, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, marginBottom: 24, display:'flex', alignItems:'center', gap:0, flexWrap:'wrap' }}>
                                                {path.viaTools.map((t, ti) => {
                                                    const m = TOOL_META[t] || { emoji: '🔌', color: '#64748b' };
                                                    return (
                                                        <Fragment key={t}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: card, borderRadius: 14, border: `1px solid ${border}`, boxShadow: inset }}>
                                                                <span style={{ fontSize: 20 }}>{m.emoji}</span>
                                                                <span style={{ fontSize: 13, fontWeight: 800, color: text }}>{t}</span>
                                                            </div>
                                                            {ti < path.viaTools.length - 1 && (
                                                                <div style={{ width: 40, height: 2, background: color, opacity: 0.6, margin: '0 4px' }} />
                                                            )}
                                                        </Fragment>
                                                    );
                                                })}
                                                <div style={{ width: 40, height: 2, background: color, opacity: 0.6, margin: '0 4px' }} />
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: `${color}15`, borderRadius: 14, border: `1px solid ${color}40` }}>
                                                    <span style={{ fontSize: 18 }}>🔥</span>
                                                    <span style={{ fontSize: 13, fontWeight: 800, color }}>Attack Path</span>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                onClick={() => applyFix(path.ruleId)} disabled={isApplying}
                                                style={{
                                                    width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                                                    background: isApplying ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : `linear-gradient(135deg, ${color}, ${color}dd)`,
                                                    color: isApplying ? sub : '#fff', transition: 'all 0.2s',
                                                    fontWeight: 800, fontSize: 15, cursor: isApplying ? 'wait' : 'pointer',
                                                    boxShadow: isApplying ? 'none' : `0 10px 30px ${color}40, inset 0 1px 0 rgba(255,255,255,0.3)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
                                                }}
                                            >
                                                {isApplying ? (
                                                    <><span style={{ width: 16, height: 16, border: `2px solid ${sub}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} /> Enforcing Policy...</>
                                                ) : (
                                                    <>🔧 Terminate Attack Path</>
                                                )}
                                            </motion.button>

                                        </motion.div>
                                    );
                                })}
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
