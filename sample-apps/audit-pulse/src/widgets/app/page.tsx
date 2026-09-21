import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🚀 AuditPulse Control Center</h1>
      <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginBottom: '40px' }}>
        Omni-Channel Enterprise Audit & Governance Agent
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* FinOps Link */}
        <Link href="/finops-dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '30px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <h2 style={{ color: '#60a5fa', margin: '0 0 10px 0' }}>💰 FinOps & ML</h2>
            <p style={{ color: '#cbd5e1', margin: 0 }}>View live API usage and Isolation Forest anomaly detection.</p>
          </div>
        </Link>

        {/* Security Link */}
        <Link href="/security-dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '30px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <h2 style={{ color: '#10b981', margin: '0 0 10px 0' }}>🛡️ IAM Security</h2>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Monitor ghost accounts and auto-remediation triggers.</p>
          </div>
        </Link>

        {/* Telemetry Link */}
        <Link href="/telemetry-dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '30px', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <h2 style={{ color: '#a78bfa', margin: '0 0 10px 0' }}>⚙️ Agent Telemetry</h2>
            <p style={{ color: '#cbd5e1', margin: 0 }}>Track system health and hunt for Shadow AI connections.</p>
          </div>
        </Link>

      </div>
    </div>
  );
}
