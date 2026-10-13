'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface TimelineEntry {
  timestamp: string;
  agent: string;
  event: string;
  detail: string;
}

interface Recommendation {
  recommendationId: string;
  incidentId: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  mcpServer: string;
  status: string;
}

interface BusinessImpact {
  summary: string;
  engineeringRisk: HealthStatus;
  launchDelay: 'unlikely' | 'possible' | 'likely';
  customerImpact: HealthStatus;
  revenueRisk: HealthStatus;
  projectedHealthScore: number;
}

interface Incident {
  incidentId: string;
  title: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  timestamp: string;
  affectedDepartments: string[];
  affectedSystems: string[];
  trigger: string;
  rootCause: string;
  confidenceScore: number;
  businessImpact: BusinessImpact;
  timeline: TimelineEntry[];
  recommendations: Recommendation[];
}

const severityColor: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const priorityColor: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const riskColor: Record<string, string> = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  unlikely: '#10b981',
  possible: '#f59e0b',
  likely: '#ef4444',
};

const MOCK_INCIDENT_DETAIL: Incident = {
  incidentId: 'INC-1004',
  title: 'Failed Production Database Rollout',
  category: 'Deployment Failure',
  severity: 'critical',
  status: 'analyzed',
  timestamp: new Date(Date.now() - 3600000).toISOString(),
  affectedDepartments: ['engineering', 'operations'],
  affectedSystems: ['GitHub', 'Datadog', 'Jira'],
  trigger: 'Deploy fail on commit e92a83',
  rootCause: 'Database migrations failed to apply due to schema mismatch on user_profile table.',
  confidenceScore: 96,
  businessImpact: {
    summary: 'Production checkout is returning 500 error codes, blocking active sales.',
    engineeringRisk: 'critical',
    launchDelay: 'likely',
    customerImpact: 'critical',
    revenueRisk: 'critical',
    projectedHealthScore: 74
  },
  timeline: [
    {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      agent: 'Monitoring Agent',
      event: 'Anomaly Detected',
      detail: 'Datadog health check returned HTTP 500 on production server.'
    },
    {
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      agent: 'Engineering Agent',
      event: 'Root Cause Analysis',
      detail: 'Identified failed db migration in recent deployment build logs.'
    },
    {
      timestamp: new Date(Date.now() - 2400000).toISOString(),
      agent: 'Executive Agent',
      event: 'Business Impact Assessment',
      detail: 'Calculated critical revenue risk and projected 24% drop in engineering health.'
    }
  ],
  recommendations: [
    {
      recommendationId: 'REC-101',
      incidentId: 'INC-1004',
      priority: 'high',
      title: 'Rollback Deployment',
      description: 'Rollback main server pods to stable sha b45c21 via GitHub Action.',
      mcpServer: 'GitHub',
      status: 'pending'
    }
  ]
};

export default function IncidentDetailWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<Incident>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'radial-gradient(circle at top left, #0f172a, #020617)' : '#f8fafc';
  const cardBg = isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0';
  const shadow = isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.05)';
  const backdropFilter = isDark ? 'blur(8px)' : 'none';

  const shellStyle: React.CSSProperties = { 
    padding: 32, 
    textAlign: 'center', 
    color: text, 
    background: bg, 
    borderRadius: 16, 
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
  };
  
  if (!isReady) return <div style={shellStyle}>Connecting to digital twin...</div>;

  const isMock = !data;
  const incident = data || MOCK_INCIDENT_DETAIL;
  if (!incident || !incident.incidentId) return <div style={shellStyle}>Incident detail report is currently unavailable.</div>;

  const severity = incident.severity ?? 'medium';
  const impact = incident.businessImpact ?? ({} as BusinessImpact);
  const timeline = incident.timeline ?? [];
  const recommendations = incident.recommendations ?? [];
  const affectedSystems = incident.affectedSystems ?? [];

  const impactRow = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${border}` }}>
      <span style={{ fontSize: 13, color: muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: riskColor[value] ?? text, textTransform: 'capitalize' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ 
      background: bg, 
      color: text, 
      padding: 24, 
      borderRadius: 16, 
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      border: `1px solid ${border}`,
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ padding: '3px 10px', borderRadius: 999, background: severityColor[severity], color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{severity}</span>
            <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>
              {incident.incidentId} · {incident.category}
              {isMock && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9,
                  background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                  color: '#d97706',
                  padding: '1px 5px',
                  borderRadius: 4,
                  fontWeight: 800
                }}>
                  MOCK
                </span>
              )}
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6, letterSpacing: '-0.5px' }}>{incident.title}</div>
        </div>
        <div style={{ 
          padding: '4px 12px', 
          borderRadius: 999, 
          background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
          color: '#6366f1',
          fontSize: 11,
          fontWeight: 800,
          border: '1px solid rgba(99, 102, 241, 0.3)',
          textTransform: 'uppercase'
        }}>
          Status: {incident.status.replace('_', ' ')}
        </div>
      </div>

      {/* Grid: Root Cause (Left) + Business Impact (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        
        {/* Engineering Root Cause analysis */}
        <div style={{ 
          background: cardBg, 
          border: `1px solid ${border}`, 
          borderLeft: `4px solid ${severityColor[severity]}`, 
          borderRadius: 12, 
          padding: 18,
          boxShadow: shadow,
          backdropFilter
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase' }}>Root Cause · Engineering Agent</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981' }}>{incident.confidenceScore ?? 0}% confidence</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>{incident.rootCause}</div>
          <div style={{ marginTop: 12, fontSize: 12, color: muted, lineHeight: 1.4 }}>
            <b>System Trigger:</b> {incident.trigger}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {affectedSystems.map((s) => (
              <span key={s} style={{ 
                fontSize: 10, 
                padding: '3px 8px', 
                borderRadius: 999, 
                background: isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0', 
                color: text,
                fontWeight: 700 
              }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Business Impact */}
        <div style={{ 
          background: cardBg, 
          border: `1px solid ${border}`, 
          borderRadius: 12, 
          padding: 18,
          boxShadow: shadow,
          backdropFilter
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 10 }}>Business Impact · Executive Agent</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12, fontWeight: 500 }}>{impact.summary}</div>
          {impactRow('Engineering Risk', impact.engineeringRisk ?? 'healthy')}
          {impactRow('Launch Delay Risk', impact.launchDelay ?? 'unlikely')}
          {impactRow('Customer Support Impact', impact.customerImpact ?? 'healthy')}
          {impactRow('Revenue Risk', impact.revenueRisk ?? 'healthy')}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
            <span style={{ fontSize: 13, color: muted, fontWeight: 600 }}>Projected Company Health</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: riskColor[impact.engineeringRisk || 'healthy'] }}>{impact.projectedHealthScore ?? 0}%</span>
          </div>
        </div>

      </div>

      {/* Integration Telemetry Panels (GitHub, Datadog, Jira details depending on active systems) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
        
        {/* Datadog Metrics Telemetry */}
        {affectedSystems.includes('Datadog') && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, boxShadow: shadow, backdropFilter }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} /> Datadog Metrics Telemetry
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>Gateway CPU utilization</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>98.4%</span>
                </div>
                <div style={{ height: 6, background: border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: '98%', height: '100%', background: '#ef4444' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>Gateway Memory capacity</span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>88.2%</span>
                </div>
                <div style={{ height: 6, background: border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: '88%', height: '100%', background: '#f59e0b' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 4 }}>
                <span>HTTP Health Check state</span>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>DOWNTIME (3 failures)</span>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Repository State */}
        {affectedSystems.includes('GitHub') && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, boxShadow: shadow, backdropFilter }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12 }}>
              🐙 GitHub Repository State
            </div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>Latest Commit:</span>
                <code style={{ background: border, padding: '1px 5px', borderRadius: 4 }}>e92a83f (Database migrations)</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>Workflow State:</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>Deploy Job Failed</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>Build Logs Trace:</span>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 160 }}>`migration failed: relation already exists`</span>
              </div>
            </div>
          </div>
        )}

        {/* Jira Sprint Delivery Status */}
        {affectedSystems.includes('Jira') && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, boxShadow: shadow, backdropFilter }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12 }}>
              📋 Jira Sprint Delivery Status
            </div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>Associated Ticket:</span>
                <span style={{ fontWeight: 700 }}>PAY-882 (Backup Gateway)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>Ticket Assignee:</span>
                <span>Alex Rivera</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: muted }}>Ticket Priority:</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>Critical</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span>Development Progress</span>
                  <span>45%</span>
                </div>
                <div style={{ height: 6, background: border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: '45%', height: '100%', background: '#6366f1' }} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Timeline */}
      <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Multi-Agent Resolution Timeline</div>
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: shadow, backdropFilter }}>
        {timeline.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < timeline.length - 1 ? 14 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: severityColor[severity] || '#6366f1', marginTop: 4, boxShadow: `0 0 8px ${severityColor[severity]}` }} />
              {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: border, marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: 4, flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{t.agent}</span>
                <span style={{ fontSize: 11, color: muted }}>{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, marginTop: 2 }}>{t.event}</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 3, lineHeight: 1.4 }}>{t.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommended Actions */}
      <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Recommended Actions</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map((r) => (
          <div key={r.recommendationId} style={{ 
            background: cardBg, 
            border: `1px solid ${border}`, 
            borderRadius: 12, 
            padding: 16,
            boxShadow: shadow,
            backdropFilter 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 9px', borderRadius: 999, background: priorityColor[r.priority] ?? muted, color: '#fff', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{r.priority}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{r.title}</span>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: 10, 
                padding: '2px 8px', 
                borderRadius: 5, 
                background: r.status === 'executed' ? 'rgba(16,185,129,0.15)' : r.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
                color: r.status === 'executed' ? '#10b981' : r.status === 'pending' ? '#f59e0b' : muted,
                fontWeight: 800,
                textTransform: 'uppercase'
              }}>{r.status}</span>
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 8, lineHeight: 1.5 }}>{r.description}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}` }}>
              Driven by the <b>Action Agent</b> via the <b>{r.mcpServer}</b> MCP Server.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
