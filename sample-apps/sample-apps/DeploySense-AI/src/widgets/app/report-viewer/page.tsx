'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export default function ReportViewer() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<any>();

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#f3f4f6' : '#1f2937';
  const cardColor = isDark ? '#2d3748' : '#f9fafb';
  const borderColor = isDark ? '#4a5568' : '#e5e7eb';

  // Fallback defaults
  const defaultReport = {
    incidentId: 'INC-1025',
    summary: 'Incident INC-1025 caused by recent software deployment.',
    rootCause: 'Database connection configuration was misconfigured in the latest release, causing payment service pods to CrashLoopBackOff.',
    actions: [
      'Rollback to previous stable version immediately.',
      'Fix connection key mappings in the deployment configuration.',
      'Add automated verification tests for config parameters.'
    ],
    resolved: false
  };

  // Adapter to extract report data from both investigation tool result and report tool result
  const extractReport = () => {
    if (!rawData) return defaultReport;
    
    const data = rawData.data || rawData;
    
    // If it comes from investigateIncident tool output
    if ('rootCause' in data) {
      return {
        incidentId: data.incidentId || 'INC-1025',
        summary: `Incident ${data.incidentId || 'INC-1025'}: ${data.scenario?.name || 'Service Outage'}`,
        rootCause: data.rootCause,
        actions: data.recommendations || [],
        resolved: data.status === 'Resolved'
      };
    }

    // If it comes from report tool output
    return {
      incidentId: data.incidentId || defaultReport.incidentId,
      summary: data.summary || defaultReport.summary,
      rootCause: data.rootCause || defaultReport.rootCause,
      actions: data.actions || defaultReport.actions,
      resolved: data.resolved ?? defaultReport.resolved
    };
  };

  const report = extractReport();

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      maxWidth: '650px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${borderColor}`, paddingBottom: '12px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Incident Post-Mortem Report</h2>
        <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', padding: '4px 8px', background: '#3b82f6', color: 'white', borderRadius: '4px' }}>
          {report.incidentId}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <section>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#3b82f6', margin: '0 0 6px 0' }}>Incident Summary</h3>
          <div style={{ background: cardColor, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderColor}`, fontSize: '14px', lineHeight: '1.5' }}>
            {report.summary}
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ef4444', margin: '0 0 6px 0' }}>Root Cause Analysis (RCA)</h3>
          <div style={{ background: cardColor, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderColor}`, fontSize: '14px', lineHeight: '1.5' }}>
            {report.rootCause}
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#10b981', margin: '0 0 6px 0' }}>Recommended Mitigation Actions</h3>
          <div style={{ background: cardColor, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              {report.actions.map((action: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{action}</li>
              ))}
            </ul>
          </div>
        </section>

        <section style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Incident Status:</h3>
          <span style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            background: report.resolved ? '#d1fae5' : '#fef3c7',
            color: report.resolved ? '#065f46' : '#92400e'
          }}>
            {report.resolved ? 'RESOLVED' : 'PENDING ACTION / MITIGATING'}
          </span>
        </section>
      </div>
    </div>
  );
}
