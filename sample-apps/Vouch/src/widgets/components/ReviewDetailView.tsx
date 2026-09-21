'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, TrustScoreGauge, colors } from './DesignSystem';
import { PDFModal } from './PDFModal';

interface ReviewDetailViewProps {
  onNavigate: (route: string) => void;
}

export const ReviewDetailView: React.FC<ReviewDetailViewProps> = ({ onNavigate }) => {
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [filterRisk, setFilterRisk] = useState<'all' | 'clean' | 'anomaly'>('all');
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const [helpfulCount, setHelpfulCount] = useState(24);
  const [hasVotedHelpful, setHasVotedHelpful] = useState(false);
  const [agreeCount, setAgreeCount] = useState(18);
  const [hasVotedAgree, setHasVotedAgree] = useState(false);

  // Diverse user reviews dataset
  const allUserReviews = [
    {
      id: 'REV-101',
      author: 'Alex Chen',
      avatarColor: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
      tier: 'Truth Keeper',
      business: 'Apex Electronics Store',
      rating: 5,
      trustScore: 94,
      riskLevel: 'LOW (CLEAN)',
      riskColor: colors.success,
      date: '2 hours ago',
      text: 'Purchased the flagship pro model last Tuesday. Delivery was super fast, customer care responded within 5 minutes when I had setup questions, and build quality exceeded expectations! Highly recommended.',
      proof: 'Verified Receipt Photo Attached (OCR Matched #ORD-9942)',
      evidenceScore: 30,
      reputationScore: 20,
      originalityScore: 18,
      accountAgeScore: 14,
      communityScore: 12,
      penalties: 0,
      jaccardSimilarity: '0.4% (Unique)',
      velocity: '1.4 reviews/day (Normal)',
      sentimentMatch: '99.8% Match (Positive)',
      fraudFlags: ['Zero fraud flags detected', 'Cryptographic receipt signature valid'],
    },
    {
      id: 'REV-102',
      author: 'Sarah Jenkins',
      avatarColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      tier: 'Expert Reviewer',
      business: 'Nexus Cloud Infrastructure',
      rating: 5,
      trustScore: 91,
      riskLevel: 'LOW (CLEAN)',
      riskColor: colors.success,
      date: '5 hours ago',
      text: 'Migrated 40 microservices to Nexus Cloud with zero downtime. SLA guarantee held 100%. API latency benchmark dropped from 85ms to 18ms.',
      proof: 'Verified Contract & SLA PDF (Hash #SLA-8842)',
      evidenceScore: 30,
      reputationScore: 18,
      originalityScore: 19,
      accountAgeScore: 14,
      communityScore: 10,
      penalties: 0,
      jaccardSimilarity: '0.2% (Unique)',
      velocity: '0.8 reviews/day (Normal)',
      sentimentMatch: '98.9% Match (Positive)',
      fraudFlags: ['Zero fraud flags detected', 'Enterprise SLA Contract Verified'],
    },
    {
      id: 'REV-103',
      author: 'Marcus Vance',
      avatarColor: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      tier: 'Community Guardian',
      business: 'Volt Automotive Services',
      rating: 4,
      trustScore: 88,
      riskLevel: 'LOW (CLEAN)',
      riskColor: colors.success,
      date: '1 day ago',
      text: 'EV battery diagnostics completed in under 1 hour. Transparent pricing receipt provided upfront, though the waiting lounge espresso machine was out of order.',
      proof: 'Verified Repair Work Order (OCR Matched #VOLT-402)',
      evidenceScore: 28,
      reputationScore: 18,
      originalityScore: 17,
      accountAgeScore: 15,
      communityScore: 10,
      penalties: 0,
      jaccardSimilarity: '0.6% (Unique)',
      velocity: '1.1 reviews/day (Normal)',
      sentimentMatch: '96.2% Match (Balanced)',
      fraudFlags: ['Zero fraud flags detected', 'Work order timestamp validated'],
    },
    {
      id: 'REV-104',
      author: 'Elena Rostova',
      avatarColor: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
      tier: 'Trusted Reviewer',
      business: 'Apex Electronics Store',
      rating: 5,
      trustScore: 92,
      riskLevel: 'LOW (CLEAN)',
      riskColor: colors.success,
      date: '2 days ago',
      text: 'Superb noise-canceling headphones. Tested on a 12-hour flight and battery stayed above 60%. Build materials feel extremely premium.',
      proof: 'Verified Store Checkout Invoice (#APX-7731)',
      evidenceScore: 30,
      reputationScore: 16,
      originalityScore: 18,
      accountAgeScore: 15,
      communityScore: 13,
      penalties: 0,
      jaccardSimilarity: '0.3% (Unique)',
      velocity: '0.5 reviews/day (Normal)',
      sentimentMatch: '99.1% Match (Positive)',
      fraudFlags: ['Zero fraud flags detected', 'Serial number proof validated'],
    },
    {
      id: 'REV-105',
      author: 'David Kim',
      avatarColor: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      tier: 'Truth Keeper',
      business: 'Horizon Pay Systems',
      rating: 5,
      trustScore: 96,
      riskLevel: 'LOW (CLEAN)',
      riskColor: colors.success,
      date: '3 days ago',
      text: 'Settled $120,000 in international payouts across 14 currencies. Webhook callbacks arrived within 40ms without dropping a single packet.',
      proof: 'Verified Merchant Processing Statement (#HPAY-901)',
      evidenceScore: 30,
      reputationScore: 20,
      originalityScore: 19,
      accountAgeScore: 15,
      communityScore: 12,
      penalties: 0,
      jaccardSimilarity: '0.1% (Unique)',
      velocity: '0.4 reviews/day (Normal)',
      sentimentMatch: '99.9% Match (Positive)',
      fraudFlags: ['Zero fraud flags detected', 'Merchant financial audit clear'],
    },
    {
      id: 'REV-106',
      author: 'User_RatingBot_99',
      avatarColor: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
      tier: 'New Reviewer',
      business: 'Nexus Cloud Infrastructure',
      rating: 5,
      trustScore: 42,
      riskLevel: 'MEDIUM (RATING ANOMALY)',
      riskColor: colors.warning,
      date: '4 hours ago',
      text: 'Terrible service! Server crashed three times in 1 hour and customer support ignored all tickets for 2 days. Complete waste of money, avoid at all costs!',
      proof: 'No Proof Attached (-30 pts)',
      evidenceScore: 0,
      reputationScore: 5,
      originalityScore: 15,
      accountAgeScore: 2,
      communityScore: 0,
      penalties: 20,
      jaccardSimilarity: '12.4% (Low)',
      velocity: '8.2 reviews/day (Elevated)',
      sentimentMatch: '8.2% Match (CRITICAL MISMATCH: 5 Stars vs Negative Text)',
      fraudFlags: ['Rating/Sentiment Divergence Flag (-20 pts)', 'New account (< 3 days old)'],
    },
    {
      id: 'REV-107',
      author: 'SpamNet_Alpha_4',
      avatarColor: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
      tier: 'New Reviewer',
      business: 'Volt Automotive Services',
      rating: 5,
      trustScore: 18,
      riskLevel: 'HIGH (DUPLICATE CLUSTER)',
      riskColor: colors.danger,
      date: '10 mins ago',
      text: 'Best service ever fast shipping cheap price top quality buy here now highly recommended 10/10!',
      proof: 'No Proof Attached',
      evidenceScore: 0,
      reputationScore: 0,
      originalityScore: 2,
      accountAgeScore: 1,
      communityScore: 0,
      penalties: 45,
      jaccardSimilarity: '94.8% MATCH (18 Duplicate Reviews Found)',
      velocity: '24 reviews/min (SPAM BURST)',
      sentimentMatch: 'Generic Bot Text',
      fraudFlags: ['Text Copy-Paste Cluster Attack (-30 pts)', 'Spam Posting Burst (-15 pts)', 'Suspicious IP Subnet'],
    },
  ];

  const filteredReviews = filterRisk === 'all'
    ? allUserReviews
    : filterRisk === 'clean'
    ? allUserReviews.filter((r) => r.trustScore >= 80)
    : allUserReviews.filter((r) => r.trustScore < 80);

  const activeReview = allUserReviews[selectedUserIndex] || allUserReviews[0];

  const handleRescan = () => {
    setIsScanning(true);
    setScanStatus('Scanning NLP text embeddings & neural graph vector clusters...');
    setTimeout(() => setScanStatus('Verifying Jaccard duplicate index against 1.4M reviews...'), 1200);
    setTimeout(() => {
      setIsScanning(false);
      setScanStatus(`✓ Fraud Scan Complete! Verified Risk Level for ${activeReview.author}: ${activeReview.riskLevel}`);
    }, 2400);
  };

  const toggleHelpful = () => {
    setHelpfulCount(hasVotedHelpful ? helpfulCount - 1 : helpfulCount + 1);
    setHasVotedHelpful(!hasVotedHelpful);
  };

  const toggleAgree = () => {
    setAgreeCount(hasVotedAgree ? agreeCount - 1 : agreeCount + 1);
    setHasVotedAgree(!hasVotedAgree);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1240px', margin: '0 auto' }}>
      <PDFModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        title={`Fraud Audit Report — ${activeReview.author}`}
        businessName={activeReview.business}
        trustScore={activeReview.trustScore}
      />

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94A3B8', marginBottom: '4px' }}>
            <button type="button" onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: '#818CF8', cursor: 'pointer', padding: 0 }}>
              ← Back to Executive Dashboard
            </button>
            <span>/</span>
            <span style={{ color: '#F8FAFC' }}>Verified Review Audits</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFF', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Multi-User Verified Review Audit Engine
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" size="sm" onClick={() => setIsPDFOpen(true)}>
            📄 Export Fraud PDF Audit
          </Button>
          <Button variant="primary" size="sm" onClick={handleRescan} loading={isScanning}>
            🤖 Re-Scan AI Fraud Radar
          </Button>
        </div>
      </div>

      {/* User Selector Strip */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '18px',
        padding: '14px 20px',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Select User Review to Inspect ({allUserReviews.length} Available):</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'clean', 'anomaly'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterRisk(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: filterRisk === f ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
                  background: filterRisk === f ? '#4F46E5' : 'transparent',
                  color: '#FFF',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'all' ? 'All Reviews' : f === 'clean' ? '🟢 Verified Clean' : '⚠️ Anomaly / Spam'}
              </button>
            ))}
          </div>
        </div>

        {/* User Pill Buttons */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {filteredReviews.map((rev) => {
            const originalIndex = allUserReviews.findIndex((r) => r.id === rev.id);
            const isSelected = selectedUserIndex === originalIndex;

            return (
              <button
                key={rev.id}
                type="button"
                onClick={() => setSelectedUserIndex(originalIndex)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '1px solid #4F46E5' : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)' : 'rgba(255,255,255,0.03)',
                  color: isSelected ? '#FFFFFF' : '#CBD5E1',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: rev.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#FFF',
                }}>
                  {rev.author.charAt(0)}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{rev.author}</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: rev.trustScore >= 80 ? colors.success : colors.danger }}>
                  {rev.trustScore}/100
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Scan Status Banner */}
      {scanStatus && (
        <div style={{
          background: 'rgba(79, 70, 229, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          color: '#A5B4FC',
          padding: '12px 18px',
          borderRadius: '14px',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span>🤖</span>
          <span>{scanStatus}</span>
        </div>
      )}

      {/* Active User Inspection Detail Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '36px' }}>
        {/* Left Column: Author Card & Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: activeReview.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '22px',
                  color: '#FFF',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                }}>
                  {activeReview.author.charAt(0)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', margin: 0 }}>{activeReview.author}</h2>
                    <Badge variant="emerald" size="sm">🏅 {activeReview.tier}</Badge>
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
                    Business: <strong style={{ color: '#F8FAFC' }}>{activeReview.business}</strong> • {activeReview.date}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Fraud Risk Level</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: activeReview.riskColor }}>{activeReview.riskLevel}</div>
                </div>
                <TrustScoreGauge score={activeReview.trustScore} size={86} />
              </div>
            </div>

            {/* Review Body Text */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <div style={{ color: '#FBBF24', fontSize: '18px', marginBottom: '8px', letterSpacing: '2px' }}>
                {'★'.repeat(activeReview.rating)}{'☆'.repeat(5 - activeReview.rating)}
              </div>
              <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#CBD5E1', margin: 0 }}>
                "{activeReview.text}"
              </p>
            </div>

            {/* Proof Attachment Badge */}
            <div style={{
              background: activeReview.evidenceScore > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: activeReview.evidenceScore > 0 ? '1px dashed rgba(16, 185, 129, 0.3)' : '1px dashed rgba(239, 68, 68, 0.3)',
              padding: '16px 20px',
              borderRadius: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🧾</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: activeReview.evidenceScore > 0 ? '#34D399' : '#F87171' }}>{activeReview.proof}</span>
              </div>
              <Badge variant={activeReview.evidenceScore > 0 ? 'emerald' : 'rose'} size="md">
                {activeReview.evidenceScore > 0 ? '+30 pts Proof Bonus' : '0 Proof Attached'}
              </Badge>
            </div>

            {/* AI Signals & Interactive Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant={hasVotedHelpful ? 'primary' : 'secondary'} size="sm" onClick={toggleHelpful}>
                  👍 Helpful ({helpfulCount})
                </Button>
                <Button variant={hasVotedAgree ? 'success' : 'secondary'} size="sm" onClick={toggleAgree}>
                  🤝 Agree ({agreeCount})
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={() => onNavigate('ai-risk')}>
                🤖 Run Deep Neural Scan →
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Multi-Signal Score Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> Multi-Signal Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Evidence Proof', score: `+${activeReview.evidenceScore} / 30`, color: colors.secondary },
                { label: 'Reviewer Badge Tier', score: `+${activeReview.reputationScore} / 20`, color: colors.success },
                { label: 'AI Text Originality', score: `+${activeReview.originalityScore} / 20`, color: colors.primary },
                { label: 'Account Age', score: `+${activeReview.accountAgeScore} / 15`, color: '#38BDF8' },
                { label: 'Community Votes', score: `+${activeReview.communityScore} / 15`, color: colors.warning },
              ].map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#CBD5E1' }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 700 }}>{item.score}</span>
                  </div>
                </div>
              ))}

              {activeReview.penalties > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#F87171', fontWeight: 700 }}>Fraud Deductions</span>
                    <span style={{ color: '#F87171', fontWeight: 800 }}>-{activeReview.penalties} pts</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Moderator Action Control Card */}
          <Card style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', margin: '0 0 12px 0' }}>
              Moderator Action Controls
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Button variant="danger" size="sm" onClick={() => alert(`Reviewer ${activeReview.author} has been flagged for fraud moderation.`)}>
                🚨 Flag & Remove Review
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsPDFOpen(true)}>
                📄 View Official PDF Audit
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Complete User Reviews Grid Gallery */}
      <section style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', marginBottom: '16px', fontFamily: "'Outfit', sans-serif" }}>
          All Verified User Reviews Stream ({allUserReviews.length})
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {allUserReviews.map((rev, idx) => (
            <Card
              key={rev.id}
              style={{
                border: selectedUserIndex === idx ? '1px solid #4F46E5' : '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div onClick={() => setSelectedUserIndex(idx)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: rev.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#FFF' }}>
                      {rev.author.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{rev.author}</div>
                      <span style={{ fontSize: '11px', color: '#818CF8' }}>{rev.business}</span>
                    </div>
                  </div>
                  <TrustScoreGauge score={rev.trustScore} size={50} />
                </div>

                <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.5', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  "{rev.text}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <Badge variant={rev.evidenceScore > 0 ? 'emerald' : 'rose'} size="sm">✓ {rev.proof.split(' ')[0]} Proof</Badge>
                  <span style={{ color: '#818CF8', fontWeight: 600 }}>Inspect Audit →</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};
