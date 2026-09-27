'use client';

import React from 'react';
import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

interface ReviewWidgetData {
  id?: string;
  authorName?: string;
  badgeTier?: string;
  rating?: number;
  title?: string;
  text?: string;
  trustScore?: number;
  verificationStatus?: 'verified' | 'unverified' | 'disputed';
  evidenceUrls?: string[];
  createdAt?: string;
}

export default function ReviewCardWidget() {
  const { isReady, getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const toolData = getToolOutput<ReviewWidgetData>();

  // Default fallback data for preview & interactive testing
  const review = {
    id: toolData?.id || 'rev-8942',
    authorName: toolData?.authorName || 'Alex Chen',
    badgeTier: toolData?.badgeTier || 'Trusted Reviewer',
    rating: toolData?.rating || 5,
    title: toolData?.title || 'Outstanding service & authentic evidence verified',
    text: toolData?.text || 'Purchased the flagship pro model last Tuesday. Delivery was super fast, customer care responded within 5 minutes when I had setup questions, and build quality exceeded expectations! Highly recommended.',
    trustScore: toolData?.trustScore || 94,
    verificationStatus: toolData?.verificationStatus || 'verified',
    evidenceUrls: toolData?.evidenceUrls || ['https://images.unsplash.com/photo-1556742049-0a670fc0a7d0'],
    createdAt: toolData?.createdAt || '2 hours ago',
  };

  // State sync across widget re-renders
  const [reactionsState, setReactions] = useWidgetState(() => ({
    helpfulCount: 24,
    agreeCount: 18,
    userHasVotedHelpful: false,
    userHasVotedAgree: false,
  }));

  // Safe fallback if useWidgetState returns null on direct page render
  const reactions = reactionsState || {
    helpfulCount: 24,
    agreeCount: 18,
    userHasVotedHelpful: false,
    userHasVotedAgree: false,
  };

  const toggleHelpful = () => {
    if (!setReactions) return;
    setReactions({
      ...reactions,
      helpfulCount: reactions.userHasVotedHelpful ? reactions.helpfulCount - 1 : reactions.helpfulCount + 1,
      userHasVotedHelpful: !reactions.userHasVotedHelpful,
    });
  };

  const toggleAgree = () => {
    if (!setReactions) return;
    setReactions({
      ...reactions,
      agreeCount: reactions.userHasVotedAgree ? reactions.agreeCount - 1 : reactions.agreeCount + 1,
      userHasVotedAgree: !reactions.userHasVotedAgree,
    });
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '20px',
      color: '#f8fafc',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* Top Bar: Reviewer info & Trust Score Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '16px',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          }}>
            {review.authorName.charAt(0)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{review.authorName}</h4>
              {review.verificationStatus === 'verified' && (
                <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  ✓ Verified Buyer
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 500 }}>
              🏅 {review.badgeTier}
            </span>
          </div>
        </div>

        {/* Trust Score Counter Pill */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          padding: '8px 16px',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Trust Score</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>{review.trustScore}</span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>/100</span>
          </div>
          <span style={{ fontSize: '10px', color: '#a7f3d0' }}>High Authenticity</span>
        </div>
      </div>

      {/* Star Rating & Title */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{ color: '#fbbf24', fontSize: '16px', letterSpacing: '2px' }}>
            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>• {review.createdAt}</span>
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>
          {review.title}
        </h3>
        <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1', margin: 0 }}>
          {review.text}
        </p>
      </div>

      {/* Evidence Attachments Badge */}
      {review.evidenceUrls && review.evidenceUrls.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px dashed rgba(99, 102, 241, 0.3)',
          padding: '10px 14px',
          borderRadius: '12px',
          margin: '14px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🧾</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Verified Evidence Attached</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Item receipt & booking photo (+30 Trust Bonus)</div>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600, background: 'rgba(99, 102, 241, 0.2)', padding: '4px 10px', borderRadius: '8px' }}>
            1 File Verified
          </span>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={toggleHelpful}
            style={{
              background: reactions.userHasVotedHelpful ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: reactions.userHasVotedHelpful ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
              color: reactions.userHasVotedHelpful ? '#818cf8' : '#94a3b8',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            👍 Helpful ({reactions.helpfulCount})
          </button>

          <button
            onClick={toggleAgree}
            style={{
              background: reactions.userHasVotedAgree ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: reactions.userHasVotedAgree ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
              color: reactions.userHasVotedAgree ? '#34d399' : '#94a3b8',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            🤝 Agree ({reactions.agreeCount})
          </button>
        </div>

        <button
          onClick={() => sendFollowUpMessage && sendFollowUpMessage(`Analyze authenticity details for review ${review.id}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#06b6d4',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          🤖 Ask AI Audit →
        </button>
      </div>
    </div>
  );
}
