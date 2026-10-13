'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface EngineeringHealthData {
  engineeringHealthScore: number;
  status: HealthStatus;
  breakdown: {
    deploymentSuccess: number;
    cicdSuccess: number;
    sprintHealth: number;
    issueRate: number;
    infrastructureHealth: number;
  };
  metricsWeights: {
    deploymentSuccess: string;
    cicdSuccess: string;
    sprintHealth: string;
    issueRate: string;
    infrastructureHealth: string;
  };
  lastUpdated: string;
}

const statusColor: Record<HealthStatus, string> = {
  healthy: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  critical: '#ef4444', // Red
};

const MOCK_ENGINEERING_HEALTH: EngineeringHealthData = {
  engineeringHealthScore: 78,
  status: 'warning',
  breakdown: {
    deploymentSuccess: 65,
    cicdSuccess: 80,
    sprintHealth: 90,
    issueRate: 85,
    infrastructureHealth: 72
  },
  metricsWeights: {
    deploymentSuccess: '25%',
    cicdSuccess: '20%',
    sprintHealth: '20%',
    issueRate: '15%',
    infrastructureHealth: '20%'
  },
  lastUpdated: new Date().toISOString()
};

export default function EngineeringHealthWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<EngineeringHealthData>();

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

  if (!isReady) return <div style={shellStyle}>Connecting to host...</div>;

  const isMock = !rawData;
  const data = rawData || MOCK_ENGINEERING_HEALTH;
  if (!data) return <div style={shellStyle}>No engineering health telemetry data received.</div>;

  const score = data.engineeringHealthScore ?? 0;
  const status = (data.status ?? 'warning') as HealthStatus;
  const breakdown = data.breakdown ?? {
    deploymentSuccess: 100,
    cicdSuccess: 100,
    sprintHealth: 100,
    issueRate: 100,
    infrastructureHealth: 100,
  };
  const weights = data.metricsWeights ?? {
    deploymentSuccess: '25%',
    cicdSuccess: '20%',
    sprintHealth: '20%',
    issueRate: '15%',
    infrastructureHealth: '20%',
  };

  const metricItems = [
    { label: 'Deployment Success Rate', weight: weights.deploymentSuccess, value: breakdown.deploymentSuccess, desc: 'Weighted rate of successful GitHub Deployments vs rollbacks' },
    { label: 'CI/CD Pipeline Success', weight: weights.cicdSuccess, value: breakdown.cicdSuccess, desc: 'Pass rate of GitHub Actions workflow runs' },
    { label: 'Sprint Delivery Velocity', weight: weights.sprintHealth, value: breakdown.sprintHealth, desc: 'Ratio of remaining story points to available developer capacity' },
    { label: 'Issue Rate Stability', weight: weights.issueRate, value: breakdown.issueRate, desc: 'Active Jira issues vs historical nominal baseline average' },
    { label: 'Infrastructure Health', weight: weights.infrastructureHealth, value: breakdown.infrastructureHealth, desc: 'Aggregated Datadog CPU usage, RAM health, and HTTP uptime checks' },
  ];

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
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>Engineering Health Center</div>
        </div>
        <div style={{ fontSize: 11, color: muted, alignSelf: 'flex-end' }}>
          Last Checked: {new Date(data.lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, flexWrap: 'wrap' }}>
        
        {/* Large Metric circular dial */}
        <div style={{ 
          background: card, 
          border: `1px solid ${border}`, 
          borderRadius: 16, 
          padding: 32, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: shadow,
          backdropFilter 
        }}>
          <div style={{
            width: 140, height: 140, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${statusColor[status]} ${score * 3.6}deg, ${border} 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 16px rgba(0,0,0,0.15)'
          }}>
            <div style={{ width: 112, height: 112, borderRadius: '50%', background: isDark ? '#1e293b' : '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: statusColor[status] }}>{score}%</span>
              <span style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Health Score</span>
            </div>
          </div>
          <div style={{
            marginTop: 20, 
            padding: '6px 16px', 
            borderRadius: 999, 
            background: `rgba(${status === 'healthy' ? '16,185,129' : status === 'warning' ? '245,158,11' : '239,68,68'}, 0.2)`, 
            border: `1px solid ${statusColor[status]}`, 
            color: statusColor[status], 
            fontSize: 13, 
            fontWeight: 800, 
            textTransform: 'uppercase'
          }}>
            {status}
          </div>
        </div>

        {/* Detailed Slider Breakdown */}
        <div style={{ 
          background: card, 
          border: `1px solid ${border}`, 
          borderRadius: 16, 
          padding: 24, 
          boxShadow: shadow,
          backdropFilter 
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: 16 }}>
            Weighted Metric Breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {metricItems.map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>
                    {m.label} <span style={{ color: muted, fontSize: 10, fontWeight: 600 }}>({m.weight})</span>
                  </span>
                  <span style={{ fontWeight: 800, color: statusColor[m.value >= 85 ? 'healthy' : m.value >= 65 ? 'warning' : 'critical'] }}>{m.value}%</span>
                </div>
                <div style={{ height: 6, background: border, borderRadius: 999, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ 
                    width: `${m.value}%`, 
                    height: '100%', 
                    background: `linear-gradient(to right, ${statusColor[m.value >= 85 ? 'healthy' : m.value >= 65 ? 'warning' : 'critical']}, #6366f1)`, 
                    borderRadius: 999 
                  }} />
                </div>
                <div style={{ fontSize: 10, color: muted }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
