'use client';

import { useState } from 'react';

const WIDGETS = [
  {
    route: '/global-threat-feed',
    title: 'Global Threat Feed',
    icon: '📡',
    badge: 'SENTINEL',
    badgeColor: '#dc2626',
    description: 'Real-time supply chain threat monitoring — weather, port strikes, congestion, geopolitical events.',
    features: ['5 live threats', 'Severity filters', 'Confidence scores', 'Affected routes'],
    tool: 'scan_risk_feeds',
    toolDesc: 'Call with: { severity: "high", limit: 5 }',
    gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    accentLight: '#818cf8',
    accentDark: '#4f46e5',
  },
  {
    route: '/impact-radar',
    title: 'Impact Radar',
    icon: '🎯',
    badge: 'IMPACT',
    badgeColor: '#ea580c',
    description: 'Financial exposure & SLA breach risk analysis across all in-transit shipments.',
    features: ['$240k exposure', '3 shipments at risk', 'SLA risk meter', 'SKU breakdown'],
    tool: 'analyze_supply_chain_impact',
    toolDesc: 'Call with: { threatId: "threat-001" }',
    gradient: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)',
    accentLight: '#fb923c',
    accentDark: '#ea580c',
  },
  {
    route: '/reroute-comparator',
    title: 'Reroute Comparator',
    icon: '🔀',
    badge: 'BROKERAGE',
    badgeColor: '#16a34a',
    description: 'Ranked contingency logistics options with live carrier rates, reliability scores and cost analysis.',
    features: ['3 carrier options', 'Cost vs delay tradeoff', 'Reliability bars', 'Route details'],
    tool: 'generate_reroute_options',
    toolDesc: 'Call with: { shipmentId: "ship-001", threatId: "threat-001" }',
    gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
    accentLight: '#4ade80',
    accentDark: '#16a34a',
  },
  {
    route: '/stakeholder-comms',
    title: 'Stakeholder Comms',
    icon: '📬',
    badge: 'NOTIFY',
    badgeColor: '#0284c7',
    description: 'Auto-composed email notifications and ERP sync payloads for every affected stakeholder.',
    features: ['3 emails sent', '2 ERP syncs', 'Full body preview', 'SLA alerts'],
    tool: 'compose_stakeholder_update',
    toolDesc: 'Call with: { threatId: "threat-001", shipmentId: "ship-001", recipientEmail: "ops@company.com" }',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
    accentLight: '#38bdf8',
    accentDark: '#0284c7',
  },
];

const FLOW_STEPS = [
  { n: '1', label: 'Sentinel detects threat', sub: 'OpenWeather + NewsAPI + mock feeds', color: '#818cf8' },
  { n: '2', label: 'Impact is calculated', sub: 'Exposure, delay, SLA risk per shipment', color: '#fb923c' },
  { n: '3', label: 'Reroutes are generated', sub: 'Live carrier rates, ranked by cost-efficiency', color: '#4ade80' },
  { n: '4', label: 'Stakeholders notified', sub: 'Email + ERP sync fired automatically', color: '#38bdf8' },
];

const DEMO_IDS = [
  { label: 'Threats', items: ['threat-001 — Typhoon Shanghai (HIGH)', 'threat-002 — Rotterdam Strike (MEDIUM)', 'threat-003 — Singapore Congestion (MEDIUM)', 'threat-004 — Suez Closure (CRITICAL)', 'threat-005 — Evergreen Grounding (HIGH)'] },
  { label: 'Shipments', items: ['ship-001 — Shanghai → Rotterdam (sea, Maersk)', 'ship-002 — Shanghai → Los Angeles (sea, Evergreen)', 'ship-003 — Singapore → Rotterdam (sea, CMA CGM)', 'ship-004 — Shanghai → Frankfurt (air, Lufthansa)'] },
];

export default function DemoHome() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#f1f5f9', overflowY: 'auto' }}>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0f1a10 100%)', borderBottom: '1px solid #1e1e2e', padding: '48px 32px 40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '6px 14px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.1em' }}>
              HACKATHON DEMO · NitroStack MCP
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80' }}>LIVE</span>
            </div>
          </div>

          <h1 style={{ margin: '0 0 12px', fontSize: '36px', fontWeight: 800, lineHeight: 1.15, background: 'linear-gradient(135deg, #f1f5f9 0%, #a5b4fc 50%, #4ade80 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Supply Chain<br />Disruption Intelligence
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, maxWidth: '600px' }}>
            An AI-powered MCP server that detects global supply chain threats, calculates financial impact, generates reroute options, and notifies stakeholders — all through 4 composable AI tools.
          </p>

          {/* Server status */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { label: 'MCP Server', url: 'localhost:3000/mcp', color: '#4ade80' },
              { label: 'Widget UI', url: 'localhost:3002', color: '#38bdf8' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
                <span style={{ color: '#94a3b8' }}>{s.label}</span>
                <span style={{ color: s.color, fontWeight: 600, fontFamily: 'monospace' }}>{s.url}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 32px 48px' }}>

        {/* ── Agent pipeline flow ── */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            4-Agent Pipeline
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px' }}>
            {FLOW_STEPS.map((step, i) => (
              <div key={step.n} style={{ position: 'relative' }}>
                <div style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: i === 0 ? '10px 0 0 10px' : i === 3 ? '0 10px 10px 0' : '0', padding: '14px 16px', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: step.color + '22', border: `1.5px solid ${step.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: step.color, marginBottom: '8px' }}>{step.n}</div>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>{step.label}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{step.sub}</p>
                </div>
                {i < 3 && (
                  <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: '#334155', fontSize: '16px', fontWeight: 700 }}>›</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Widget cards ── */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Live Widgets — click to open
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {WIDGETS.map(w => (
              <a key={w.route} href={w.route} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = w.accentDark; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e2e'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                  {/* Card gradient header */}
                  <div style={{ background: w.gradient, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{w.icon}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>{w.title}</p>
                        <span style={{ padding: '2px 8px', background: w.badgeColor + '33', border: `1px solid ${w.badgeColor}55`, borderRadius: '4px', fontSize: '9px', fontWeight: 800, color: w.accentLight, letterSpacing: '0.08em' }}>{w.badge}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>↗</span>
                  </div>
                  {/* Card body */}
                  <div style={{ padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{w.description}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {w.features.map(f => (
                        <span key={f} style={{ padding: '2px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: '4px', fontSize: '10px', color: '#64748b', fontWeight: 500 }}>{f}</span>
                      ))}
                    </div>
                    {/* MCP tool hint */}
                    <div style={{ padding: '6px 10px', background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: '6px', fontFamily: 'monospace' }}>
                      <div style={{ fontSize: '9px', color: '#475569', marginBottom: '2px', fontFamily: 'system-ui' }}>MCP TOOL</div>
                      <div style={{ fontSize: '10px', color: w.accentLight, wordBreak: 'break-all' }}>{w.toolDesc}</div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Demo IDs ── */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Demo Data IDs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {DEMO_IDS.map(group => (
              <div key={group.label} style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '14px 16px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group.label}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {group.items.map(item => {
                    const id = item.split(' — ')[0];
                    return (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: '#0a0a14', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={() => copy(id, item)}>
                        <code style={{ fontSize: '11px', color: '#a5b4fc', fontFamily: 'monospace', flexShrink: 0 }}>{id}</code>
                        <span style={{ fontSize: '11px', color: '#475569', flex: 1 }}>{item.split(' — ')[1]}</span>
                        <span style={{ fontSize: '10px', color: copied === item ? '#4ade80' : '#334155', flexShrink: 0 }}>{copied === item ? '✓' : 'copy'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Hackathon test script ── */}
        <section>
          <h2 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            End-to-End Test
          </h2>
          <div style={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: '10px', padding: '16px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>
              Run this in a terminal to fire all 4 MCP tools and see live JSON responses:
            </p>
            <div style={{ position: 'relative' }}>
              <pre style={{ margin: 0, padding: '12px 14px', background: '#0a0a14', borderRadius: '8px', fontSize: '12px', color: '#4ade80', fontFamily: 'monospace', border: '1px solid #1e1e2e' }}>
                node test-mcp.js
              </pre>
              <button
                onClick={() => copy('node test-mcp.js', 'test')}
                style={{ position: 'absolute', top: '8px', right: '10px', padding: '3px 10px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: '5px', fontSize: '10px', color: copied === 'test' ? '#4ade80' : '#64748b', cursor: 'pointer', fontFamily: 'system-ui' }}>
                {copied === 'test' ? '✓ copied' : 'copy'}
              </button>
            </div>
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { label: 'scan_risk_feeds', color: '#818cf8' },
                { label: 'analyze_supply_chain_impact', color: '#fb923c' },
                { label: 'generate_reroute_options', color: '#4ade80' },
                { label: 'compose_stakeholder_update', color: '#38bdf8' },
              ].map(t => (
                <div key={t.label} style={{ padding: '6px 8px', background: '#0a0a14', border: `1px solid ${t.color}33`, borderRadius: '6px', fontSize: '10px', color: t.color, fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #1e1e2e', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#334155' }}>NitroStack Supply Chain Intelligence · MCP Server v1.0</span>
        <span style={{ fontSize: '11px', color: '#334155' }}>Built with @nitrostack/core · NitroStack MCP Framework</span>
      </div>
    </div>
  );
}
