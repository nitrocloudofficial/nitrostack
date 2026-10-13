'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsData {
  summary: {
    totalTickets: number;
    statusCounts: Record<string, number>;
    rootCauseCounts: Record<string, number>;
    mttrMinutes: number;
    autoFixRate: number;
    slaBreaches: number;
  };
  employeeIncidents: Record<string, number>;
  recentActivity: Array<{ ticketId: string; employeeId: string; action: string }>;
  generatedAt: string;
}

// ─── Color Palettes ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: '#f59e0b',
  diagnosing: '#6366f1',
  resolved: '#10b981',
  escalated: '#ef4444',
};

const ROOT_CAUSE_COLORS: Record<string, { color: string; label: string; icon: string }> = {
  not_in_group: { color: '#8b5cf6', label: 'Missing Group', icon: '👥' },
  no_license: { color: '#f59e0b', label: 'No License', icon: '🪪' },
  network_issue: { color: '#3b82f6', label: 'Network Issue', icon: '🌐' },
  account_suspended: { color: '#ef4444', label: 'Account Suspended', icon: '🚫' },
  none: { color: '#10b981', label: 'Healthy', icon: '✅' },
  unknown: { color: '#64748b', label: 'Unknown', icon: '❓' },
  pending: { color: '#94a3b8', label: 'Pending Scan', icon: '⏳' },
};

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

function DonutChart({ data, size = 160 }: { data: Record<string, number>; size?: number }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = Object.entries(data).map(([key, value]) => {
    const pct = value / total;
    const dashLen = pct * circumference;
    const dashOffset = -offset;
    offset += dashLen;
    return { key, value, pct, dashLen, dashOffset, color: STATUS_COLORS[key] || '#64748b' };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => (
        <circle
          key={seg.key}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth={18}
          strokeDasharray={`${seg.dashLen} ${circumference - seg.dashLen}`}
          strokeDashoffset={seg.dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
        />
      ))}
      <text x={size / 2} y={size / 2 - 8} textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="800">{total}</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill="currentColor" fontSize="11" opacity="0.6">Total</text>
    </svg>
  );
}

// ─── Horizontal Progress Bar ─────────────────────────────────────────────────

function BarSegment({ label, icon, value, total, color }: { label: string; icon: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
        <span>{icon} {label}</span>
        <span style={{ opacity: 0.7 }}>{value} ({pct}%)</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: 'rgba(148,163,184,0.15)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          width: `${pct}%`, transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, subtext, color, isDark }: {
  icon: string; label: string; value: string | number; subtext?: string; color: string; isDark: boolean;
}) {
  return (
    <div style={{
      flex: '1 1 140px', padding: '16px 14px', borderRadius: 14,
      background: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -10, right: -10, width: 60, height: 60,
        borderRadius: '50%', background: `${color}15`,
      }} />
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', opacity: 0.6, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {subtext && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{subtext}</div>}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function HelpdeskAnalyticsPage() {
  return <Analytics />;
}

function Analytics() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setAnimateIn(true)); }, []);

  // Unwrap server output
  let raw = getToolOutput<any>();
  if (raw && (raw.result || raw.output || raw.data)) raw = raw.result || raw.output || raw.data;
  if (raw && Array.isArray(raw.content) && raw.content.length > 0) {
    try { raw = JSON.parse(raw.content[0].text); } catch (e) {}
  }
  if (raw && typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (e) {}
  }

  const data: AnalyticsData | null = raw?.summary ? raw : null;

  const isDark = theme === 'dark';
  const surface = isDark ? '#0f172a' : '#f8fafc';
  const card    = isDark ? '#1e293b' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const text    = isDark ? '#f1f5f9' : '#0f172a';
  const muted   = isDark ? '#94a3b8' : '#64748b';

  if (!data) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: muted, fontFamily: "'Inter', system-ui, sans-serif", background: surface, minHeight: '100%' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Helpdesk Analytics</p>
        <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.7 }}>Run <code style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>ticket_get_helpdesk_analytics</code> to generate live KPIs</p>
      </div>
    );
  }

  const { summary, employeeIncidents, recentActivity } = data;
  const totalRootCauses = Object.values(summary.rootCauseCounts).reduce((s, v) => s + v, 0);

  return (
    <div style={{
      background: surface, minHeight: '100%', fontFamily: "'Inter', system-ui, sans-serif", color: text,
      opacity: animateIn ? 1 : 0, transform: animateIn ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      {/* Header */}
      <div style={{
        background: isDark
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        padding: '20px 24px', color: isDark ? text : 'white',
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Helpdesk Analytics</h2>
            <p style={{ margin: '2px 0 0', fontSize: 11, opacity: 0.75 }}>
              Real-time IT Operations Intelligence · Generated {new Date(data.generatedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 20 }}>
          <KpiCard isDark={isDark} icon="🎫" label="Total Tickets" value={summary.totalTickets} color="#6366f1" />
          <KpiCard isDark={isDark} icon="⏱️" label="Avg MTTR" value={summary.mttrMinutes > 0 ? `${summary.mttrMinutes}m` : '—'} subtext="Mean Time To Resolve" color="#3b82f6" />
          <KpiCard isDark={isDark} icon="🤖" label="Auto-Fix Rate" value={`${summary.autoFixRate}%`} subtext="AI remediation success" color="#10b981" />
          <KpiCard isDark={isDark} icon="🚨" label="SLA Breaches" value={summary.slaBreaches} subtext="Tickets open > 1 hour" color={summary.slaBreaches > 0 ? '#ef4444' : '#10b981'} />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: 20 }}>
          {/* Donut: Status Distribution */}
          <div style={{
            flex: '1 1 200px', padding: 18, borderRadius: 14,
            background: isDark ? 'rgba(30,41,59,0.6)' : 'white',
            border: `1px solid ${border}`,
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', opacity: 0.7 }}>
              Ticket Status
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
              <DonutChart data={summary.statusCounts} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {Object.entries(summary.statusCounts).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[key] || '#64748b' }} />
                    <span style={{ textTransform: 'capitalize' as const, fontWeight: 600 }}>{key}</span>
                    <span style={{ opacity: 0.5 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bars: Root Cause Breakdown */}
          <div style={{
            flex: '1 1 280px', padding: 18, borderRadius: 14,
            background: isDark ? 'rgba(30,41,59,0.6)' : 'white',
            border: `1px solid ${border}`,
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', opacity: 0.7 }}>
              Root Cause Analysis
            </h3>
            {Object.entries(summary.rootCauseCounts).map(([key, val]) => {
              const cfg = ROOT_CAUSE_COLORS[key] || ROOT_CAUSE_COLORS['unknown'];
              return <BarSegment key={key} label={cfg.label} icon={cfg.icon} value={val} total={totalRootCauses} color={cfg.color} />;
            })}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
          {/* Employee Incident Heatmap */}
          <div style={{
            flex: '1 1 200px', padding: 18, borderRadius: 14,
            background: isDark ? 'rgba(30,41,59,0.6)' : 'white',
            border: `1px solid ${border}`,
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', opacity: 0.7 }}>
              📋 Employee Incident Map
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {Object.entries(employeeIncidents).sort((a, b) => b[1] - a[1]).map(([empId, count]) => {
                const intensity = Math.min(count / 3, 1);
                const bg = `rgba(99, 102, 241, ${0.15 + intensity * 0.55})`;
                return (
                  <div key={empId} style={{
                    padding: '10px 14px', borderRadius: 10, background: bg,
                    textAlign: 'center', minWidth: 80,
                    border: `1px solid rgba(99,102,241, ${0.1 + intensity * 0.3})`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{empId}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{count}</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>ticket{count !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div style={{
            flex: '1 1 280px', padding: 18, borderRadius: 14,
            background: isDark ? 'rgba(30,41,59,0.6)' : 'white',
            border: `1px solid ${border}`,
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', opacity: 0.7 }}>
              ⚡ Live Activity Feed
            </h3>
            {recentActivity.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.5, padding: '20px 0', textAlign: 'center' }}>
                No remediation actions yet — run diagnostics and apply fixes to populate this feed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                {recentActivity.map((act, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '10px 12px', borderRadius: 8,
                    background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)'}`,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>✅</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {act.ticketId} · {act.employeeId}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2, wordBreak: 'break-word' as const }}>
                        {act.action}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 10, opacity: 0.4 }}>
          IT Access Resolver · Powered by Agentic AI on the Model Context Protocol (MCP)
        </div>
      </div>
    </div>
  );
}
