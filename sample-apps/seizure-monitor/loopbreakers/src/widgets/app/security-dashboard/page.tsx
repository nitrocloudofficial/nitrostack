'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function SecurityDashboardWidget() {
  const { getToolOutput, sendFollowUpMessage, callTool } = useWidgetSDK();
  const toolData: any = getToolOutput();

  const [expandedSection, setExpandedSection] = useState<'none' | 'isolate' | 'scan' | 'ask'>('none');

  const incidentId = toolData?.incident?.id || toolData?.incidentId || 'INC-2026-8902';
  const severity = toolData?.incident?.severity || toolData?.severity || 'HIGH';
  const riskScore = toolData?.riskAssessment?.riskScore || 84;
  const isCritical = severity === 'CRITICAL' || severity === 'HIGH';

  const handleButtonClick = (type: 'isolate' | 'scan' | 'ask') => {
    if (expandedSection === type) {
      setExpandedSection('none');
    } else {
      setExpandedSection(type);
    }

    try {
      if (type === 'ask') {
        sendFollowUpMessage('Execute mandatory security isolation for auth-service');
      } else if (type === 'isolate') {
        callTool('isolate_system', { systemId: 'prod-auth-primary-01' });
      } else if (type === 'scan') {
        callTool('scan_assets', { incidentId });
      }
    } catch (e) {
      console.log('Host SDK postMessage:', type);
    }
  };

  return (
    <div style={containerStyle}>
      {/* Visual Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={badgeStyle(isCritical ? '#ef4444' : '#f59e0b')}>
            {severity} RISK
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{incidentId}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          Status: <strong style={{ color: '#ef4444' }}>INVESTIGATING</strong>
        </div>
      </div>

      {/* Main Score & Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={statBoxStyle}>
          <div style={labelStyle}>Risk Exposure</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: isCritical ? '#f43f5e' : '#f59e0b' }}>
            {riskScore}<span style={{ fontSize: '13px', color: '#64748b' }}>/100</span>
          </div>
        </div>

        <div style={statBoxStyle}>
          <div style={labelStyle}>Compromised Systems</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8' }}>
            2 <span style={{ fontSize: '13px', color: '#64748b' }}>Hosts</span>
          </div>
        </div>
      </div>

      {/* Action Recommendation Banner */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid #f43f5e', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
          Recommended Action
        </div>
        <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
          {isCritical ? 'Immediate Host Isolation Required' : 'Enforce Active Security Monitoring'}
        </div>
      </div>

      {/* Expandable Detail Panel on Button Click */}
      {expandedSection === 'isolate' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '13px', marginBottom: '4px' }}>
            🛡️ Host Isolation Plan Initiated
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Target: prod-auth-primary-01 (10.0.4.12)<br/>
            - Actions: DISCONNECT_NETWORK_INTERFACE, REVOKE_IAM_ROLE_CREDENTIALS<br/>
            - Status: Containment Active
          </div>
        </div>
      )}

      {expandedSection === 'scan' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
            📡 Infrastructure Subnet Scan
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Scanned Assets: 54 Hosts<br/>
            - Compromised: prod-auth-primary-01<br/>
            - Vulnerabilities: CVE-2024-3094, AUTH-PRIV-ESC-09
          </div>
        </div>
      )}

      {expandedSection === 'ask' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#4ade80', fontSize: '13px', marginBottom: '4px' }}>
            🤖 AI Agent Mitigation Triggered
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            Executing full security mitigation prompt... (Check AI Chat below for response)
          </div>
        </div>
      )}

      {/* Clean Quick Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => handleButtonClick('isolate')} style={btnStyle(expandedSection === 'isolate' ? '#b91c1c' : '#dc2626')}>
          {expandedSection === 'isolate' ? 'Hide Detail' : 'Isolate Host'}
        </button>
        <button onClick={() => handleButtonClick('scan')} style={btnStyle(expandedSection === 'scan' ? '#1d4ed8' : '#2563eb')}>
          {expandedSection === 'scan' ? 'Hide Scan' : 'Scan Subnet'}
        </button>
        <button onClick={() => handleButtonClick('ask')} style={btnStyle(expandedSection === 'ask' ? '#047857' : '#059669')}>
          {expandedSection === 'ask' ? 'Mitigating...' : 'Mitigate'}
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
