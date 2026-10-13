'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function ComplianceDashboardWidget() {
  const { getToolOutput, sendFollowUpMessage, callTool } = useWidgetSDK();
  const toolData: any = getToolOutput();

  const [expandedSection, setExpandedSection] = useState<'none' | 'gdpr' | 'report' | 'draft'>('none');

  const incidentId = toolData?.incidentId || 'INC-2026-8902';
  const status = toolData?.gdprAssessment?.complianceStatus || 'ACTION_REQUIRED';
  const isActionRequired = status === 'ACTION_REQUIRED' || status === 'AT_RISK';

  const handleButtonClick = (type: 'gdpr' | 'report' | 'draft') => {
    // Toggle expandable detail panel inside widget
    if (expandedSection === type) {
      setExpandedSection('none');
    } else {
      setExpandedSection(type);
    }

    // Try calling host SDK actions
    try {
      if (type === 'draft') {
        sendFollowUpMessage('Draft formal 72-hour GDPR DPA breach notification report for INC-2026-8902');
      } else if (type === 'gdpr') {
        callTool('check_gdpr', { incidentId, containsPersonalData: true });
      } else if (type === 'report') {
        callTool('generate_compliance_report', { incidentId });
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
          <span style={badgeStyle(isActionRequired ? '#ef4444' : '#22c55e')}>
            {isActionRequired ? 'ACTION REQUIRED' : 'COMPLIANT'}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{incidentId}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          Framework: <strong style={{ color: '#38bdf8' }}>EU GDPR</strong>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={statBoxStyle}>
          <div style={labelStyle}>DPA Report Timer</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
            72 <span style={{ fontSize: '13px', color: '#64748b' }}>Hours</span>
          </div>
        </div>

        <div style={statBoxStyle}>
          <div style={labelStyle}>Personal PII Data</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444' }}>
            Exposed
          </div>
        </div>
      </div>

      {/* Primary Requirement Banner */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid #ef4444', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
          Mandatory Legal Requirement
        </div>
        <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
          File Formal Data Protection Authority (DPA) Breach Notice
        </div>
      </div>

      {/* Expandable Detailed Views on Click */}
      {expandedSection === 'gdpr' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '13px', marginBottom: '4px' }}>
            🔍 GDPR Article 33 Breach Assessment
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Personal PII Data Exposed: Yes (User Session Caches)<br/>
            - 72-Hour DPA Deadline: 72 Hours remaining<br/>
            - Customer Breach Notice: Required under Article 34
          </div>
        </div>
      )}

      {expandedSection === 'report' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
            📊 Compliance Report Summary
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Overall Status: AT_RISK<br/>
            - Regulations Affected: GDPR (EU), ISO 27001, NIS2<br/>
            - Required Docs: Form COMP-101, DPIA-2026, NCR-8902
          </div>
        </div>
      )}

      {expandedSection === 'draft' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#4ade80', fontSize: '13px', marginBottom: '4px' }}>
            ✍️ Draft DPA Breach Notice Triggered
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            Generating formal notification for DPA submission... (Check AI Chat below for response)
          </div>
        </div>
      )}

      {/* Clean Quick Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <button onClick={() => handleButtonClick('gdpr')} style={btnStyle(expandedSection === 'gdpr' ? '#b91c1c' : '#dc2626')}>
          {expandedSection === 'gdpr' ? 'Hide GDPR' : 'Re-Check GDPR'}
        </button>
        <button onClick={() => handleButtonClick('report')} style={btnStyle(expandedSection === 'report' ? '#1d4ed8' : '#2563eb')}>
          {expandedSection === 'report' ? 'Hide Report' : 'Gen Report'}
        </button>
        <button onClick={() => handleButtonClick('draft')} style={btnStyle(expandedSection === 'draft' ? '#047857' : '#059669')}>
          {expandedSection === 'draft' ? 'Drafting...' : 'Draft Notice'}
        </button>
      </div>
    </div>
  );
}

// Minimal Styling
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

const statBoxStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  padding: '10px 12px',
  border: '1px solid #334155',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.5px',
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
  padding: '8px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  flex: 1,
});
