'use client';

import React, { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

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
}

interface IncidentList {
  incidents: Incident[];
}

const MOCK_INCIDENTS: Incident[] = [
  {
    incidentId: 'INC-1004',
    title: 'Failed Production Database Rollout',
    category: 'Deployment Failure',
    severity: 'critical',
    status: 'analyzed',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    affectedDepartments: ['engineering', 'operations'],
    affectedSystems: ['GitHub', 'Datadog'],
    trigger: 'Deploy fail on commit e92a83',
    rootCause: 'Database migrations failed to apply due to schema mismatch on user_profile table.',
    confidenceScore: 96
  },
  {
    incidentId: 'INC-1005',
    title: 'CPU Spike in Authentication Gateway',
    category: 'Infrastructure Spike',
    severity: 'high',
    status: 'investigating',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    affectedDepartments: ['engineering'],
    affectedSystems: ['Datadog'],
    trigger: 'CPU utilization exceeded 95%',
    rootCause: 'Thread pool exhaustion under sudden traffic surge.',
    confidenceScore: 85
  },
  {
    incidentId: 'INC-1006',
    title: 'Sprint Completion Delivery Risk',
    category: 'Sprint Health Alert',
    severity: 'medium',
    status: 'monitoring',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    affectedDepartments: ['engineering', 'product'],
    affectedSystems: ['Jira'],
    trigger: 'Story points remaining exceeds sprint velocity baseline',
    rootCause: 'Scope creep on feature vault integrations.',
    confidenceScore: 92
  }
];

const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6'
};

export default function ListIncidentsWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const toolOutput = getToolOutput<IncidentList>();

  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInc, setSelectedInc] = useState<string | null>(null);

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

  if (!isReady) return <div style={shellStyle}>Loading active incident command room...</div>;

  const isMock = !toolOutput;
  const incidents = toolOutput?.incidents ?? MOCK_INCIDENTS;

  const filteredIncidents = incidents.filter(inc => {
    const matchesSeverity = filterSeverity === 'all' || inc.severity === filterSeverity;
    const matchesSearch = searchQuery === '' || 
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incidentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

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
            <span style={{ fontSize: 11, letterSpacing: '1.2px', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>Incident Command</span>
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
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>Active Incidents Feed</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'critical', 'high', 'medium'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: filterSeverity === sev ? '#6366f1' : cardBg,
                color: filterSeverity === sev ? '#fff' : text,
                border: `1px solid ${filterSeverity === sev ? '#6366f1' : border}`,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: shadow
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search incidents by ID, title, or category..."
          style={{
            width: '100%',
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: text,
            outline: 'none'
          }}
        />
      </div>

      {/* Incidents List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
        {filteredIncidents.length === 0 ? (
          <div style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: muted,
            fontSize: 13,
            fontWeight: 600
          }}>
            No active incidents matching the criteria.
          </div>
        ) : (
          filteredIncidents.map(inc => {
            const isSelected = selectedInc === inc.incidentId;
            return (
              <div
                key={inc.incidentId}
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderLeft: `4px solid ${severityColors[inc.severity] || border}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  boxShadow: shadow
                }}
              >
                {/* Header Row */}
                <div
                  onClick={() => setSelectedInc(isSelected ? null : inc.incidentId)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isDark ? 'rgba(15, 23, 42, 0.2)' : '#f8fafc',
                    borderBottom: isSelected ? `1px solid ${border}` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: severityColors[inc.severity],
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 900,
                      textTransform: 'uppercase'
                    }}>
                      {inc.severity}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>
                      {inc.incidentId} : {inc.title}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                      color: muted,
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {inc.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: 12, color: muted }}>
                      {isSelected ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Details Accordion */}
                {isSelected && (
                  <div style={{
                    padding: 16,
                    fontSize: 13,
                    lineHeight: 1.5,
                    background: isDark ? '#0f172a' : '#ffffff',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                      <div>
                        <div style={{ color: muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Scope Analysis</div>
                        <div style={{ marginTop: 4 }}>
                          <b>Category:</b> {inc.category}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <b>Trigger:</b> {inc.trigger}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Impact Signals</div>
                        <div style={{ marginTop: 4 }}>
                          <b>Departments:</b> {inc.affectedDepartments.join(', ')}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <b>Systems:</b> {inc.affectedSystems.join(', ')}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      padding: 10, 
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                      borderRadius: 6,
                      border: `1px solid ${border}`,
                      marginTop: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: muted, textTransform: 'uppercase' }}>Root Cause Diagnosis</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{inc.confidenceScore}% confidence</span>
                      </div>
                      <div style={{ fontSize: 12, color: text }}>
                        {inc.rootCause}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
