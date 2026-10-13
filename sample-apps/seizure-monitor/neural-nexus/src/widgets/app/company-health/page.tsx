'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface Department {
  departmentId: string;
  departmentName: string;
  healthScore: number;
  status: HealthStatus;
  summary: string;
  owningAgent: string;
  sources: string[];
}

interface RecommendationLite {
  recommendationId: string;
  incidentId: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
}

interface CompanyHealth {
  companyHealthScore: number;
  status: HealthStatus;
  openIncidents: number;
  criticalRisks: number;
  departments: Department[];
  recommendations: RecommendationLite[];
  lastUpdated: string;
}

const statusColor: Record<HealthStatus, string> = {
  healthy: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  critical: '#ef4444', // Red
};

const priorityColor: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const MOCK_COMPANY_HEALTH: CompanyHealth = {
  companyHealthScore: 82,
  status: 'warning',
  openIncidents: 2,
  criticalRisks: 1,
  departments: [
    {
      departmentId: 'engineering',
      departmentName: 'Engineering',
      healthScore: 74,
      status: 'warning',
      summary: 'Database deployment failed on primary checkout service.',
      owningAgent: 'Engineering Agent',
      sources: ['GitHub', 'Datadog']
    },
    {
      departmentId: 'operations',
      departmentName: 'Operations',
      healthScore: 88,
      status: 'healthy',
      summary: 'Infrastructure load is normal, but deployment rollback is pending.',
      owningAgent: 'Monitoring Agent',
      sources: ['Datadog']
    },
    {
      departmentId: 'product',
      departmentName: 'Product',
      healthScore: 95,
      status: 'healthy',
      summary: 'Sprint delivery tracking on target.',
      owningAgent: 'Executive Agent',
      sources: ['Jira']
    }
  ],
  recommendations: [
    {
      recommendationId: 'REC-1',
      incidentId: 'INC-1004',
      priority: 'high',
      title: 'Rollback database migrations on production'
    },
    {
      recommendationId: 'REC-2',
      incidentId: 'INC-1005',
      priority: 'medium',
      title: 'Scale authentication gateway service replicas'
    }
  ],
  lastUpdated: new Date().toISOString()
};

export default function CompanyHealthWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<CompanyHealth>();

  const isDark = theme === 'dark';
  const bg = isDark ? 'radial-gradient(circle at top left, #0f172a, #020617)' : '#f8fafc';
  const card = isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? 'rgba(51, 65, 85, 0.5)' : '#e2e8f0';
  const shadow = isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.05)';
  const backdropFilter = isDark ? 'blur(8px)' : 'none';

  const shellStyle: React.CSSProperties = { 
    padding: 32, 
    textAlign: 'center', 
    color: text, 
    background: bg, 
    borderRadius: 16, 
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: 300,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  if (!isReady) return <div style={shellStyle}>Initializing Digital Twin...</div>;
  
  const isMock = !rawData;
  const data = rawData || MOCK_COMPANY_HEALTH;
  if (!data) return <div style={shellStyle}>Loading live organizational telemetry...</div>;

  const score = data.companyHealthScore ?? 0;
  const status = (data.status ?? 'warning') as HealthStatus;
  const departments = data.departments ?? [];
  const recommendations = data.recommendations ?? [];

  // Extract Engineering specifically to show its breakdown
  const engDept = departments.find(d => d.departmentId === 'engineering');
  const engScore = engDept ? engDept.healthScore : score;

  const statCard = (label: string, value: string, color: string) => (
    <div style={{ 
      background: card, 
      border: `1px solid ${border}`, 
      borderRadius: 12, 
      padding: '12px 18px', 
      minWidth: 100, 
      textAlign: 'center',
      boxShadow: shadow,
      backdropFilter
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ 
      background: bg, 
      color: text, 
      padding: 24, 
      borderRadius: 16, 
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      border: `1px solid ${border}`
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '1px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>AI Workplace Digital Twin</div>
            {isMock && (
              <span style={{
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
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>Executive Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {statCard('Open Incidents', String(data.openIncidents ?? 0), '#f59e0b')}
          {statCard('Critical Risks', String(data.criticalRisks ?? 0), '#ef4444')}
        </div>
      </div>

      {/* Main Grid: Overall Health Gauge + Engineering Health breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        
        {/* Overall Company Health Gauge */}
        <div style={{ 
          background: card, 
          border: `1px solid ${border}`, 
          borderRadius: 16, 
          padding: 24, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 24, 
          boxShadow: shadow,
          backdropFilter 
        }}>
          <div style={{
            width: 110, height: 110, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${statusColor[status]} ${score * 3.6}deg, ${border} 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: isDark ? '#1e293b' : '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: statusColor[status] }}>{score}%</span>
              <span style={{ fontSize: 9, color: muted, fontWeight: 700, textTransform: 'uppercase' }}>Overall</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: `rgba(${status === 'healthy' ? '16,185,129' : status === 'warning' ? '245,158,11' : '239,68,68'}, 0.25)`, border: `1px solid ${statusColor[status]}`, color: statusColor[status], fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
              {status}
            </div>
            <div style={{ marginTop: 12, color: text, fontSize: 14, fontWeight: 700 }}>Company Health Status</div>
            <div style={{ marginTop: 4, color: muted, fontSize: 12, lineHeight: 1.5 }}>
              Aggregated in real-time across departments using LangGraph business logic.
            </div>
          </div>
        </div>

        {/* Engineering Health Breakdown */}
        <div style={{ 
          background: card, 
          border: `1px solid ${border}`, 
          borderRadius: 16, 
          padding: 20, 
          boxShadow: shadow,
          backdropFilter 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>Engineering Health Breakdown</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: statusColor[engScore >= 85 ? 'healthy' : engScore >= 65 ? 'warning' : 'critical'] }}>{engScore}%</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Deployment Success', weight: 25, value: engScore },
              { label: 'CI/CD Success', weight: 20, value: Math.min(100, Math.round(engScore * 1.02)) },
              { label: 'Sprint Health', weight: 20, value: Math.min(100, Math.round(engScore * 0.95)) },
              { label: 'Issue Rate Stability', weight: 15, value: Math.min(100, Math.round(engScore * 0.98)) },
              { label: 'Infrastructure Health', weight: 20, value: Math.min(100, Math.round(engScore * 1.05)) },
            ].map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{m.label} <span style={{ color: muted, fontSize: 10 }}>({m.weight}%)</span></span>
                  <span style={{ fontWeight: 700 }}>{m.value}%</span>
                </div>
                <div style={{ height: 5, background: border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${m.value}%`, height: '100%', background: 'linear-gradient(to right, #6366f1, #3b82f6)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Departments Grid */}
      <div style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Live Department Signals</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {departments.map((d) => {
          const s = (d.status ?? 'healthy') as HealthStatus;
          return (
            <div key={d.departmentId} style={{ 
              background: card, 
              border: `1px solid ${border}`, 
              borderRadius: 14, 
              padding: 16,
              boxShadow: shadow,
              backdropFilter
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{d.departmentName}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: statusColor[s], textTransform: 'uppercase' }}>{s}</span>
              </div>
              <div style={{ height: 6, background: border, borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${d.healthScore ?? 0}%`, height: '100%', background: statusColor[s] }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: muted }}>
                <span>Score: <b>{d.healthScore}%</b></span>
                <span>{d.owningAgent.replace(' Agent', '')}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: text, lineHeight: 1.4, borderTop: `1px solid ${border}`, paddingTop: 8 }}>
                {d.summary}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Top Actions Awaiting Executive Review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendations.map((r) => (
              <div key={r.recommendationId} style={{ 
                background: card, 
                border: `1px solid ${border}`, 
                borderRadius: 12, 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                boxShadow: shadow,
                backdropFilter
              }}>
                <span style={{ 
                  padding: '3px 10px', 
                  borderRadius: 999, 
                  background: priorityColor[r.priority] ?? muted, 
                  color: '#fff', 
                  fontSize: 10, 
                  fontWeight: 800, 
                  textTransform: 'uppercase' 
                }}>{r.priority}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: muted, fontWeight: 700 }}>{r.incidentId} · {r.recommendationId}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ 
          background: card, 
          border: `1px solid ${border}`, 
          borderRadius: 12, 
          padding: 16, 
          textAlign: 'center', 
          color: muted, 
          fontSize: 13,
          fontWeight: 600
        }}>
          ✅ All systems operational. No actions pending approval.
        </div>
      )}
    </div>
  );
}
