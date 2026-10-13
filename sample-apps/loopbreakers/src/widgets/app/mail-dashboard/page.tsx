'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

export default function MailDashboardWidget() {
  const { getToolOutput, sendFollowUpMessage, callTool } = useWidgetSDK();
  const toolData: any = getToolOutput();

  const [expandedSection, setExpandedSection] = useState<'none' | 'exec' | 'soc' | 'customer' | 'summary'>('none');

  const incidentId = toolData?.notification?.subject?.match(/INC-\d+-\d+/)?.[0] || toolData?.summary?.incidentId || 'INC-2026-8902';
  const deliveryStatus = toolData?.notification?.status || 'SENT';

  const handleButtonClick = (type: 'exec' | 'soc' | 'customer' | 'summary') => {
    if (expandedSection === type) {
      setExpandedSection('none');
    } else {
      setExpandedSection(type);
    }

    try {
      if (type === 'exec') {
        callTool('notify_management', { incidentId });
      } else if (type === 'soc') {
        callTool('notify_it_team', { incidentId });
      } else if (type === 'customer') {
        callTool('send_customer_notification', { incidentId });
      } else if (type === 'summary') {
        callTool('generate_incident_summary', { incidentId });
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
          <span style={badgeStyle('#22c55e')}>
            {deliveryStatus}
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{incidentId}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
          Channel: <strong style={{ color: '#38bdf8' }}>Enterprise Mail & Dispatch</strong>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={statBoxStyle}>
          <div style={labelStyle}>Recipients Dispatched</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8' }}>
            3 <span style={{ fontSize: '13px', color: '#64748b' }}>Groups</span>
          </div>
        </div>

        <div style={statBoxStyle}>
          <div style={labelStyle}>Delivery Status</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#22c55e' }}>
            100%
          </div>
        </div>
      </div>

      {/* Primary Requirement Banner */}
      <div style={{ backgroundColor: '#1e293b', padding: '10px 12px', borderRadius: '8px', borderLeft: '4px solid #22c55e', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
          Active Communication Dispatch
        </div>
        <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>
          {toolData?.notification?.subject || 'Executive Briefing & SOC Operations Dispatch Complete'}
        </div>
      </div>

      {/* Expandable Detailed Views on Click */}
      {expandedSection === 'exec' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
            👔 Executive Briefing Notice
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - To: executive-briefing@enterprise.internal<br/>
            - Impact: ELEVATED_RISK_CONTAINED<br/>
            - Actions: Emergency cyber budget & PR statement authorized
          </div>
        </div>
      )}

      {expandedSection === 'soc' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '13px', marginBottom: '4px' }}>
            🛠️ SOC Operations Dispatch
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - To: soc-ops@enterprise.internal<br/>
            - Target: prod-auth-primary-01 (10.0.4.12)<br/>
            - Vector: CVE-2024-3094 SSH Tunnel RCE
          </div>
        </div>
      )}

      {expandedSection === 'customer' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '13px', marginBottom: '4px' }}>
            📢 Customer Service Advisory
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - To: all-customers@service-advisory.org<br/>
            - Message: Precautionary maintenance on Single Sign-On Portal<br/>
            - Impact: Low (Re-authentication required)
          </div>
        </div>
      )}

      {expandedSection === 'summary' && (
        <div style={detailBoxStyle}>
          <div style={{ fontWeight: 600, color: '#4ade80', fontSize: '13px', marginBottom: '4px' }}>
            📋 Structured Incident Summary
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
            - Incident Type: UNAUTHORIZED_ACCESS (HIGH)<br/>
            - Affected: auth-primary-01, auth-secondary-02, redis-session-store<br/>
            - Next Steps: Arbitration decision & patch deployment
          </div>
        </div>
      )}

      {/* Clean Quick Action Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        <button onClick={() => handleButtonClick('exec')} style={btnStyle(expandedSection === 'exec' ? '#1d4ed8' : '#2563eb')}>
          {expandedSection === 'exec' ? 'Hide Exec' : 'Notify Execs'}
        </button>
        <button onClick={() => handleButtonClick('soc')} style={btnStyle(expandedSection === 'soc' ? '#b91c1c' : '#dc2626')}>
          {expandedSection === 'soc' ? 'Hide SOC' : 'Notify SOC'}
        </button>
        <button onClick={() => handleButtonClick('customer')} style={btnStyle(expandedSection === 'customer' ? '#b45309' : '#d97706')}>
          {expandedSection === 'customer' ? 'Hide Advisory' : 'Notify Users'}
        </button>
        <button onClick={() => handleButtonClick('summary')} style={btnStyle(expandedSection === 'summary' ? '#047857' : '#059669')}>
          {expandedSection === 'summary' ? 'Hide Summary' : 'Gen Summary'}
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
  padding: '8px 6px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  flex: 1,
});
