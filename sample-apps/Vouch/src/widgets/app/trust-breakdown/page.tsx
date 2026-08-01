'use client';

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface TrustBreakdownData {
  review_id?: string;
  score: number;
  verified: boolean;
  reasons: string[];
  breakdown: {
    evidenceScore: number;
    reputationScore: number;
    originalityScore: number;
    accountAgeScore: number;
    communityScore: number;
    penalties: number;
  };
}

export default function TrustBreakdownWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<TrustBreakdownData>();

  // Interactive local state for live sandbox simulation if data is null or interactive testing
  const [evidence, setEvidence] = useState(rawData?.breakdown?.evidenceScore ?? 25);
  const [reputation, setReputation] = useState(rawData?.breakdown?.reputationScore ?? 15);
  const [originality, setOriginality] = useState(rawData?.breakdown?.originalityScore ?? 18);
  const [accountAge, setAccountAge] = useState(rawData?.breakdown?.accountAgeScore ?? 12);
  const [community, setCommunity] = useState(rawData?.breakdown?.communityScore ?? 10);
  const [penalties, setPenalties] = useState(rawData?.breakdown?.penalties ?? 0);

  // Compute overall score
  const totalScore = Math.max(0, Math.min(100, 20 + evidence + reputation + originality + accountAge + community - penalties));

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: '#10b981', glow: 'rgba(16, 185, 129, 0.3)', label: 'High Trust', badgeBg: 'rgba(16, 185, 129, 0.15)' };
    if (score >= 50) return { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)', label: 'Moderate Trust', badgeBg: 'rgba(245, 158, 11, 0.15)' };
    return { bg: '#f43f5e', glow: 'rgba(244, 63, 94, 0.3)', label: 'Low Trust / Risky', badgeBg: 'rgba(244, 63, 94, 0.15)' };
  };

  const colorInfo = getScoreColor(totalScore);

  return (
    <div style={{
      maxWidth: '650px',
      margin: '0 auto',
      padding: '24px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      color: '#f8fafc',
      boxShadow: `0 20px 40px ${colorInfo.glow}`,
      animation: 'fadeIn 0.4s ease-out',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Vouch Trust Score Engine
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Multi-signal algorithm breakdown & verification explainability
          </p>
        </div>

        <span style={{
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          background: colorInfo.badgeBg,
          color: colorInfo.bg,
          border: `1px solid ${colorInfo.bg}`,
          boxShadow: `0 0 12px ${colorInfo.glow}`,
        }}>
          {colorInfo.label}
        </span>
      </div>

      {/* Main Meter */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}>
        {/* Score Ring / Big Counter */}
        <div style={{
          position: 'relative',
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: `conic-gradient(${colorInfo.bg} ${totalScore}%, rgba(51, 65, 85, 0.5) 0)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px ${colorInfo.glow}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
              {totalScore}
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', tracking: '0.5px' }}>/ 100</span>
          </div>
        </div>

        {/* Signals Overview */}
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#e2e8f0' }}>
            Verified Signals Summary
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
              📄 Receipt & Photo Evidence ({evidence}/30)
            </span>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
              🏅 Trusted Reviewer Tier ({reputation}/20)
            </span>
            <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
              ✨ 96% Text Originality ({originality}/20)
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Sliders / Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        {/* Evidence */}
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>📸 Evidence Attachment</span>
            <span style={{ color: '#818cf8', fontWeight: 700 }}>+{evidence} pts</span>
          </div>
          <input
            type="range" min="0" max="30" value={evidence}
            onChange={(e) => setEvidence(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }}
          />
        </div>

        {/* Reputation */}
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>🏆 Reviewer Badge Tier</span>
            <span style={{ color: '#34d399', fontWeight: 700 }}>+{reputation} pts</span>
          </div>
          <input
            type="range" min="0" max="20" value={reputation}
            onChange={(e) => setReputation(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
          />
        </div>

        {/* Originality */}
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>🧠 AI Text Originality</span>
            <span style={{ color: '#22d3ee', fontWeight: 700 }}>+{originality} pts</span>
          </div>
          <input
            type="range" min="0" max="20" value={originality}
            onChange={(e) => setOriginality(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
          />
        </div>

        {/* Community */}
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>👍 Community Agree Votes</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>+{community} pts</span>
          </div>
          <input
            type="range" min="0" max="15" value={community}
            onChange={(e) => setCommunity(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Penalties Toggle */}
      <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#fda4af' }}>Rapid Submission / Sentiment Mismatch Penalty</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Risk flags trigger deduction from baseline</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[0, 10, 25].map((val) => (
            <button
              key={val}
              onClick={() => setPenalties(val)}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                background: penalties === val ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                transition: 'all 0.2s',
              }}
            >
              {val === 0 ? 'None' : `-${val} pts`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
