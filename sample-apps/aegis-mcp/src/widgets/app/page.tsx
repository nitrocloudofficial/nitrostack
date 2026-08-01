'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const ACTIONS = [
    {
        icon: '🔌', name: 'connect_tool', badge: 'Gateway', color: '#3b82f6',
        desc: "Attach an integration to an agent, granting its full capability set.",
        prompt: 'Connect dropbox to support-agent',
        integrations: ['gmail', 'dropbox', 'postgres', 'slack', 'filesystem', 'calendar'],
    },
    {
        icon: '🗺️', name: 'get_capability_graph', badge: 'Visualise', color: '#8b5cf6',
        desc: 'Render the full agent → tool → capability graph. Dangerous edges glow red.',
        prompt: 'Show the capability graph for support-agent',
        integrations: [],
    },
    {
        icon: '🚨', name: 'detect_attack_paths', badge: 'Detect', color: '#ef4444',
        desc: 'Run the deterministic toxic-combination detector. Zero LLM tokens spent.',
        prompt: 'Detect attack paths on support-agent',
        integrations: [],
    },
    {
        icon: '🔧', name: 'apply_policy_fix', badge: 'Remediate', color: '#10b981',
        desc: 'Disconnect the risky tool and clear the rule. Returns refreshed graph.',
        prompt: 'Fix the exfiltration path on support-agent',
        integrations: [],
    },
];

const RULES = [
    { id: 'exfiltration', src: 'READ_PRIVATE_DATA', sink: 'SEND_EXTERNAL', sev: 'critical', color: '#ef4444', icon: '📤', weight: 1.0 },
    { id: 'public-leak', src: 'READ_PRIVATE_DATA', sink: 'WRITE_PUBLIC', sev: 'high', color: '#f97316', icon: '📢', weight: 0.6 },
    { id: 'destructive', src: 'DELETE_DATA', sink: 'EXECUTE', sev: 'high', color: '#f97316', icon: '⚡', weight: 0.6 },
];

const CAP_DANGER = new Set(['READ_PRIVATE_DATA', 'SEND_EXTERNAL', 'WRITE_PUBLIC', 'DELETE_DATA', 'EXECUTE']);

const INTEGRATIONS = [
    { name: 'Gmail', emoji: '📧', color: '#ea4335', caps: ['SEND_EXTERNAL', 'READ_PRIVATE_DATA'] },
    { name: 'Dropbox', emoji: '📦', color: '#0061ff', caps: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'SEND_EXTERNAL'] },
    { name: 'PostgreSQL', emoji: '🐘', color: '#336791', caps: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'DELETE_DATA'] },
    { name: 'Slack', emoji: '💬', color: '#a855f7', caps: ['WRITE_PUBLIC', 'SEND_EXTERNAL'] },
    { name: 'Filesystem', emoji: '🗂️', color: '#f59e0b', caps: ['READ_PRIVATE_DATA', 'WRITE_DATA', 'EXECUTE'] },
    { name: 'Calendar', emoji: '📅', color: '#10b981', caps: ['READ_PRIVATE_DATA', 'WRITE_DATA'] },
];

const CAP_COLOR: Record<string, string> = {
    READ_PRIVATE_DATA: '#ef4444', SEND_EXTERNAL: '#f97316', WRITE_PUBLIC: '#eab308',
    DELETE_DATA: '#ef4444', EXECUTE: '#f97316', WRITE_DATA: '#3b82f6', READ_PUBLIC_DATA: '#10b981',
};

// --- Animations ---
const containerVar = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};
const itemVar = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 120 } }
};

export default function AegisDashboard() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const { sendFollowUpMessage } = useWidgetSDK();
    const [notice, setNotice] = useState<string | null>(null);

    const runAction = (prompt: string) => {
        sendFollowUpMessage(prompt).catch(() => {
            setNotice('This action needs a connected host — open this project in NitroStack Studio or a chat client to run it live.');
            setTimeout(() => setNotice(null), 4000);
        });
    };

    const bg     = isDark ? '#020617' : '#f8fafc'; // Ultra deep dark
    const card   = isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.7)';
    const cardHov= isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.95)';
    const border = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.1)';
    const borderH= isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.2)';
    const text   = isDark ? '#f8fafc' : '#0f172a';
    const sub    = isDark ? '#94a3b8' : '#64748b';
    const insetShadow = isDark 
        ? 'inset 0 1px 0 rgba(255,255,255,0.06)' 
        : 'inset 0 1px 0 rgba(255,255,255,1)';

    return (
        <div style={{ background: bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: text, overflow: 'hidden', position: 'relative' }}>
            
            {/* Animated Ambient Mesh Background */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                {isDark ? (
                    <>
                        <motion.div animate={{ scale:[1, 1.2, 1], opacity:[0.15, 0.25, 0.15], rotate:[0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            style={{ position:'absolute', width:'50vw', height:'50vw', top:'-10%', left:'-10%', background:'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', filter:'blur(80px)' }} />
                        <motion.div animate={{ scale:[1.2, 1, 1.2], opacity:[0.1, 0.2, 0.1], rotate:[0, -90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                            style={{ position:'absolute', width:'40vw', height:'40vw', bottom:'-10%', right:'-10%', background:'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', filter:'blur(60px)' }} />
                        <motion.div animate={{ opacity:[0.05, 0.15, 0.05] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ position:'absolute', width:'30vw', height:'30vw', top:'40%', left:'50%', transform:'translate(-50%, -50%)', background:'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 60%)', filter:'blur(90px)' }} />
                    </>
                ) : (
                    <>
                        <div style={{ position:'absolute', width:'100%', height:'40vh', top:0, background:'linear-gradient(180deg, #e0e7ff 0%, transparent 100%)', opacity:0.6 }} />
                        <div style={{ position:'absolute', width:'60vw', height:'60vw', top:'-20%', right:'-20%', background:'radial-gradient(circle, rgba(147,197,253,0.3) 0%, transparent 70%)', filter:'blur(60px)' }} />
                    </>
                )}
            </div>

            {/* Host-connection notice (shown when a chat action fires with no embedding host) */}
            <AnimatePresence>
                {notice && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={{
                            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
                            maxWidth: 420, padding: '12px 18px', borderRadius: 12,
                            background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)',
                            border: `1px solid ${border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                            color: text, fontSize: 13, fontWeight: 500, textAlign: 'center',
                        }}
                    >
                        {notice}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scrollable Content (z-index above bg) */}
            <div style={{ position: 'relative', zIndex: 1, paddingBottom: 60 }}>
                
                {/* ── Hero ──────────────────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{ paddingTop: 60, paddingBottom: 50, textAlign: 'center', borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(2,6,23,0.4)' : 'rgba(255,255,255,0.4)', backdropFilter: 'blur(20px)' }}
                >
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }} transition={{ duration: 0.5 }}
                        style={{
                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                            width: 80, height: 80, borderRadius: 24, marginBottom: 24,
                            background: isDark ? 'rgba(59,130,246,0.15)' : '#fff',
                            border: `1px solid rgba(59,130,246,0.5)`,
                            fontSize: 38,
                            boxShadow: isDark ? '0 0 40px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 10px 30px rgba(59,130,246,0.2)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <motion.span animate={{ scale:[1, 1.1, 1] }} transition={{ duration:2, repeat:Infinity }}>🛡️</motion.span>
                    </motion.div>

                    <h1 style={{
                        margin:'0 0 12px', fontSize: 48, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1,
                        background: isDark ? 'linear-gradient(to right bottom, #ffffff 30%, #94a3b8 100%)' : 'linear-gradient(to right bottom, #0f172a 30%, #475569 100%)',
                        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                    }}>
                        Aegis
                    </h1>
                    <p style={{ margin:'0 auto 8px', fontSize: 18, fontWeight: 500, color: text, maxWidth: 500, letterSpacing: '-0.01em' }}>
                        Enterprise Blast-Radius Auditor
                    </p>
                    <p style={{ margin:'0 auto', fontSize: 14, color: sub, maxWidth: 480, lineHeight: 1.6 }}>
                        Zero-token deterministic security engine tracking toxic capability intersections across active tool integrations in real-time.
                    </p>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:32, flexWrap:'wrap' }}>
                        {[ { dot:'#10b981', l:'Engine Live' }, { dot:'#3b82f6', l:'3 Policies' }, { dot:'#8b5cf6', l:'6 Integrations' } ].map((p, i) => (
                            <motion.div key={p.l} initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay: 0.3 + (i*0.1) }}
                                style={{
                                    display:'inline-flex', alignItems:'center', gap:8,
                                    padding:'6px 14px', borderRadius: 20,
                                    background: card, border:`1px solid ${border}`, 
                                    fontSize:13, fontWeight:600, color:text,
                                    backdropFilter:'blur(10px)', boxShadow: insetShadow,
                                }}
                            >
                                <span style={{ width:6, height:6, borderRadius:'50%', background:p.dot, display:'inline-block', boxShadow:`0 0 8px ${p.dot}` }} />
                                {p.l}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Main Layout ────────────────────────────────────────── */}
                <motion.div variants={containerVar} initial="hidden" animate="show" style={{ maxWidth: 840, margin: '0 auto', padding: '40px 20px', display:'flex', flexDirection:'column', gap:48 }}>

                    {/* Section: Quick Actions */}
                    <section>
                        <motion.div variants={itemVar} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                            <h2 style={{ margin:0, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:sub }}>Actions</h2>
                            <div style={{ flex:1, height:1, background:border }} />
                        </motion.div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:16 }}>
                            {ACTIONS.map(a => (
                                <motion.div key={a.name} variants={itemVar} whileHover={{ y: -4, borderColor: borderH, boxShadow: `0 20px 40px rgba(0,0,0,0.2), ${insetShadow}` }} transition={{ type:'spring', damping:25, stiffness:200 }}
                                    style={{
                                        background: card, border: `1px solid ${border}`,
                                        borderRadius: 20, padding: 24,
                                        backdropFilter: 'blur(20px)', boxShadow: insetShadow,
                                        display: 'flex', flexDirection: 'column', height: '100%',
                                    }}
                                >
                                    <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                                            background: `${a.color}15`, border: `1px solid ${a.color}30`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 22, boxShadow: `0 0 20px ${a.color}15`,
                                        }}>
                                            {a.icon}
                                        </div>
                                        <div style={{ flex:1 }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                                                <code style={{ fontSize:13, fontWeight:700, color: isDark ? a.color : '#0f172a' }}>{a.name}</code>
                                                <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:20, background:`${a.color}15`, color:a.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                                                    {a.badge}
                                                </span>
                                            </div>
                                            <p style={{ margin:0, fontSize:13, color:sub, lineHeight:1.6 }}>{a.desc}</p>
                                        </div>
                                    </div>
                                    <div style={{ marginTop:'auto', paddingTop:16 }}>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            onClick={() => runAction(a.prompt)}
                                            style={{
                                                width:'100%', padding:'12px 16px', border:'none', borderRadius:12,
                                                background: `linear-gradient(135deg, ${a.color}, ${a.color}dd)`,
                                                color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer',
                                                boxShadow: `0 8px 20px ${a.color}30, inset 0 1px 0 rgba(255,255,255,0.3)`,
                                                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                                            }}
                                        >
                                            <span style={{ opacity:0.8 }}>▶</span> Execute Sequence
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Section: Policy Rules */}
                    <section>
                        <motion.div variants={itemVar} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                            <h2 style={{ margin:0, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:sub }}>Active Policies</h2>
                            <div style={{ flex:1, height:1, background:border }} />
                        </motion.div>
                        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            {RULES.map(r => (
                                <motion.div key={r.id} variants={itemVar} whileHover={{ x: 4, background: cardHov }}
                                    style={{
                                        background: card, border: `1px solid ${border}`,
                                        borderRadius: 16, padding: '16px 20px',
                                        display: 'flex', alignItems: 'center', gap: 16,
                                        backdropFilter: 'blur(20px)', boxShadow: insetShadow,
                                        borderLeft: `4px solid ${r.color}`,
                                    }}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                        background: `${r.color}15`, border: `1px solid ${r.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, boxShadow: `0 0 20px ${r.color}15`,
                                    }}>
                                        {r.icon}
                                    </div>
                                    <div style={{ flex:1, minWidth:0, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', justifyContent:'space-between' }}>
                                        <div>
                                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                                                <span style={{ fontSize:14, fontWeight:700, color:text }}>{r.id}</span>
                                                <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20, background:`${r.color}15`, border:`1px solid ${r.color}30`, color:r.color, textTransform:'uppercase' }}>
                                                    {r.sev}
                                                </span>
                                            </div>
                                            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                                                <code style={{ fontSize:11, color:text, background: isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)', padding:'3px 8px', borderRadius:6, border:`1px solid ${border}` }}>{r.src}</code>
                                                <span style={{ color:r.color, fontSize:14, fontWeight:700, opacity:0.7 }}>→</span>
                                                <code style={{ fontSize:11, color:text, background: isDark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.05)', padding:'3px 8px', borderRadius:6, border:`1px solid ${border}` }}>{r.sink}</code>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* Section: Tool Registry */}
                    <section>
                        <motion.div variants={itemVar} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                            <h2 style={{ margin:0, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:sub }}>Integration Topology</h2>
                            <div style={{ flex:1, height:1, background:border }} />
                        </motion.div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
                            {INTEGRATIONS.map(int => (
                                <motion.div key={int.name} variants={itemVar} whileHover={{ scale: 1.02 }}
                                    style={{
                                        background: card, border: `1px solid ${border}`,
                                        borderRadius: 16, padding: '16px',
                                        backdropFilter: 'blur(20px)', boxShadow: insetShadow,
                                    }}
                                >
                                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                            background: `${int.color}15`, border: `1px solid ${int.color}30`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                        }}>
                                            {int.emoji}
                                        </div>
                                        <div>
                                            <div style={{ fontSize:14, fontWeight:700, color: text }}>{int.name}</div>
                                            <div style={{ fontSize:11, color:sub, marginTop:2, fontWeight:500 }}>{int.caps.length} caps</div>
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                        {int.caps.map(cap => {
                                            const c = CAP_COLOR[cap] || '#64748b';
                                            const drawAttn = CAP_DANGER.has(cap);
                                            return (
                                                <span key={cap} style={{
                                                    fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600,
                                                    background: drawAttn ? `${c}1A` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                    border:`1px solid ${drawAttn ? `${c}40` : border}`,
                                                    color: drawAttn ? c : sub,
                                                }}>
                                                    {cap.replace(/_/g, ' ')}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </motion.div>
            </div>
        </div>
    );
}
