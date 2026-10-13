'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function EnterpriseDecisionCenterWidget() {
  const { getToolOutput, sendFollowUpMessage, callTool } = useWidgetSDK();
  const toolData: any = getToolOutput();

  const [expandedSection, setExpandedSection] = useState<'none' | 'proposals' | 'conflicts' | 'priority' | 'decision'>('none');
  const [approvedState, setApprovedState] = useState<boolean>(false);

  const incidentId = toolData?.incidentId || toolData?.decision?.incidentId || 'INC-2026-8902';
  const decisionStatus = approvedState ? 'APPROVED_IN_PRODUCTION' : (toolData?.decision?.status || 'DECISION_READY');

  const handleApproveDecision = () => {
    setApprovedState(true);
    try {
      sendFollowUpMessage(`Execute approved arbitration decision for ${incidentId}: Isolate prod-auth-primary-01 and file 72h GDPR DPA report.`);
    } catch (e) {
      console.log('Approve Decision triggered:', incidentId);
    }
  };

  const handleButtonClick = (type: 'proposals' | 'conflicts' | 'priority' | 'decision') => {
    if (expandedSection === type) {
      setExpandedSection('none');
    } else {
      setExpandedSection(type);
    }

    try {
      if (type === 'proposals') {
        callTool('collect_proposals', { incidentId });
      } else if (type === 'conflicts') {
        callTool('resolve_conflicts', { incidentId });
      } else if (type === 'priority') {
        callTool('prioritize_actions', { incidentId });
      } else if (type === 'decision') {
        callTool('generate_final_decision', { incidentId });
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
          <span style={badgeStyle(approvedState ? '#22c55e' : '#38bdf8')}>
            {approvedState ? '✓ APPROVED' : decisionStatus}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{incidentId}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          Engine: <strong style={{ color: '#a855f7' }}>Arbitration Decision Engine</strong>
        </div>
      </div>

      {/* Multi-MCP Recommendations Panel */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
          Multi-MCP Organizational Consensus
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          <div style={{ color: '#4ade80' }}>✓ <strong>Security MCP:</strong> Isolate Authentication Server (prod-auth-primary-01)</div>
          <div style={{ color: '#38bdf8' }}>✓ <strong>Compliance MCP:</strong> Generate & File 72h GDPR DPA Report</div>
          <div style={{ color: '#fbbf24' }}>⏳ <strong>Mail MCP:</strong> Delay Customer Notification until forensic verification</div>
        </div>
      </div>

      {/* Primary Decision Banner */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid #a855f7', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
          Arbitration Decision Rationale
        </div>
        <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 500, marginTop: '2px', lineHeight: '1.4' }}>
          {toolData?.decision?.decisionRationale || 'Technical isolation halts active threat exfiltration while satisfying 72-hour GDPR mandates. Public advisory held pending SOC verification.'}
        </div>
      </div>

      {/* Expandable Detailed Views on Click */}
      {expandedSection === 'proposals' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
            📥 Aggregated MCP Proposals
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - SecurityMCP: URGENT (Quarantine host prod-auth-primary-01)<br/>
            - ComplianceMCP: URGENT (File 72h GDPR DPA notification)<br/>
            - MailMCP: HIGH (Notify Execs & SOC; hold public notice)
          </div>
        </div>
      )}

      {expandedSection === 'conflicts' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '13px', marginBottom: '4px' }}>
            ⚖️ Conflict Resolution Analysis
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Resolved: Approved immediate host quarantine.<br/>
            - Communication Policy: Public advisory delayed 4 hours to verify network containment.
          </div>
        </div>
      )}

      {expandedSection === 'priority' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#a855f7', fontSize: '13px', marginBottom: '4px' }}>
            ⚡ Action Priority Timeline
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            1. Host Isolation (Immediate)<br/>
            2. SOC Team Alert (High)<br/>
            3. 72h GDPR DPA Report (High)<br/>
            4. Executive Briefing (Medium)
          </div>
        </div>
      )}

      {expandedSection === 'decision' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#4ade80', fontSize: '13px', marginBottom: '4px' }}>
            📜 Official Decision Summary
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Decision ID: DEC-{incidentId}<br/>
            - Approved: 4 Critical Actions<br/>
            - Approved By: ArbitrationEngine-AutoApproval
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={handleApproveDecision}
          style={{
            width: '100%',
            backgroundColor: approvedState ? '#15803d' : '#9333ea',
            color: '#ffffff',
            border: 'none',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
          }}
        >
          {approvedState ? '✓ DECISION APPROVED & EXECUTED' : '✓ APPROVE DECISION'}
        </button>
      </div>

      {/* Quick Action Navigation */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={() => handleButtonClick('proposals')} style={btnStyle(expandedSection === 'proposals' ? '#1d4ed8' : '#2563eb')}>
          {expandedSection === 'proposals' ? 'Hide Proposals' : 'Proposals'}
        </button>
        <button onClick={() => handleButtonClick('conflicts')} style={btnStyle(expandedSection === 'conflicts' ? '#b45309' : '#d97706')}>
          {expandedSection === 'conflicts' ? 'Hide Conflicts' : 'Conflicts'}
        </button>
        <button onClick={() => handleButtonClick('priority')} style={btnStyle(expandedSection === 'priority' ? '#6b21a8' : '#7c3aed')}>
          {expandedSection === 'priority' ? 'Hide Priority' : 'Priority'}
        </button>
        <button onClick={() => handleButtonClick('decision')} style={btnStyle(expandedSection === 'decision' ? '#047857' : '#059669')}>
          {expandedSection === 'decision' ? 'Hide Decision' : 'Decision'}
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
