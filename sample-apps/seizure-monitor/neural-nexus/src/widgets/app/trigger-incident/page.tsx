'use client';

import React, { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface Scenario {
  id: string;
  name: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  systems: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'cicd_failure',
    name: 'CI/CD Pipeline Crash',
    category: 'CI/CD Failure',
    severity: 'high',
    description: 'Trigger a Jest test suite failure on main branch to block integration checks.',
    systems: ['GitHub']
  },
  {
    id: 'merge_failure',
    name: 'Primary Auth Merge Lock',
    category: 'Merge Failure',
    severity: 'medium',
    description: 'Create a merge check conflict for the primary authorization router branch.',
    systems: ['GitHub']
  },
  {
    id: 'deployment_failure',
    name: 'Production Rollout Failure',
    category: 'Deployment Failure',
    severity: 'critical',
    description: 'Simulate a database migration mismatch crash on deployment of container pods.',
    systems: ['GitHub', 'Datadog']
  },
  {
    id: 'issue_spike',
    name: 'Customer Support Alert',
    category: 'Issue Spike',
    severity: 'high',
    description: 'Trigger a surge of Github HTTP 500 issue reports for Checkout & Payments.',
    systems: ['GitHub']
  },
  {
    id: 'infra_cpu_spike',
    name: 'Auth Gateway CPU Exhaustion',
    category: 'Infrastructure Spike',
    severity: 'critical',
    description: 'Spike Gateway CPU capacity usage to 99% and trigger Datadog alerting.',
    systems: ['Datadog']
  },
  {
    id: 'sprint_risk',
    name: 'Sprint Delivery Overload',
    category: 'Sprint Risk',
    severity: 'medium',
    description: 'Simulate developer backlog overflow with remaining story points > 75.',
    systems: ['Jira']
  },
  {
    id: 'feature_incomplete',
    name: 'Demo Review Block',
    category: 'Feature Incomplete',
    severity: 'medium',
    description: 'Trigger incomplete critical tickets blocking the Enterprise Demo Review meeting.',
    systems: ['Jira', 'Google Calendar']
  },
  {
    id: 'deadline_near',
    name: 'Sprint Deadline Alert',
    category: 'Deadline Near',
    severity: 'high',
    description: 'Move sprint end date to tomorrow with 65% tasks still incomplete.',
    systems: ['Jira']
  },
  {
    id: 'employee_leave',
    name: 'Lead Engineer Absence',
    category: 'Employee Leave',
    severity: 'medium',
    description: 'Simulate emergency medical leave overlap for critical payment ticket assignee.',
    systems: ['Google Calendar', 'Jira']
  },
  {
    id: 'ooo_meeting_overlap',
    name: 'Schedule Sync Conflict',
    category: 'OOO Conflict',
    severity: 'low',
    description: 'Create overlapping release sync meeting during team lead doctor OOO leave.',
    systems: ['Google Calendar']
  }
];

const severityColor: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6'
};

interface TriggerOutput {
  success: boolean;
  message: string;
}

export default function TriggerIncidentWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const toolOutput = getToolOutput<TriggerOutput>();

  const [selectedScenario, setSelectedScenario] = useState<string>('cicd_failure');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<Array<{ timestamp: string; scenario: string; message: string; mode: 'live' | 'mock' }>>([
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      scenario: 'deployment_failure',
      message: 'Scenario deployment_failure triggered and processed by agents.',
      mode: 'mock'
    }
  ]);

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

  if (!isReady) return <div style={shellStyle}>Connecting to simulation console...</div>;

  const triggerSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      let result: TriggerOutput;
      let mode: 'live' | 'mock' = 'live';

      try {
        result = await callTool('triggerIncident', { incidentType: selectedScenario }) as unknown as TriggerOutput;
      } catch (err) {
        console.warn('Live tool call failed or running in standalone mode. Falling back to local mock.', err);
        result = {
          success: true,
          message: `Scenario ${selectedScenario} successfully triggered and processed by agents.`
        };
        mode = 'mock';
      }

      setSimulationLogs(prev => [
        {
          timestamp: new Date().toISOString(),
          scenario: selectedScenario,
          message: result.message,
          mode
        },
        ...prev
      ]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Simulation failure.');
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
          <div style={{ fontSize: 11, letterSpacing: '1.2px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>Hackathon Control Center</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>Multi-Agent Incident Simulator</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10,
            padding: '4px 8px',
            background: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
            color: '#6366f1',
            borderRadius: 6,
            fontWeight: 800,
            border: '1px solid rgba(99,102,241,0.3)'
          }}>
            10 Scenarios
          </span>
        </div>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, fontWeight: 700 }}>
          ❌ {error}
        </div>
      )}

      {/* Main Grid: Left Scenarios, Right Trigger controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 20, marginBottom: 20 }}>
        
        {/* Scenarios Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 12, 
          maxHeight: 460, 
          overflowY: 'auto', 
          paddingRight: 6
        }}>
          {SCENARIOS.map(s => {
            const isSelected = selectedScenario === s.id;
            return (
              <div 
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                style={{
                  background: isSelected ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff') : cardBg,
                  border: isSelected ? '1px solid #6366f1' : `1px solid ${border}`,
                  borderRadius: 12,
                  padding: 14,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 12px rgba(99,102,241,0.15)' : shadow,
                  transition: 'all 0.2s ease',
                  backdropFilter
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ 
                    fontSize: 9, 
                    padding: '2px 6px', 
                    borderRadius: 4, 
                    background: severityColor[s.severity], 
                    color: '#fff', 
                    fontWeight: 900,
                    textTransform: 'uppercase'
                  }}>
                    {s.severity}
                  </span>
                  <span style={{ fontSize: 10, color: muted, fontWeight: 600 }}>{s.category}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? '#6366f1' : text }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: muted, marginTop: 4, lineHeight: 1.4 }}>
                  {s.description}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {s.systems.map(sys => (
                    <span key={sys} style={{
                      fontSize: 8,
                      padding: '2px 5px',
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                      borderRadius: 4,
                      color: muted,
                      fontWeight: 700
                    }}>
                      {sys}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Panel */}
        <div style={{ 
          background: cardBg, 
          border: `1px solid ${border}`, 
          borderRadius: 16, 
          padding: 20, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          boxShadow: shadow,
          backdropFilter
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', marginBottom: 12 }}>
              Selected Scenario
            </div>
            
            {(() => {
              const active = SCENARIOS.find(s => s.id === selectedScenario);
              if (!active) return null;
              return (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#6366f1' }}>{active.name}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 8, lineHeight: 1.5 }}>
                    {active.description}
                  </div>
                  
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: muted }}>Scenario ID:</span>
                      <code>{active.id}</code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: muted }}>Severity:</span>
                      <span style={{ color: severityColor[active.severity], fontWeight: 800, textTransform: 'uppercase' }}>
                        {active.severity}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: muted }}>Mock Systems:</span>
                      <span style={{ fontWeight: 700 }}>{active.systems.join(', ')}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <button
            onClick={triggerSimulation}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              marginTop: 20,
              transition: 'opacity 0.2s',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Triggering...' : 'Fire Incident Scenario'}
          </button>
        </div>

      </div>

      {/* Simulator Logs Feed */}
      <div style={{ fontSize: 12, fontWeight: 800, color: muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
        Simulator Output Feed
      </div>
      
      <div style={{ 
        maxHeight: 180, 
        overflowY: 'auto', 
        background: isDark ? 'rgba(15,23,42,0.4)' : '#f1f5f9', 
        borderRadius: 12, 
        border: `1px solid ${border}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        {simulationLogs.map((log, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            fontSize: 12,
            lineHeight: 1.4,
            paddingBottom: 6,
            borderBottom: i < simulationLogs.length - 1 ? `1px solid ${border}` : 'none'
          }}>
            <div>
              <span style={{ color: '#10b981', fontWeight: 800, marginRight: 6 }}>[OK]</span>
              <span style={{ color: text, fontWeight: 600 }}>{log.message}</span>
              {log.mode === 'mock' && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 9,
                  background: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                  color: '#d97706',
                  padding: '1px 4px',
                  borderRadius: 4,
                  fontWeight: 800
                }}>
                  MOCK
                </span>
              )}
            </div>
            <span style={{ color: muted, fontSize: 10, flexShrink: 0, marginLeft: 12 }}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
