'use client';

import React, { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface NotificationLog {
  id: string;
  type: 'slack' | 'gmail';
  timestamp: string;
  recipient: string;
  subject: string;
  content: string;
}

interface MonitoringData {
  isActive: boolean;
  lastPollTimestamp: string | null;
  pollCount: number;
  githubRunsCount: number;
  jiraSprintsCount: number;
  datadogHttpCheckFailures: number;
  recentNotifications: NotificationLog[];
}

const MOCK_MONITORING: MonitoringData = {
  isActive: true,
  lastPollTimestamp: new Date().toISOString(),
  pollCount: 142,
  githubRunsCount: 5,
  jiraSprintsCount: 1,
  datadogHttpCheckFailures: 0,
  recentNotifications: [
    {
      id: 'notif-1',
      type: 'slack',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      recipient: '#ops-alerts',
      subject: 'Deployment Failure Alert',
      content: 'Production rollout failed on commit e92a83.'
    },
    {
      id: 'notif-2',
      type: 'gmail',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      recipient: 'vp-eng@company.com',
      subject: 'Security Alert: CPU Spike',
      content: 'Datadog check failed: CPU utilisation exceeds 98% on gateway node.'
    }
  ]
};

export default function MonitoringWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const rawData = getToolOutput<MonitoringData>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotify, setSelectedNotify] = useState<string | null>(null);

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

  if (!isReady) return <div style={shellStyle}>Connecting to monitoring dashboard...</div>;

  const isMock = !rawData;
  const data = rawData || MOCK_MONITORING;
  if (!data) return <div style={shellStyle}>Loading live SaaS systems monitors...</div>;

  const toggleMonitoring = async () => {
    setLoading(true);
    setError(null);
    try {
      const toolName = data.isActive ? 'stopMonitoring' : 'startMonitoring';
      await callTool(toolName, {});
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update monitoring state.');
    } finally {
      setLoading(false);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '1.2px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>Monitoring Agent Room</div>
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
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>Live Polling telemetry</div>
        </div>

        <button 
          onClick={toggleMonitoring}
          disabled={loading}
          style={{
            background: data.isActive ? '#ef4444' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: data.isActive ? '0 4px 12px rgba(239,68,68,0.2)' : '0 4px 12px rgba(16,185,129,0.2)',
            transition: 'opacity 0.2s',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : data.isActive ? 'Stop Polling' : 'Start Polling'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, fontWeight: 700 }}>
          ❌ {error}
        </div>
      )}

      {/* Grid: Polling status info + active feeds summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        
        {/* Polling summary */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, boxShadow: shadow, backdropFilter }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12 }}>
            Polling Agent Engine
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: muted }}>Engine State:</span>
              <span style={{ 
                fontWeight: 800, 
                color: data.isActive ? '#10b981' : '#ef4444',
                textTransform: 'uppercase'
              }}>
                {data.isActive ? 'Active (polling)' : 'Suspended'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: muted }}>Total Ticks:</span>
              <span style={{ fontWeight: 700 }}>{data.pollCount} runs</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: muted }}>Last Checked:</span>
              <span style={{ fontWeight: 600 }}>
                {data.lastPollTimestamp ? new Date(data.lastPollTimestamp).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Feeds summary */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, boxShadow: shadow, backdropFilter }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12 }}>
            SaaS Connected Scopes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <div style={{ padding: 8, background: isDark ? 'rgba(15,23,42,0.4)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${border}` }}>
              <div style={{ color: muted, fontWeight: 700 }}>GitHub Action</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{data.githubRunsCount} Runs</div>
            </div>
            <div style={{ padding: 8, background: isDark ? 'rgba(15,23,42,0.4)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${border}` }}>
              <div style={{ color: muted, fontWeight: 700 }}>Jira Project</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{data.jiraSprintsCount} Sprint</div>
            </div>
            <div style={{ padding: 8, background: isDark ? 'rgba(15,23,42,0.4)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${border}` }}>
              <div style={{ color: muted, fontWeight: 700 }}>Datadog HTTP</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2, color: data.datadogHttpCheckFailures > 0 ? '#ef4444' : text }}>
                {data.datadogHttpCheckFailures} Fails
              </div>
            </div>
            <div style={{ padding: 8, background: isDark ? 'rgba(15,23,42,0.4)' : '#f1f5f9', borderRadius: 8, border: `1px solid ${border}` }}>
              <div style={{ color: muted, fontWeight: 700 }}>Google Calendar</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>Monitoring</div>
            </div>
          </div>
        </div>

      </div>

      {/* Dispatched Alerts Feed */}
      <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
        Dispatched Alerts & Notifications
      </div>
      
      {data.recentNotifications.length === 0 ? (
        <div style={{ 
          background: cardBg, 
          border: `1px solid ${border}`, 
          borderRadius: 12, 
          padding: 16, 
          textAlign: 'center', 
          color: muted,
          fontSize: 12,
          fontWeight: 600
        }}>
          No outgoing notifications triggered yet. Run scenarios using `triggerIncident` tool.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.recentNotifications.map((n) => {
            const isSelected = selectedNotify === n.id;
            
            return (
              <div key={n.id} style={{ 
                background: cardBg, 
                border: `1px solid ${border}`, 
                borderRadius: 10, 
                overflow: 'hidden',
                boxShadow: shadow
              }}>
                {/* Accordion Header */}
                <div 
                  onClick={() => setSelectedNotify(isSelected ? null : n.id)}
                  style={{ 
                    padding: '10px 14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    cursor: 'pointer',
                    background: isDark ? 'rgba(15, 23, 42, 0.2)' : '#f8fafc',
                    borderBottom: isSelected ? `1px solid ${border}` : 'none'
                  }}
                >
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    background: n.type === 'slack' ? '#4a154b' : '#ea4335',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    textTransform: 'uppercase'
                  }}>
                    {n.type}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 280 }}>
                    {n.subject}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: muted }}>
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 12, color: muted, fontWeight: 800 }}>
                    {isSelected ? '▼' : '▶'}
                  </span>
                </div>

                {/* Accordion Body */}
                {isSelected && (
                  <div style={{ 
                    padding: 14, 
                    fontSize: 12, 
                    lineHeight: 1.5, 
                    background: isDark ? '#0f172a' : '#fff',
                    textAlign: 'left'
                  }}>
                    <div style={{ marginBottom: 8, color: muted, borderBottom: `1px solid ${border}`, paddingBottom: 6 }}>
                      <b>Recipient:</b> <code>{n.recipient}</code>
                    </div>
                    {n.type === 'gmail' ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: n.content }} 
                        style={{ fontFamily: 'sans-serif' }}
                      />
                    ) : (
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'monospace',
                        background: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc',
                        padding: 10,
                        borderRadius: 6,
                        border: `1px solid ${border}`
                      }}>
                        {n.content}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
