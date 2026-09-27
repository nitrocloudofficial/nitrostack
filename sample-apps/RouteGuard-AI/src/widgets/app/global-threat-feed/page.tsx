'use client';

import { useTheme, useWidgetState, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { AlertTriangle, MapPin, Clock, TrendingUp, Shield, Radio, ChevronDown, ChevronUp, Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Threat {
  id: string; type: string; severity: string; title: string; description: string;
  location: { lat: number; lng: number; region?: string; port?: string };
  affectedRoutes?: string[]; estimatedImpactStart: string; estimatedImpactEnd?: string;
  source: string; confidence: number; detectedAt: string; tags?: string[];
}
interface WidgetData {
  threats: Threat[]; totalThreats: number;
  summary: { critical: number; high: number; medium: number; low: number };
  lastUpdated: string;
}

// ── Demo data (shown when opened directly in browser) ─────────────────────────
// Fixed ISO strings — no Date.now() at module level so SSR and client always agree.
const DEMO: WidgetData = {
  totalThreats: 5, lastUpdated: '2026-08-01T00:00:00.000Z',
  summary: { critical: 1, high: 2, medium: 2, low: 0 },
  threats: [
    { id: 'threat-004', type: 'geopolitical', severity: 'critical', title: 'Suez Canal Closure — Geopolitical Escalation',
      description: 'Military conflict in Red Sea region. Suez Canal Authority has suspended transits. Rerouting via Cape of Good Hope adds 10–14 days.',
      location: { lat: 29.96, lng: 32.58, region: 'Middle East', port: 'Suez' },
      affectedRoutes: ['Europe-Asia', 'Europe-Middle East', 'Europe-Africa'],
      estimatedImpactStart: '2026-08-01T00:00:00.000Z',
      estimatedImpactEnd: '2026-08-31T00:00:00.000Z',
      source: 'news_feed', confidence: 0.99, detectedAt: '2026-08-01T00:00:00.000Z',
      tags: ['geopolitical', 'critical', 'suez-canal'] },
    { id: 'threat-001', type: 'weather', severity: 'high', title: 'Typhoon Approaching Port of Shanghai',
      description: 'Category 4 typhoon expected to hit Shanghai port in 48 hours. Port authority has issued closure notice.',
      location: { lat: 31.4, lng: 121.5, region: 'East China Sea', port: 'Shanghai' },
      affectedRoutes: ['Shanghai-Rotterdam', 'Shanghai-Los Angeles', 'Shanghai-Singapore'],
      estimatedImpactStart: '2026-08-01T02:00:00.000Z',
      estimatedImpactEnd: '2026-08-04T00:00:00.000Z',
      source: 'weather_api', confidence: 0.95, detectedAt: '2026-08-01T00:00:00.000Z',
      tags: ['weather', 'port-closure', 'asia-pacific'] },
    { id: 'threat-005', type: 'carrier_failure', severity: 'high', title: 'Evergreen Marine Fleet Grounding',
      description: 'Major container ship grounded in Strait of Malacca. 20,000 TEU capacity offline. Evergreen suspending bookings for 2 weeks.',
      location: { lat: 2.5, lng: 102.0, region: 'Southeast Asia', port: 'Malacca Strait' },
      affectedRoutes: ['China-Europe', 'China-US', 'Asia-Europe'],
      estimatedImpactStart: '2026-08-01T00:00:00.000Z',
      estimatedImpactEnd: '2026-08-15T00:00:00.000Z',
      source: 'maritime_news', confidence: 0.97, detectedAt: '2026-08-01T00:00:00.000Z',
      tags: ['carrier-failure', 'capacity', 'asia-pacific'] },
    { id: 'threat-002', type: 'port_strike', severity: 'medium', title: 'Port of Rotterdam Labor Strike',
      description: "Dock workers union announced 5-day strike starting tomorrow. Cargo handling will be severely limited.",
      location: { lat: 51.95, lng: 4.1, region: 'Europe', port: 'Rotterdam' },
      affectedRoutes: ['Asia-Rotterdam', 'US-Rotterdam', 'Africa-Rotterdam'],
      estimatedImpactStart: '2026-08-02T00:00:00.000Z',
      estimatedImpactEnd: '2026-08-06T00:00:00.000Z',
      source: 'port_authority', confidence: 0.88, detectedAt: '2026-08-01T00:00:00.000Z',
      tags: ['labor', 'port-strike', 'europe'] },
    { id: 'threat-003', type: 'maritime_congestion', severity: 'medium', title: 'Severe Congestion at Port of Singapore',
      description: 'Unexpected surge in container volume. Average wait time for berth: 8 days. Spot rates up 40%.',
      location: { lat: 1.35, lng: 103.82, region: 'Southeast Asia', port: 'Singapore' },
      affectedRoutes: ['China-Singapore', 'Singapore-Europe', 'Singapore-US'],
      estimatedImpactStart: '2026-08-01T00:00:00.000Z',
      estimatedImpactEnd: '2026-08-15T00:00:00.000Z',
      source: 'port_authority', confidence: 0.92, detectedAt: '2026-08-01T00:00:00.000Z',
      tags: ['congestion', 'capacity', 'asia-pacific'] },
  ],
};

// ── Severity palette ───────────────────────────────────────────────────────────
const SEV = {
  light: {
    critical: { bg: '#fff1f2', text: '#9f1239', border: '#fda4af', dot: '#e11d48', badge: '#ffe4e6' },
    high:     { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', dot: '#d97706', badge: '#fef3c7' },
    medium:   { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', dot: '#2563eb', badge: '#dbeafe' },
    low:      { bg: '#f0fdf4', text: '#166534', border: '#86efac', dot: '#16a34a', badge: '#dcfce7' },
  },
  dark: {
    critical: { bg: '#4c0519', text: '#fda4af', border: '#9f1239', dot: '#fb7185', badge: '#3f0212' },
    high:     { bg: '#451a03', text: '#fcd34d', border: '#b45309', dot: '#fbbf24', badge: '#3c1a00' },
    medium:   { bg: '#1e1b4b', text: '#a5b4fc', border: '#4338ca', dot: '#818cf8', badge: '#1e1b4b' },
    low:      { bg: '#052e16', text: '#86efac', border: '#166534', dot: '#4ade80', badge: '#052e16' },
  },
};

const TYPE_ICONS: Record<string, string> = {
  weather: '🌪️', port_strike: '✊', maritime_congestion: '⚓',
  geopolitical: '🌐', carrier_failure: '🚢', customs_delay: '🛃', equipment_shortage: '🔧',
};

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '30px' }}>{Math.round(value * 100)}%</span>
    </div>
  );
}

function ImpactWindow({ start, end }: { start: string; end?: string }) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const durationMs = e ? e.getTime() - s.getTime() : 0;
  const days = Math.round(durationMs / 86400_000);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
      <Clock size={12} />
      <span suppressHydrationWarning>{s.toLocaleDateString()} {e ? `→ ${e.toLocaleDateString()}` : ''}</span>
      {days > 0 && <span style={{ fontWeight: 700 }}>({days}d)</span>}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function GlobalThreatFeedWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const isDark = theme === 'dark';
  const { isReady, getToolOutput } = useWidgetSDK();
  const raw = getToolOutput<WidgetData>();
  const data: WidgetData = (isReady && raw) ? raw : DEMO;

  const [state, setState] = useWidgetState<{
    selected: string | null; filter: string | null;
  }>(() => ({ selected: null, filter: null }));

  const pal = isDark ? SEV.dark : SEV.light;
  const bg      = isDark ? '#0d0d0f' : '#f8fafc';
  const surface = isDark ? '#17171a' : '#ffffff';
  const surfaceHover = isDark ? '#1e1e23' : '#f9fafb';
  const border  = isDark ? '#2a2a30' : '#e2e8f0';
  const textPri = isDark ? '#f1f5f9' : '#0f172a';
  const textSec = isDark ? '#94a3b8' : '#64748b';
  const textMid = isDark ? '#cbd5e1' : '#475569';
  const isDemo  = !(isReady && raw);

  const filtered = state?.filter
    ? data.threats.filter(t => t.severity === state.filter)
    : data.threats;

  return (
    <div style={{ background: bg, height: maxHeight || '640px', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? '#1e1b4b' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={18} style={{ color: isDark ? '#818cf8' : '#4f46e5' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: textPri }}>Global Threat Feed</h1>
              <p style={{ margin: 0, fontSize: '11px', color: textSec }}>
                {data.totalThreats} active threats · Updated <span suppressHydrationWarning>{new Date(data.lastUpdated).toLocaleTimeString()}</span>
                {isDemo && <span style={{ marginLeft: '6px', padding: '1px 6px', background: isDark ? '#1e3a8a' : '#dbeafe', color: isDark ? '#93c5fd' : '#1e40af', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>DEMO</span>}
              </p>
            </div>
          </div>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: isDark ? '#052e16' : '#f0fdf4', border: `1px solid ${isDark ? '#166534' : '#86efac'}`, borderRadius: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#4ade80' : '#16a34a' }}>LIVE</span>
          </div>
        </div>

        {/* Severity filter pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: null, label: 'All', count: data.totalThreats },
            { key: 'critical', label: 'Critical', count: data.summary.critical },
            { key: 'high', label: 'High', count: data.summary.high },
            { key: 'medium', label: 'Medium', count: data.summary.medium },
            { key: 'low', label: 'Low', count: data.summary.low },
          ].map(({ key, label, count }) => {
            const active = state?.filter === key;
            const p = key ? pal[key as keyof typeof pal] : null;
            return (
              <button key={String(key)} onClick={() => setState({ ...state, filter: key, selected: null })}
                style={{ padding: '4px 10px', borderRadius: '20px', border: `1.5px solid ${active && p ? p.border : border}`,
                  background: active && p ? p.badge : (isDark ? '#1e1e23' : '#f1f5f9'),
                  color: active && p ? p.text : textSec, fontSize: '12px', fontWeight: active ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {key && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p?.dot, display: 'inline-block' }} />}
                {label} <span style={{ fontWeight: 700 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Threat list ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: textSec }}>
            <Shield size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No {state?.filter} severity threats detected</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(threat => {
              const p = pal[threat.severity as keyof typeof pal] ?? pal.low;
              const isOpen = state?.selected === threat.id;
              return (
                <div key={threat.id} onClick={() => setState({ ...state, selected: isOpen ? null : threat.id })}
                  style={{ background: isOpen ? p.bg : surface, border: `1.5px solid ${isOpen ? p.border : border}`,
                    borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s', boxShadow: isOpen ? 'none' : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)') }}>

                  {/* Card header */}
                  <div style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Type icon + severity dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: p.badge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                        {TYPE_ICONS[threat.type] ?? '⚠️'}
                      </div>
                      <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: p.dot, border: `2px solid ${isOpen ? p.bg : surface}` }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: isOpen ? p.text : textPri, lineHeight: 1.3 }}>{threat.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ padding: '2px 8px', background: p.badge, color: p.text, border: `1px solid ${p.border}`, borderRadius: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {threat.severity}
                          </span>
                          {isOpen ? <ChevronUp size={14} style={{ color: textSec }} /> : <ChevronDown size={14} style={{ color: textSec }} />}
                        </div>
                      </div>

                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: textMid, lineHeight: 1.5 }}>{threat.description}</p>

                      {/* Meta row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: textSec }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} /> {threat.location.port ?? threat.location.region ?? `${threat.location.lat.toFixed(1)}, ${threat.location.lng.toFixed(1)}`}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> <span suppressHydrationWarning>{new Date(threat.estimatedImpactStart).toLocaleDateString()}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Activity size={11} /> {threat.source.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Confidence bar */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: textSec, marginBottom: '3px' }}>
                          <span>Confidence</span>
                        </div>
                        <ConfidenceBar value={threat.confidence} color={p.dot} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded section */}
                  {isOpen && (
                    <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${p.border}`, paddingTop: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: p.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact Window</p>
                          <ImpactWindow start={threat.estimatedImpactStart} end={threat.estimatedImpactEnd} />
                        </div>
                        <div>
                          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: p.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detected</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: textMid }}>
                            <TrendingUp size={11} /> <span suppressHydrationWarning>{new Date(threat.detectedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Affected routes */}
                      {threat.affectedRoutes && threat.affectedRoutes.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: p.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affected Routes</p>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {threat.affectedRoutes.map(r => (
                              <span key={r} style={{ padding: '3px 10px', background: isDark ? '#1e1e23' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '20px', fontSize: '11px', color: textMid, fontWeight: 500 }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {threat.tags && threat.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {threat.tags.map(tag => (
                            <span key={tag} style={{ padding: '2px 8px', background: p.badge, color: p.text, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: textSec }}>NitroStack Supply Chain Intelligence</span>
        <span style={{ fontSize: '11px', color: textSec }}>Real-time threat monitoring</span>
      </div>
    </div>
  );
}
