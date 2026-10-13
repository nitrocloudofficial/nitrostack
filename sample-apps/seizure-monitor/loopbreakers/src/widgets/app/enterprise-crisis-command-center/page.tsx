'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function EnterpriseCrisisCommandCenterWidget() {
  const { getToolOutput, sendFollowUpMessage, callTool } = useWidgetSDK();
  const toolData: any = getToolOutput();

  const [expandedSection, setExpandedSection] = useState<'none' | 'timeline' | 'reports' | 'exec' | 'closed'>('none');
  const [isClosed, setIsClosed] = useState<boolean>(toolData?.closureReport ? true : false);

  const incidentId = toolData?.incidentId || toolData?.executiveDashboard?.incidentId || toolData?.closureReport?.incidentId || 'INC-2026-8902';
  const overallStatus = isClosed ? 'RESOLVED_CLOSED' : (toolData?.overallStatus || 'CRISIS_RESPONSE_COMPLETED');

  const handleCloseIncident = () => {
    setIsClosed(true);
    setExpandedSection('closed');
    try {
      callTool('close_incident', { incidentId });
    } catch (e) {
      console.log('Close Incident triggered:', incidentId);
    }
  };

  const handleButtonClick = (type: 'timeline' | 'reports' | 'exec' | 'closed') => {
    if (expandedSection === type) {
      setExpandedSection('none');
    } else {
      setExpandedSection(type);
    }

    try {
      if (type === 'exec') {
        callTool('generate_executive_dashboard', { incidentId });
      } else if (type === 'reports') {
        callTool('orchestrate_workflow', { incidentId });
      } else if (type === 'closed') {
        handleCloseIncident();
      }
    } catch (e) {
      console.log('Host SDK postMessage:', type);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={badgeStyle(isClosed ? '#64748b' : '#22c55e')}>
            {isClosed ? '✓ RESOLVED & CLOSED' : '🟢 RESPONSE COMPLETED'}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{incidentId}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          Orchestrator: <strong style={{ color: '#38bdf8' }}>Coordinator MCP</strong>
        </div>
      </div>

      {/* Live MCP Pipeline Progress Indicators */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '8px' }}>
          MCP Pipeline Progress Indicators
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
          <div style={progressBoxStyle}>
            <span style={{ color: '#94a3b8' }}>Security</span>
            <strong style={{ color: '#4ade80' }}>✅ Completed</strong>
          </div>
          <div style={progressBoxStyle}>
            <span style={{ color: '#94a3b8' }}>Compliance</span>
            <strong style={{ color: '#4ade80' }}>✅ Completed</strong>
          </div>
          <div style={progressBoxStyle}>
            <span style={{ color: '#94a3b8' }}>Mail</span>
            <strong style={{ color: '#4ade80' }}>✅ Completed</strong>
          </div>
          <div style={progressBoxStyle}>
            <span style={{ color: '#94a3b8' }}>Arbitration</span>
            <strong style={{ color: '#4ade80' }}>✅ Completed</strong>
          </div>
        </div>
      </div>

      {/* Executive Summary Banner */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid #22c55e', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
          Executive Crisis Summary
        </div>
        <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 500, marginTop: '2px', lineHeight: '1.4' }}>
          {toolData?.consolidatedResponse?.approvedActions?.[0] || 'Technical host isolation executed; 72-hour GDPR breach filing submitted; Executive and SOC advisories dispatched.'}
        </div>
      </div>

      {/* Expandable Detailed Views on Click */}
      {expandedSection === 'timeline' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
            ⏱️ Incident Response Timeline
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - 04:12: Initial C2 connection detected on port 8443<br/>
            - 04:15: Security MCP raised CRITICAL alert INC-2026-8902<br/>
            - 04:18: Compliance MCP generated 72h DPA breach filing<br/>
            - 04:20: Arbitration MCP approved host isolation & SOC alert<br/>
            - 04:25: Coordinator MCP finalized response workflow
          </div>
        </div>
      )}

      {expandedSection === 'reports' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#4ade80', fontSize: '13px', marginBottom: '4px' }}>
            📊 Consolidated Multi-MCP Report
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Threat Level: HIGH_CONTAINED<br/>
            - GDPR Status: 72H DPA Timer Active<br/>
            - Dispatches: 3 Channel Groups Dispatched (Exec, SOC, Advisory)<br/>
            - Final Decision: DEC-INC-2026-8902 Approved
          </div>
        </div>
      )}

      {expandedSection === 'exec' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#a855f7', fontSize: '13px', marginBottom: '4px' }}>
            👔 C-Suite Executive Overview
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Business Impact: ELEVATED_RISK_CONTAINED<br/>
            - Financial Exposure: $125,000 - $450,000 (Covered)<br/>
            - Recommended Next Steps: Apply CVE-2024-3094 security patch
          </div>
        </div>
      )}

      {expandedSection === 'closed' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '13px', marginBottom: '4px' }}>
            📝 Post-Incident Review (PIR) & Lessons Learned
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Status: Incident Formally Closed<br/>
            - Lessons Learned:<br/>
            &nbsp;&nbsp;1. Enforce strict SSH key rotation across auth clusters<br/>
            &nbsp;&nbsp;2. Shorten automated DPA draft SLA to &lt; 1 hour<br/>
            &nbsp;&nbsp;3. Implement automated RAM memory dump capture
          </div>
        </div>
      )}

      {/* Action Toolbar Buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => handleButtonClick('timeline')} style={btnStyle(expandedSection === 'timeline' ? '#1d4ed8' : '#2563eb')}>
          {expandedSection === 'timeline' ? 'Hide Timeline' : 'View Timeline'}
        </button>
        <button onClick={() => handleButtonClick('reports')} style={btnStyle(expandedSection === 'reports' ? '#047857' : '#059669')}>
          {expandedSection === 'reports' ? 'Hide Reports' : 'View Reports'}
        </button>
        <button onClick={() => handleButtonClick('exec')} style={btnStyle(expandedSection === 'exec' ? '#6b21a8' : '#7c3aed')}>
          {expandedSection === 'exec' ? 'Hide Exec' : 'Exec Report'}
        </button>
        <button onClick={() => handleButtonClick('closed')} style={btnStyle(isClosed ? '#475569' : '#dc2626')}>
          {isClosed ? 'Closed' : 'Close Incident'}
        </button>
      </div>
    </div>
  );
}

// Minimal Clean Styling
const containerStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '12px',
  border: '1px solid #1e293b',
  padding: '14px',
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#f8fafc',
};

const badgeStyle = (bg: string): React.CSSProperties => ({
  backgroundColor: bg,
  color: '#fff',
  fontSize: '11px',
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: '4px',
});

const progressBoxStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#0f172a',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #334155',
};

const detailBoxStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '10px 12px',
  marginBottom: '12px',
};

const btnStyle = (bg: string): React.CSSProperties => ({
  backgroundColor: bg,
  color: '#fff',
  border: 'none',
  padding: '8px 6px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  flex: 1,
});
