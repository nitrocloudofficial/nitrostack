'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, colors } from './DesignSystem';
import { PDFModal } from './PDFModal';

interface AdminViewProps {
  onNavigate: (route: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'users' | 'logs'>('queue');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const [reports, setReports] = useState([
    { id: 'REP-9921', reviewId: 'REV-8942', business: 'Apex Electronics', reason: 'Suspected competitor spam text', status: 'pending', reporter: 'User_4920', severity: 'HIGH' },
    { id: 'REP-9922', reviewId: 'REV-7731', business: 'Nexus Cloud', reason: 'Rating & text sentiment mismatch', status: 'pending', reporter: 'User_1028', severity: 'MEDIUM' },
    { id: 'REP-9923', reviewId: 'REV-6512', business: 'Volt Auto', reason: 'Duplicate phraseology cluster flag', status: 'pending', reporter: 'AI_Scanner_v4', severity: 'HIGH' },
  ]);

  const [users, setUsers] = useState([
    { id: 'USR-101', name: 'Alex Chen', email: 'alex@vouch.mcp', role: 'consumer', tier: 'Truth Keeper', points: 1420, verified: true },
    { id: 'USR-102', name: 'Sarah Jenkins', email: 'sarah@cloudnexus.io', role: 'business', tier: 'Expert Reviewer', points: 890, verified: true },
    { id: 'USR-103', name: 'Marcus Vance', email: 'marcus@voltauto.com', role: 'moderator', tier: 'Community Guardian', points: 1150, verified: true },
    { id: 'USR-104', name: 'Elena Rostova', email: 'elena@apexelectronics.com', role: 'business', tier: 'Trusted Reviewer', points: 640, verified: true },
    { id: 'USR-105', name: 'David Kim', email: 'david@fintech.io', role: 'admin', tier: 'Truth Keeper', points: 1980, verified: true },
  ]);

  const handleResolve = (id: string, action: 'uphold' | 'dismiss') => {
    setReports(reports.filter((r) => r.id !== id));
  };

  const filteredUsers = userRoleFilter === 'all'
    ? users
    : users.filter((u) => u.role === userRoleFilter);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1240px', margin: '0 auto' }}>
      <PDFModal isOpen={isPDFOpen} onClose={() => setIsPDFOpen(false)} title="Platform Moderation & Security Audit Log" />

      {/* Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFF', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Admin & Platform Moderation Console
          </h1>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            System health monitoring, user directory, reported review queue, and audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsPDFOpen(true)}>
            📄 Show Audit PDF
          </Button>
          <Badge variant="emerald" size="md">System Operational • 100% Green</Badge>
        </div>
      </div>

      {/* System Health Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {[
          { name: 'PostgreSQL Database', status: '100% Healthy', latency: '12ms', color: colors.success },
          { name: 'NitroStack MCP Server', status: 'Active (Port 3000)', latency: '8ms', color: colors.success },
          { name: 'AI Neural Fraud Engine', status: 'v4.2 Operational', latency: '34ms', color: colors.primary },
          { name: 'Next.js Widget Engine', status: 'Active (Port 3001)', latency: '15ms', color: colors.secondary },
        ].map((sys, i) => (
          <Card key={i}>
            <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>{sys.name}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: sys.color, margin: '8px 0 4px 0' }}>{sys.status}</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Latency: {sys.latency}</div>
          </Card>
        ))}
      </div>

      {/* Main Admin Console Tabs */}
      <Card>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          {[
            { id: 'queue', label: `🚨 Flagged Moderation Queue (${reports.length})` },
            { id: 'users', label: `👥 User Directory (${users.length})` },
            { id: 'logs', label: '📋 Real-time Platform Audit Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: activeTab === tab.id ? 'rgba(79, 70, 229, 0.25)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                color: activeTab === tab.id ? '#FFFFFF' : '#94A3B8',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Flagged Queue */}
        {activeTab === 'queue' && (
          <div>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>🎉</span>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Moderation queue is clean!</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>No flagged reviews require action.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reports.map((rep) => (
                  <div key={rep.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{rep.id}</span>
                        <Badge variant="rose" size="sm">Flagged {rep.reviewId}</Badge>
                        <Badge variant="indigo" size="sm">{rep.business}</Badge>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#CBD5E1' }}>Reason: {rep.reason}</p>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>Reported by {rep.reporter} • Threat Level: {rep.severity}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button variant="danger" size="sm" onClick={() => handleResolve(rep.id, 'uphold')}>
                        Flag & Remove Review
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleResolve(rep.id, 'dismiss')}>
                        Dismiss Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users Directory */}
        {activeTab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['all', 'admin', 'moderator', 'business', 'consumer'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setUserRoleFilter(role)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: userRoleFilter === role ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
                    background: userRoleFilter === role ? '#4F46E5' : 'transparent',
                    color: '#FFF',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {role}
                </button>
              ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#CBD5E1', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px' }}>User</th>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>Role</th>
                    <th style={{ padding: '10px' }}>Badge Tier</th>
                    <th style={{ padding: '10px' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#FFF' }}>{u.name}</td>
                      <td style={{ padding: '10px', color: '#94A3B8' }}>{u.email}</td>
                      <td style={{ padding: '10px' }}><Badge variant="indigo" size="sm">{u.role}</Badge></td>
                      <td style={{ padding: '10px' }}><Badge variant="emerald" size="sm">🏅 {u.tier}</Badge></td>
                      <td style={{ padding: '10px', fontWeight: 700, color: colors.success }}>{u.points} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Real-time Audit Logs */}
        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#CBD5E1' }}>
            {[
              { time: '1 min ago', type: 'SECURITY', msg: 'Admin Alex Chen authorized system audit check' },
              { time: '5 mins ago', type: 'MCP_TOOL', msg: 'Executed reviews_submit for review #REV-8942' },
              { time: '12 mins ago', type: 'AI_SCAN', msg: 'Jaccard similarity scan cleared Apex Electronics Store' },
              { time: '25 mins ago', type: 'AUTH', msg: 'User Sarah Jenkins logged in via JWT' },
              { time: '1 hour ago', type: 'REPUTATION', msg: 'Awarded +30 points to Alex Chen for receipt proof' },
            ].map((log, idx) => (
              <div key={idx} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ color: colors.secondary, fontWeight: 700, marginRight: '8px' }}>[{log.type}]</span>
                  <span>{log.msg}</span>
                </div>
                <span style={{ color: '#64748B' }}>{log.time}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
