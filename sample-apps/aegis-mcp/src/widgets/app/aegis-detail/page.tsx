'use client';

export const dynamic = 'force-dynamic';

import { useTheme } from '@nitrostack/widgets';

type Capability = 'READ_PRIVATE_DATA' | 'READ_PUBLIC_DATA' | 'WRITE_DATA' | 'WRITE_PUBLIC' | 'SEND_EXTERNAL' | 'DELETE_DATA' | 'EXECUTE';

interface Tool { id: string; name: string; emoji: string; color: string; caps: Capability[]; }

const TOOL_REGISTRY: Tool[] = [
    { id:'gmail',      name:'Gmail',      emoji:'📧', color:'#ea4335', caps:['SEND_EXTERNAL','READ_PRIVATE_DATA'] },
    { id:'dropbox',    name:'Dropbox',    emoji:'📦', color:'#0061ff', caps:['READ_PRIVATE_DATA','WRITE_DATA','SEND_EXTERNAL'] },
    { id:'postgres',   name:'PostgreSQL', emoji:'🐘', color:'#336791', caps:['READ_PRIVATE_DATA','WRITE_DATA','DELETE_DATA'] },
    { id:'slack',      name:'Slack',      emoji:'💬', color:'#a855f7', caps:['WRITE_PUBLIC','SEND_EXTERNAL'] },
    { id:'filesystem', name:'Filesystem', emoji:'🗂️', color:'#f59e0b', caps:['READ_PRIVATE_DATA','WRITE_DATA','EXECUTE'] },
    { id:'calendar',   name:'Calendar',   emoji:'📅', color:'#10b981', caps:['READ_PRIVATE_DATA','WRITE_DATA'] },
];

interface PolicyRule { id: string; source: Capability; sink: Capability; severity: 'critical' | 'high'; color: string; icon: string; }

const POLICY_RULES: PolicyRule[] = [
    { id:'exfiltration', source:'READ_PRIVATE_DATA', sink:'SEND_EXTERNAL',  severity:'critical', color:'#ef4444', icon:'📤' },
    { id:'public-leak',  source:'READ_PRIVATE_DATA', sink:'WRITE_PUBLIC',   severity:'high',     color:'#f97316', icon:'📢' },
    { id:'destructive',  source:'DELETE_DATA',        sink:'EXECUTE',        severity:'high',     color:'#f97316', icon:'⚡' },
];

const CAP_META: Record<Capability, { icon:string; color:string; danger:boolean }> = {
    READ_PRIVATE_DATA: { icon:'👁️', color:'#ef4444', danger:true  },
    READ_PUBLIC_DATA:  { icon:'📖', color:'#10b981', danger:false  },
    WRITE_DATA:        { icon:'✏️', color:'#3b82f6', danger:false  },
    WRITE_PUBLIC:      { icon:'📢', color:'#eab308', danger:true   },
    SEND_EXTERNAL:     { icon:'📤', color:'#f97316', danger:true   },
    DELETE_DATA:       { icon:'🗑️', color:'#ef4444', danger:true   },
    EXECUTE:           { icon:'⚡', color:'#f97316', danger:true   },
};

function rulesThatFire(tool: Tool): PolicyRule[] {
    const caps = new Set(tool.caps);
    return POLICY_RULES.filter(r => caps.has(r.source) || caps.has(r.sink));
}

function overallRisk(tool: Tool): 'critical' | 'high' | 'safe' {
    const rules = rulesThatFire(tool);
    if (rules.some(r => r.severity === 'critical')) return 'critical';
    if (rules.length > 0) return 'high';
    return 'safe';
}

export default function ToolRegistry() {
    const theme  = useTheme();
    const isDark = theme === 'dark';

    const bg     = isDark ? '#060b14' : '#f0f4f8';
    const card   = isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.92)';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const text   = isDark ? '#f0f9ff' : '#0f172a';
    const sub    = isDark ? '#64748b' : '#94a3b8';
    const hr     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';

    return (
        <div style={{ background:bg, fontFamily:'Inter, system-ui, sans-serif', color:text, minHeight:'100vh' }}>
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
            `}</style>

            {/* Header */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg,rgba(9,14,28,0.98),rgba(22,18,60,0.98))'
                    : 'linear-gradient(135deg,rgba(239,246,255,0.99),rgba(240,253,244,0.99))',
                borderBottom:`1px solid ${border}`, backdropFilter:'blur(14px)', padding:'20px 20px',
                display:'flex', alignItems:'center', gap:12,
            }}>
                <div style={{
                    width:46, height:46, borderRadius:14, fontSize:22,
                    background:'rgba(245,158,11,0.12)', border:'1.5px solid rgba(245,158,11,0.3)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 0 20px rgba(245,158,11,0.2)',
                }}>
                    🗃️
                </div>
                <div>
                    <h2 style={{ margin:'0 0 3px', fontSize:16, fontWeight:800 }}>Tool Registry</h2>
                    <p style={{ margin:0, fontSize:12, color:sub }}>6 integrations · capability profiles · risk rules</p>
                </div>
                <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
                        {TOOL_REGISTRY.filter(t => overallRisk(t) === 'critical').length} critical
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:20, background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.3)', color:'#fb923c' }}>
                        {TOOL_REGISTRY.filter(t => overallRisk(t) === 'high').length} high
                    </span>
                </div>
            </div>

            <div style={{ padding:'20px 18px 36px', display:'flex', flexDirection:'column', gap:10 }}>
                {TOOL_REGISTRY.map((tool, i) => {
                    const risk       = overallRisk(tool);
                    const triggered  = rulesThatFire(tool);
                    const riskColor  = risk === 'critical' ? '#ef4444' : risk === 'high' ? '#f97316' : '#10b981';
                    return (
                        <div key={tool.id} style={{
                            background:card, border:`1.5px solid ${risk !== 'safe' ? `${riskColor}35` : border}`,
                            borderRadius:16, overflow:'hidden', backdropFilter:'blur(12px)',
                            animation:`fadeUp 0.38s ease ${i*0.07}s both`,
                            borderLeft: risk !== 'safe' ? `4px solid ${riskColor}` : `4px solid ${border}`,
                        }}>
                            {/* Tool header */}
                            <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
                                <div style={{
                                    width:48, height:48, borderRadius:14, flexShrink:0,
                                    background:`${tool.color}12`, border:`1.5px solid ${tool.color}30`,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:24, boxShadow:`0 0 18px ${tool.color}18`,
                                }}>
                                    {tool.emoji}
                                </div>
                                <div style={{ flex:1 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                                        <span style={{ fontSize:15, fontWeight:800, color: isDark ? '#e2e8f0' : '#1e293b' }}>{tool.name}</span>
                                        <code style={{ fontSize:11, color:sub, fontFamily:'monospace' }}>{tool.id}</code>
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                        <span style={{ width:6, height:6, borderRadius:'50%', background:tool.color, boxShadow:`0 0 5px ${tool.color}`, display:'inline-block' }} />
                                        <span style={{ fontSize:11, color:sub }}>{tool.caps.length} capabilities</span>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize:10, fontWeight:800, padding:'4px 11px', borderRadius:20,
                                    textTransform:'uppercase', letterSpacing:0.7,
                                    background:`${riskColor}15`, border:`1.5px solid ${riskColor}45`,
                                    color:riskColor,
                                    ...(risk !== 'safe' ? { animation:'pulse 2.5s ease infinite' } : {}),
                                }}>
                                    {risk}
                                </span>
                            </div>

                            {/* Capabilities */}
                            <div style={{ padding:'0 18px 14px' }}>
                                <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.1, color:sub }}>
                                    Grants
                                </p>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom: triggered.length > 0 ? 14 : 0 }}>
                                    {tool.caps.map(cap => {
                                        const m = CAP_META[cap];
                                        return (
                                            <span key={cap} style={{
                                                fontSize:11, fontWeight:700, padding:'5px 11px', borderRadius:20,
                                                background:`${m.color}${m.danger ? '14' : '09'}`,
                                                border:`1.5px solid ${m.color}${m.danger ? '45' : '28'}`,
                                                color:m.color, display:'inline-flex', alignItems:'center', gap:5,
                                                ...(m.danger ? { animation:'pulse 3s ease infinite' } : {}),
                                            }}>
                                                {m.icon}{' '}{cap.replace(/_/g,' ')}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Triggered rules */}
                                {triggered.length > 0 && (
                                    <>
                                        <div style={{ height:1, background:hr, marginBottom:12 }} />
                                        <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.1, color:sub }}>
                                            Triggers if connected with…
                                        </p>
                                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                                            {triggered.map(rule => (
                                                <div key={rule.id} style={{
                                                    display:'flex', alignItems:'center', gap:8, padding:'7px 11px',
                                                    borderRadius:9, background:`${rule.color}09`, border:`1px solid ${rule.color}30`,
                                                }}>
                                                    <span style={{ fontSize:14 }}>{rule.icon}</span>
                                                    <span style={{ fontSize:11, fontWeight:700, color:rule.color }}>{rule.id}</span>
                                                    <span style={{ fontSize:11, color:sub, flex:1 }}>
                                                        <code style={{ fontSize:10 }}>{rule.source}</code>
                                                        <span style={{ color:rule.color, margin:'0 4px' }}>→</span>
                                                        <code style={{ fontSize:10 }}>{rule.sink}</code>
                                                    </span>
                                                    <span style={{
                                                        fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:20,
                                                        background:`${rule.color}18`, border:`1px solid ${rule.color}40`,
                                                        color:rule.color, textTransform:'uppercase', letterSpacing:0.5,
                                                    }}>
                                                        {rule.severity}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={{ borderTop:`1px solid ${border}`, padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', background: isDark ? 'rgba(6,11,20,0.9)' : 'rgba(240,244,248,0.9)', backdropFilter:'blur(8px)' }}>
                <span style={{ fontSize:11, color:sub }}>🔒 Aegis Tool Registry · Static capability model</span>
                <span style={{ fontSize:11, fontWeight:600, color:sub }}>
                    {POLICY_RULES.length} policy rules · {TOOL_REGISTRY.length} integrations
                </span>
            </div>
        </div>
    );
}
