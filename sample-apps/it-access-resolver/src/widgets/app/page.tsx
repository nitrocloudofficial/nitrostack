'use client';

import React from 'react';

export default function RootPortalPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ maxWidth: 800, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎫</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          IT Access Resolver Portal
        </h1>
        <p style={{ fontSize: 16, color: '#94a3b8', margin: '0 0 32px 0' }}>
          Agentic AI IT Service Management powered by Model Context Protocol (MCP)
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 40,
        }}>
          <a href="/ticket-dashboard" style={cardStyle}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <h3 style={cardTitleStyle}>Ticket Dashboard</h3>
            <p style={cardDescStyle}>Live enterprise ticket backlog with filtering, status tracking, and ticket creation modal.</p>
          </a>

          <a href="/ticket-diagnosis" style={cardStyle}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <h3 style={cardTitleStyle}>Diagnostic Stepper</h3>
            <p style={cardDescStyle}>Real-time 4-pillar diagnostic scorecard and automated self-healing action panel.</p>
          </a>

          <a href="/helpdesk-analytics" style={cardStyle}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <h3 style={cardTitleStyle}>Executive Analytics</h3>
            <p style={cardDescStyle}>Real-time KPIs, MTTR tracking, auto-fix rate, SLA breaches, and incident heatmap.</p>
          </a>
        </div>

        <div style={{
          padding: 24,
          borderRadius: 16,
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'left',
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#6366f1', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ How to use with NitroStack Studio
          </h4>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 13, lineHeight: 1.8 }}>
            <li>Open <strong><a href="https://nitrostack.ai/studio" target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>https://nitrostack.ai/studio</a></strong> in Chrome.</li>
            <li>Ensure status indicates <strong>Connected (STDIO)</strong>.</li>
            <li>Execute tools like <code>ticket_get_all_tickets</code>, <code>ticket_run_full_diagnosis</code>, or <code>ticket_get_helpdesk_analytics</code>.</li>
            <li>Studio will automatically render these interactive widgets inside the studio workspace!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  background: '#1e293b',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#f8fafc',
  textDecoration: 'none',
  textAlign: 'left',
  transition: 'transform 0.2s ease, border-color 0.2s ease',
  display: 'block',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  margin: '0 0 8px 0',
  color: '#f1f5f9',
};

const cardDescStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  margin: 0,
  lineHeight: 1.5,
};
