'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface AgentLog {
  logId: string;
  agent: string;
  timestamp: string;
  action: string;
  durationMs: number;
  status: 'success' | 'running' | 'failed';
  detail: string;
}

interface AgentActivity {
  pipeline: string[];
  logs: AgentLog[];
}

const statusColor: Record<string, string> = {
  success: '#16a34a',
  running: '#d97706',
  failed: '#dc2626',
};

const MOCK_AGENT_ACTIVITY: AgentActivity = {
  pipeline: ['Monitoring Agent', 'Engineering Agent', 'Executive Agent', 'Action Agent'],
  logs: [
    {
      logId: 'log-1',
      agent: 'Monitoring Agent',
      timestamp: new Date(Date.now() - 10000).toISOString(),
      action: 'SaaS polling loop execution completed',
      durationMs: 450,
      status: 'success',
      detail: 'Polled GitHub, Jira, and Datadog. Detected 1 critical alert on Datadog CPU usage.'
    },
    {
      logId: 'log-2',
      agent: 'Engineering Agent',
      timestamp: new Date(Date.now() - 8000).toISOString(),
      action: 'Root cause analysis triggered',
      durationMs: 1200,
      status: 'success',
      detail: 'Analyzed git commit history and deployment logs. Confirmed db schema migrations mismatch.'
    },
    {
      logId: 'log-3',
      agent: 'Executive Agent',
      timestamp: new Date(Date.now() - 5000).toISOString(),
      action: 'Company health risk projection computed',
      durationMs: 850,
      status: 'success',
      detail: 'Determined high revenue risk. Overall company health projection dropped to 82%.'
    }
  ]
};

export default function AgentActivityWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<AgentActivity>();

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';
  const accent = '#6366f1';

  const shellStyle: React.CSSProperties = { padding: 32, textAlign: 'center', color: text, background: bg, borderRadius: 16, fontFamily: 'system-ui, sans-serif' };
  if (!isReady) return <div style={shellStyle}>Initializing agents…</div>;

  const isMock = !rawData;
  const data = rawData || MOCK_AGENT_ACTIVITY;
  if (!data) return <div style={shellStyle}>Loading agent activity…</div>;

  const pipeline = data.pipeline ?? [];
  const logs = data.logs ?? [];

  return (
    <div style={{ background: bg, color: text, padding: 20, borderRadius: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 13, letterSpacing: 0.4, color: muted, textTransform: 'uppercase' }}>Live Multi-Agent Pipeline</div>
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
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2, marginBottom: 16 }}>Agent Activity</div>

      {/* Pipeline */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {pipeline.map((agent, i) => (
          <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ padding: '6px 12px', borderRadius: 999, background: cardBg, border: `1px solid ${accent}`, color: text, fontSize: 12, fontWeight: 700 }}>{agent}</span>
            {i < pipeline.length - 1 && <span style={{ color: accent, fontWeight: 800 }}>→</span>}
          </div>
        ))}
      </div>

      {/* Logs */}
      <div style={{ fontSize: 13, fontWeight: 700, color: muted, textTransform: 'uppercase', marginBottom: 10 }}>Reasoning Log</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {logs.map((l) => (
          <div key={l.logId} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[l.status] ?? muted, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>{l.agent}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: muted, textTransform: 'capitalize' }}>
                {l.status}{l.durationMs > 0 ? ` · ${l.durationMs}ms` : ''}
              </span>
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{l.action}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.4 }}>{l.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
