'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface ReputationData {
  user_id?: string;
  name?: string;
  badge_tier?: string;
  reputation_points?: number;
  reviews_submitted?: number;
  evidence_attached_count?: number;
  email_verified?: boolean;
}

export default function ReputationCardWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<ReputationData>();

  const profile = {
    name: rawData?.name || 'Sarah Jenkins',
    badgeTier: rawData?.badge_tier || 'expert_reviewer',
    points: rawData?.reputation_points || 385,
    reviewsSubmitted: rawData?.reviews_submitted || 28,
    evidenceCount: rawData?.evidence_attached_count || 22,
    emailVerified: rawData?.email_verified ?? true,
  };

  const getTierInfo = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'truth_keeper':
        return { title: 'Truth Keeper', icon: '👑', color: '#ec4899', next: 2000, req: 1000 };
      case 'community_guardian':
        return { title: 'Community Guardian', icon: '🛡️', color: '#a855f7', next: 1000, req: 500 };
      case 'expert_reviewer':
        return { title: 'Expert Reviewer', icon: '💎', color: '#06b6d4', next: 500, req: 300 };
      case 'trusted_reviewer':
        return { title: 'Trusted Reviewer', icon: '🌟', color: '#10b981', next: 300, req: 150 };
      case 'verified_reviewer':
        return { title: 'Verified Reviewer', icon: '✓', color: '#3b82f6', next: 150, req: 50 };
      default:
        return { title: 'New Reviewer', icon: '🌱', color: '#94a3b8', next: 50, req: 0 };
    }
  };

  const tierInfo = getTierInfo(profile.badgeTier);
  const pointsToNext = Math.max(0, tierInfo.next - profile.points);
  const progressPct = Math.min(100, Math.round(((profile.points - tierInfo.req) / (tierInfo.next - tierInfo.req)) * 100));

  return (
    <div style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '24px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '24px',
      color: '#f8fafc',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      {/* User Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${tierInfo.color} 0%, #6366f1 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: `0 0 20px ${tierInfo.color}55`,
        }}>
          {tierInfo.icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>{profile.name}</h3>
            {profile.emailVerified && (
              <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '10px' }}>
                ✓ Email Verified (+10)
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: tierInfo.color, fontWeight: 600, marginTop: '2px' }}>
            {tierInfo.title} Tier • {profile.points} Reputation Points
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
          <span>Next Tier Progress</span>
          <span style={{ color: tierInfo.color, fontWeight: 600 }}>{pointsToNext} pts to Next Tier</span>
        </div>

        <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${tierInfo.color} 0%, #6366f1 100%)`,
            borderRadius: '6px',
            transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>{tierInfo.req} pts</span>
          <span>{progressPct}% Completed</span>
          <span>{tierInfo.next} pts</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>{profile.reviewsSubmitted}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Reviews Filed</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>{profile.evidenceCount}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Verified Evidence</div>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#818cf8' }}>{Math.round((profile.evidenceCount / profile.reviewsSubmitted) * 100)}%</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Proof Ratio</div>
        </div>
      </div>
    </div>
  );
}
