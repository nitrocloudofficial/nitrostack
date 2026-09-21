'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, TrustScoreGauge, colors } from './DesignSystem';
import { PDFModal } from './PDFModal';

interface BusinessDashboardViewProps {
  onNavigate: (route: string) => void;
}

export const BusinessDashboardView: React.FC<BusinessDashboardViewProps> = ({ onNavigate }) => {
  const [selectedBizId, setSelectedBizId] = useState('apex');
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'fraud' | 'sentiment'>('overview');
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  const businesses = {
    apex: {
      name: 'Apex Electronics Store',
      category: 'Consumer Tech & Hardware',
      avgTrustScore: 94,
      totalReviews: 142,
      fraudRisk: 'LOW',
      claimed: true,
      satisfaction: '4.9★',
      evidenceRatio: '84.6%',
      growthRate: '+18% MoM',
      reviews: [
        { author: 'Alex Chen', tier: 'Truth Keeper', score: 94, rating: 5, date: '2 hours ago', text: 'Purchased the flagship pro model last Tuesday. Delivery was super fast, customer care responded within 5 minutes!', proof: 'Receipt Photo Attached' },
        { author: 'Elena Rostova', tier: 'Expert Reviewer', score: 91, rating: 5, date: '1 day ago', text: 'Solid build quality. Verified specs match claims exactly.', proof: 'Invoice PDF Verified' },
        { author: 'David Kim', tier: 'Trusted Reviewer', score: 88, rating: 4, date: '3 days ago', text: 'Great device, though shipping box had minor dent.', proof: 'Booking Proof' },
      ],
      love: ['Lightning-fast 24h shipping', 'Responsive 24/7 support team', 'Verified authentic hardware specs'],
      dislike: ['High international shipping fees', 'Small manual font size'],
    },
    nexus: {
      name: 'Nexus Cloud Infrastructure',
      category: 'SaaS & Cloud Services',
      avgTrustScore: 91,
      totalReviews: 98,
      fraudRisk: 'LOW',
      claimed: true,
      satisfaction: '4.8★',
      evidenceRatio: '92.1%',
      growthRate: '+24% MoM',
      reviews: [
        { author: 'Sarah Jenkins', tier: 'Expert Reviewer', score: 96, rating: 5, date: '5 hours ago', text: 'Migrated 40 microservices with zero downtime. SLA guarantee held 100%.', proof: 'Contract SLA Verified' },
        { author: 'Michael Brown', tier: 'Trusted Reviewer', score: 89, rating: 4, date: '2 days ago', text: 'API response times under 20ms. Dashboard UI is sleek.', proof: 'Usage Receipt' },
      ],
      love: ['99.99% Uptime guarantee verified', 'Instant API provisioning', 'Comprehensive docs'],
      dislike: ['Egress bandwidth pricing model'],
    },
    volt: {
      name: 'Volt Auto Services',
      category: 'Automotive & EV Repair',
      avgTrustScore: 88,
      totalReviews: 210,
      fraudRisk: 'LOW',
      claimed: true,
      satisfaction: '4.7★',
      evidenceRatio: '79.3%',
      growthRate: '+12% MoM',
      reviews: [
        { author: 'Marcus Vance', tier: 'Community Guardian', score: 92, rating: 5, date: '6 hours ago', text: 'EV battery diagnostics completed in under 1 hour. Transparent pricing receipt.', proof: 'Work Order Attached' },
      ],
      love: ['Transparent diagnostic receipt', 'Certified EV technicians', 'Free loaner vehicle'],
      dislike: ['Weekend booking queue delay'],
    },
    horizon: {
      name: 'Horizon Pay Systems',
      category: 'Fintech & Payment Gateway',
      avgTrustScore: 96,
      totalReviews: 315,
      fraudRisk: 'LOW',
      claimed: true,
      satisfaction: '4.9★',
      evidenceRatio: '95.2%',
      growthRate: '+31% MoM',
      reviews: [
        { author: 'Rachel Zhao', tier: 'Truth Keeper', score: 98, rating: 5, date: '3 hours ago', text: 'Global payouts settled in 2 seconds flat. Webhooks are rock solid.', proof: 'Merchant Statement' },
      ],
      love: ['Sub-second settlement speeds', 'Low transaction fee tiers', 'PCI-DSS Compliance'],
      dislike: ['Stricter KYC onboarding checks'],
    },
  };

  const currentBiz = businesses[selectedBizId as keyof typeof businesses];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1240px', margin: '0 auto' }}>
      <PDFModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        title={`${currentBiz.name} — Full Merchant Reputation Audit`}
        businessName={currentBiz.name}
        trustScore={currentBiz.avgTrustScore}
      />

      {/* Business Selector Header Bar */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '12px 20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Select Merchant Sample:</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'apex', name: 'Apex Electronics' },
              { id: 'nexus', name: 'Nexus Cloud' },
              { id: 'volt', name: 'Volt Auto' },
              { id: 'horizon', name: 'Horizon Pay' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBizId(b.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: selectedBizId === b.id ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
                  background: selectedBizId === b.id ? '#4F46E5' : 'rgba(255,255,255,0.04)',
                  color: '#FFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsPDFOpen(true)}>
            📄 Show PDF Report
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('ai-risk')}>
            🤖 AI Fraud Audit →
          </Button>
        </div>
      </div>

      {/* Main Merchant Overview Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '28px' }}>🏢</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFF', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              {currentBiz.name}
            </h1>
            <Badge variant="indigo" size="sm">✓ Claimed Business</Badge>
          </div>
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>
            {currentBiz.category} • {currentBiz.totalReviews} Verified Reviews • Growth: <span style={{ color: colors.success, fontWeight: 700 }}>{currentBiz.growthRate}</span>
          </p>
        </div>

        <TrustScoreGauge score={currentBiz.avgTrustScore} size={90} />
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <Card>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Avg Trust Score</span>
          <div style={{ fontSize: '42px', fontWeight: 800, color: colors.success, margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
            {currentBiz.avgTrustScore}
          </div>
          <span style={{ fontSize: '12px', color: '#34D399' }}>Top tier verified vendor reputation</span>
        </Card>

        <Card>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Automated Fraud Risk</span>
          <div style={{ fontSize: '42px', fontWeight: 800, color: colors.success, margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
            {currentBiz.fraudRisk}
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>0 velocity anomalies detected</span>
        </Card>

        <Card>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Evidence Proof Ratio</span>
          <div style={{ fontSize: '42px', fontWeight: 800, color: colors.secondary, margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
            {currentBiz.evidenceRatio}
          </div>
          <span style={{ fontSize: '12px', color: '#818CF8' }}>Attached receipts & invoice files</span>
        </Card>

        <Card>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Customer Satisfaction</span>
          <div style={{ fontSize: '42px', fontWeight: 800, color: colors.warning, margin: '6px 0', fontFamily: "'Outfit', sans-serif" }}>
            {currentBiz.satisfaction}
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Based on {currentBiz.totalReviews} reviews</span>
        </Card>
      </div>

      {/* Main Tabbed Analytics Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <Card>
          {/* Sub Navigation */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            {[
              { id: 'overview', label: '📊 Rating Breakdown' },
              { id: 'reviews', label: '💬 Verified Reviews Stream' },
              { id: 'fraud', label: '🛡️ Fraud Risk Signals' },
              { id: 'sentiment', label: '🧠 AI Sentiment Trends' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: activeTab === tab.id ? 'rgba(79, 70, 229, 0.25)' : 'transparent',
                  border: activeTab === tab.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#94A3B8',
                  padding: '8px 14px',
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

          {activeTab === 'overview' && (
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginBottom: '16px' }}>Rating & Proof Distribution</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { stars: 5, pct: 78, color: colors.success },
                  { stars: 4, pct: 14, color: colors.secondary },
                  { stars: 3, pct: 5, color: colors.warning },
                  { stars: 2, pct: 2, color: '#F97316' },
                  { stars: 1, pct: 1, color: colors.danger },
                ].map((row) => (
                  <div key={row.stars} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                    <span style={{ width: '40px', color: '#CBD5E1', fontWeight: 600 }}>{row.stars} ★</span>
                    <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '4px' }} />
                    </div>
                    <span style={{ width: '50px', textAlign: 'right', color: '#94A3B8' }}>{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {currentBiz.reviews.map((rev, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{rev.author}</span>
                      <span style={{ fontSize: '11px', color: '#818CF8', marginLeft: '6px' }}>({rev.tier})</span>
                    </div>
                    <Badge variant="emerald" size="sm">Score: {rev.score}/100</Badge>
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#CBD5E1', lineHeight: '1.5' }}>"{rev.text}"</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
                    <Badge variant="indigo" size="sm">✓ {rev.proof}</Badge>
                    <span>{rev.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fraud' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: '#34D399' }}>✓ Velocity Check: PASS</span>
                <p style={{ margin: '4px 0 0 0', color: '#CBD5E1', fontSize: '12px' }}>1.4 reviews/day is within expected baseline.</p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: '#34D399' }}>✓ Duplicate NLP Text Check: PASS</span>
                <p style={{ margin: '4px 0 0 0', color: '#CBD5E1', fontSize: '12px' }}>99.2% unique semantic text structure.</p>
              </div>
            </div>
          )}

          {activeTab === 'sentiment' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#34D399' }}>💚 What Customers Love</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6' }}>
                  {currentBiz.love.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#F87171' }}>💔 Customer Complaints</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#CBD5E1', lineHeight: '1.6' }}>
                  {currentBiz.dislike.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* Right Side: AI Executive Action Recommendations */}
        <Card style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🤖</span> AI Executive Digest
          </h3>

          <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#CBD5E1', lineHeight: '1.7' }}>
            <li>Maintain receipt evidence bonus (+30 pts) to keep high proof ratio.</li>
            <li>Address customer complaints in support FAQs.</li>
            <li>Highlight top verified reviews on landing page widget.</li>
          </ol>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={() => onNavigate('ai-risk')}>
              🤖 Generate Full AI Risk Report →
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsPDFOpen(true)}>
              📄 View Official PDF Audit →
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
