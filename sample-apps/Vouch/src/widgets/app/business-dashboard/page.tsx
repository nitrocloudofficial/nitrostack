'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface BusinessDashboardData {
  business_id?: string;
  name?: string;
  category?: string;
  avg_trust_score?: number;
  total_reviews?: number;
  fraud_risk?: 'low' | 'medium' | 'high';
  ai_summary?: {
    positive_themes?: string[];
    negative_themes?: string[];
  };
}

interface BusinessDashboardProps {
  onGenerateReport?: () => void;
}

export default function BusinessDashboardWidget({ onGenerateReport }: BusinessDashboardProps = {}) {
  const { isReady, getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const rawData = getToolOutput<BusinessDashboardData>();

  const business = {
    name: rawData?.name || 'Apex Electronics Store',
    category: rawData?.category || 'Consumer Tech & Hardware',
    avgTrustScore: rawData?.avg_trust_score || 88,
    totalReviews: rawData?.total_reviews || 142,
    fraudRisk: rawData?.fraud_risk || 'low',
    claimed: true,
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'fraud' | 'ai'>('overview');

  const getFraudColor = (risk: string) => {
    if (risk === 'low') return { color: '#10b981', label: 'Low Fraud Risk (Clean)', bg: 'rgba(16, 185, 129, 0.15)' };
    if (risk === 'medium') return { color: '#f59e0b', label: 'Moderate Anomaly Risk', bg: 'rgba(245, 158, 11, 0.15)' };
    return { color: '#f43f5e', label: 'High Fraud Risk Alert', bg: 'rgba(244, 63, 94, 0.15)' };
  };

  const fraudInfo = getFraudColor(business.fraudRisk);

  const handleReportClick = (e: React.MouseEvent) => {
    if (onGenerateReport) {
      e.preventDefault();
      onGenerateReport();
    } else if (sendFollowUpMessage) {
      sendFollowUpMessage(`Run deep fraud risk audit for business ${business.name}`);
    }
  };

  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '24px',
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '24px',
      color: '#f8fafc',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Business Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '24px' }}>🏢</span>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              {business.name}
            </h2>
            {business.claimed && (
              <span style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', color: '#a5b4fc', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                ✓ Claimed Business
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            {business.category} • {business.totalReviews} Verified Reviews
          </p>
        </div>

        {/* Fraud Risk Indicator */}
        <div style={{
          background: fraudInfo.bg,
          border: `1px solid ${fraudInfo.color}`,
          padding: '6px 14px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: fraudInfo.color, display: 'inline-block', boxShadow: `0 0 8px ${fraudInfo.color}` }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: fraudInfo.color }}>
            {fraudInfo.label}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px', marginBottom: '20px' }}>
        {[
          { id: 'overview', label: '📊 Reputation Overview' },
          { id: 'fraud', label: '🛡️ Fraud Risk Signals' },
          { id: 'ai', label: '🤖 AI Sentiment Highlights' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              border: activeTab === tab.id ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
              color: activeTab === tab.id ? '#a5b4fc' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Trust Gauge */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Average Trust Score</span>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#34d399', margin: '8px 0', lineHeight: 1 }}>
              {business.avgTrustScore}
              <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 500 }}>/100</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#a7f3d0' }}>
              Top 5% verified vendor reputation on Vouch
            </p>
          </div>

          {/* Star Distribution */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '10px' }}>Review Rating Distribution</span>
            {[
              { stars: 5, pct: 78, color: '#10b981' },
              { stars: 4, pct: 14, color: '#06b6d4' },
              { stars: 3, pct: 5, color: '#f59e0b' },
              { stars: 2, pct: 2, color: '#f97316' },
              { stars: 1, pct: 1, color: '#f43f5e' },
            ].map((row) => (
              <div key={row.stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '11px' }}>
                <span style={{ width: '28px', color: '#cbd5e1' }}>{row.stars} ★</span>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '4px' }} />
                </div>
                <span style={{ width: '28px', textAlign: 'right', color: '#64748b' }}>{row.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Fraud Signals */}
      {activeTab === 'fraud' && (
        <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h4 style={{ fontSize: '14px', margin: '0 0 12px 0', color: '#e2e8f0' }}>Automated Fraud Risk Signals</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', fontSize: '12px' }}>
              <span>⚡ Review Submission Velocity</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>Normal (1.4 reviews/day)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', fontSize: '12px' }}>
              <span>🧠 Text Duplicate / Cluster Check</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>99.2% Unique Content</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', fontSize: '12px' }}>
              <span>📑 Verified Receipt Evidence Ratio</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>84% Verified Evidence</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: AI Highlights */}
      {activeTab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💚 What People Love
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li>Lightning-fast shipping & packaging</li>
              <li>Responsive 24/7 customer support</li>
              <li>High durability & verified specs</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
            <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#fda4af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              💔 Improvement Areas
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li>High international shipping costs</li>
              <li>User manual font size is too small</li>
            </ul>
          </div>
        </div>
      )}

      {/* AI Trigger */}
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <a
          href="/ai-risk-report"
          onClick={(e) => {
            if (sendFollowUpMessage) sendFollowUpMessage(`Run deep fraud risk audit for business ${business.name}`);
            window.location.href = '/ai-risk-report';
          }}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🤖 Generate Full AI Risk Report →
        </a>
      </div>
    </div>
  );
}
