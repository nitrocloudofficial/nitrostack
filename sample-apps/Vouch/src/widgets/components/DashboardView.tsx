'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, TrustScoreGauge, colors } from './DesignSystem';
import { PDFModal } from './PDFModal';

interface DashboardViewProps {
  onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1200px', margin: '0 auto' }}>
      <PDFModal isOpen={isPDFOpen} onClose={() => setIsPDFOpen(false)} title="Platform Executive Dashboard Report" />

      {/* Top Banner / Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFF', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Platform Executive Overview
          </h1>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Real-time reputation metrics, trust score distribution, and AI fraud monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={() => setIsPDFOpen(true)}>
            📄 Show PDF Report
          </Button>
          <Button variant="primary" size="md" onClick={() => onNavigate('business')}>
            🏢 Business Analytics →
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {/* Metric 1 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Total Verified Reviews</span>
            <Badge variant="emerald" size="sm">+14% this month</Badge>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFF', fontFamily: "'Outfit', sans-serif" }}>1,428</div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>84.6% with attached proof</div>
        </Card>

        {/* Metric 2 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Average Trust Score</span>
            <Badge variant="indigo" size="sm">Top 5% Tier</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: colors.success, fontFamily: "'Outfit', sans-serif" }}>88.4</span>
            <span style={{ fontSize: '14px', color: '#64748B' }}>/100</span>
          </div>
          <div style={{ fontSize: '12px', color: '#34D399', marginTop: '6px', fontWeight: 600 }}>Verified authentic baseline</div>
        </Card>

        {/* Metric 3 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Fraud Risk Level</span>
            <Badge variant="emerald" size="sm">Clean System</Badge>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: colors.success, fontFamily: "'Outfit', sans-serif" }}>LOW</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>0.8% Jaccard text similarity</div>
        </Card>

        {/* Metric 4 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>Active Reviewers</span>
            <Badge variant="cyan" size="sm">+48 new today</Badge>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#FFF', fontFamily: "'Outfit', sans-serif" }}>842</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>24 Truth Keepers active</div>
        </Card>
      </div>

      {/* Main Charts & Feed Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Interactive Chart Card */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: 0 }}>Trust Score & Review Velocity Trend</h3>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>30-day historical verification trajectory</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['7D', '30D', '90D', '1Y'].map((range) => (
                <button
                  key={range}
                  type="button"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: range === '30D' ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
                    background: range === '30D' ? '#4F46E5' : 'transparent',
                    color: '#FFF',
                    cursor: 'pointer',
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Area Chart Graphic */}
          <div style={{ width: '100%', height: '220px', position: 'relative', margin: '20px 0' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradientTrust" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              {/* Area Fill */}
              <path d="M0,150 Q100,120 200,80 T400,50 L500,40 L500,200 L0,200 Z" fill="url(#gradientTrust)" />
              {/* Trend Line */}
              <path d="M0,150 Q100,120 200,80 T400,50 L500,40" stroke="#38BDF8" strokeWidth="3" fill="none" />
            </svg>
          </div>
        </Card>

        {/* AI Real-time Insights Side Card */}
        <Card style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🤖</span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', margin: 0 }}>AI Neural Risk Digest</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#34D399', marginBottom: '4px' }}>✓ Zero Duplicate Clusters</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>99.2% unique semantic fingerprint across recent submissions.</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#818CF8', marginBottom: '4px' }}>⚡ Evidence Bonus Peak</div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>84.6% of reviewers attached verified receipt photos.</div>
            </div>

            <Button variant="primary" size="sm" onClick={() => onNavigate('ai-risk')}>
              🤖 Open Full AI Risk Report →
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Reviews Table Stream */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', margin: 0 }}>Recent Verified Submissions</h3>
          <Button variant="outline" size="sm" onClick={() => onNavigate('review')}>
            View All Reviews →
          </Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#CBD5E1', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Reviewer</th>
                <th style={{ padding: '12px 14px' }}>Business</th>
                <th style={{ padding: '12px 14px' }}>Rating</th>
                <th style={{ padding: '12px 14px' }}>Trust Score</th>
                <th style={{ padding: '12px 14px' }}>Evidence</th>
                <th style={{ padding: '12px 14px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Alex Chen', tier: 'Truth Keeper', biz: 'Apex Electronics', rating: 5, score: 94, proof: 'Receipt Photo' },
                { name: 'Sarah Jenkins', tier: 'Expert Reviewer', biz: 'Nexus Cloud Hosting', rating: 4, score: 88, proof: 'Invoice PDF' },
                { name: 'Marcus Vance', tier: 'Trusted Reviewer', biz: 'Volt Auto Services', rating: 5, score: 91, proof: 'Booking Confirmation' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#FFF' }}>
                    {row.name} <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 400 }}>({row.tier})</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>{row.biz}</td>
                  <td style={{ padding: '12px 14px', color: '#FBBF24' }}>{'★'.repeat(row.rating)}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: colors.success }}>{row.score}/100</td>
                  <td style={{ padding: '12px 14px' }}><Badge variant="indigo" size="sm">✓ {row.proof}</Badge></td>
                  <td style={{ padding: '12px 14px' }}>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('review')}>Inspect →</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
