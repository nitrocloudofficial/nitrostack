'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, TrustScoreGauge, colors } from './DesignSystem';
import { PDFModal } from './PDFModal';

interface LandingViewProps {
  onNavigate: (route: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const [interactiveEvidence, setInteractiveEvidence] = useState(25);
  const [interactiveReputation, setInteractiveReputation] = useState(15);
  const [interactiveOriginality, setInteractiveOriginality] = useState(18);
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  const calculatedScore = Math.min(100, Math.max(0, 20 + interactiveEvidence + interactiveReputation + interactiveOriginality));

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* PDF Report Viewer Modal */}
      <PDFModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        title="Official Vouch Platform Audit Certificate"
      />

      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '60px 20px 40px 20px', maxWidth: '900px', margin: '0 auto' }}>
        <Badge variant="indigo" size="md" icon="✨">
          Introducing Vouch 2.0 • Verifiable Trust Infrastructure
        </Badge>

        <h1 style={{
          fontSize: '56px',
          fontWeight: 800,
          lineHeight: '1.1',
          letterSpacing: '-1.5px',
          margin: '20px 0 16px 0',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #C7D2FE 40%, #38BDF8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Outfit', sans-serif",
        }}>
          Vouch — We're Vouching For It
        </h1>

        <p style={{
          fontSize: '18px',
          lineHeight: '1.6',
          color: '#94A3B8',
          maxWidth: '680px',
          margin: '0 auto 32px auto',
        }}>
          Stop fake reviews before they happen. Vouch computes a multi-signal <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Trust Score (0–100)</span> from evidence proofs, reviewer reputation, AI originality, and community validation.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Button size="lg" variant="primary" onClick={() => onNavigate('dashboard')}>
            🚀 Open Executive Dashboard →
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setIsPDFOpen(true)}>
            📄 View Official PDF Audit Report
          </Button>
        </div>
      </section>

      {/* Interactive AI Trust Engine Illustration */}
      <section style={{ maxWidth: '960px', margin: '0 auto 60px auto', padding: '0 20px' }}>
        <Card style={{ border: '1px solid rgba(99, 102, 241, 0.25)', boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <Badge variant="emerald" size="md">⚡ Interactive AI Score Calculator</Badge>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '8px 0 0 0', color: '#FFF' }}>
                Test How Signals Compute Trust Scores
              </h3>
            </div>
            <TrustScoreGauge score={calculatedScore} size={90} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>🧾 Receipt & Photo Evidence</span>
                <span style={{ color: colors.secondary, fontWeight: 700 }}>+{interactiveEvidence} pts</span>
              </div>
              <input
                type="range" min="0" max="30" value={interactiveEvidence}
                onChange={(e) => setInteractiveEvidence(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.secondary, cursor: 'pointer' }}
              />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>🏆 Reviewer Badge Tier</span>
                <span style={{ color: colors.success, fontWeight: 700 }}>+{interactiveReputation} pts</span>
              </div>
              <input
                type="range" min="0" max="20" value={interactiveReputation}
                onChange={(e) => setInteractiveReputation(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.success, cursor: 'pointer' }}
              />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>🧠 AI Originality & Sentiment</span>
                <span style={{ color: colors.primary, fontWeight: 700 }}>+{interactiveOriginality} pts</span>
              </div>
              <input
                type="range" min="0" max="20" value={interactiveOriginality}
                onChange={(e) => setInteractiveOriginality(Number(e.target.value))}
                style={{ width: '100%', accentColor: colors.primary, cursor: 'pointer' }}
              />
            </div>
          </div>
        </Card>
      </section>

      {/* Verified Business Samples Showcase */}
      <section style={{ maxWidth: '1100px', margin: '0 auto 80px auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
            Verified Merchants & Sample Audits
          </h2>
          <p style={{ fontSize: '15px', color: '#94A3B8' }}>
            Explore verified vendor samples with real-time trust metrics.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {[
            { name: 'Apex Electronics Store', category: 'Consumer Tech', trust: 94, risk: 'LOW', reviews: 142, proofRatio: '84%' },
            { name: 'Nexus Cloud Infrastructure', category: 'SaaS & Enterprise', trust: 91, risk: 'LOW', reviews: 98, proofRatio: '92%' },
            { name: 'Volt Automotive Services', category: 'Automotive', trust: 88, risk: 'LOW', reviews: 210, proofRatio: '79%' },
            { name: 'Horizon Pay Systems', category: 'Fintech & Payments', trust: 96, risk: 'LOW', reviews: 315, proofRatio: '95%' },
            { name: 'Quantum Health & Fitness', category: 'Health & Wellness', trust: 89, risk: 'LOW', reviews: 76, proofRatio: '81%' },
            { name: 'Starlight Audio Labs', category: 'Audio Gear', trust: 93, risk: 'LOW', reviews: 164, proofRatio: '88%' },
          ].map((sample, idx) => (
            <Card key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#FFF', margin: 0 }}>{sample.name}</h3>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{sample.category} • {sample.reviews} Reviews</span>
                </div>
                <Badge variant="emerald" size="sm">Score: {sample.trust}</Badge>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Verified Proof Ratio: <strong style={{ color: '#818CF8' }}>{sample.proofRatio}</strong></span>
                <span>Risk Level: <strong style={{ color: colors.success }}>{sample.risk}</strong></span>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm" onClick={() => onNavigate('business')}>Inspect Analytics →</Button>
                <Button variant="outline" size="sm" onClick={() => setIsPDFOpen(true)}>📄 PDF Audit</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ maxWidth: '1100px', margin: '0 auto 80px auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
            Built for Modern Web Applications & MCP Hosts
          </h2>
          <p style={{ fontSize: '15px', color: '#94A3B8' }}>
            Enterprise-grade verification architecture out of the box.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {[
            { icon: '🛡️', title: 'Multi-Signal Verification', desc: 'Combines verified receipts, account age, text originality, and community votes into a unified trust metric.' },
            { icon: '🤖', title: 'Real-time AI Fraud Scan', desc: 'Detects submission spikes, Jaccard text duplicates, sentiment mismatches, and coordinated bot networks.' },
            { icon: '🏅', title: '6-Tier Badge Gamification', desc: 'Progression from New Reviewer to Truth Keeper encourages reviewers to attach verifiable proof.' },
            { icon: '⚡', title: 'NitroStack MCP Native', desc: 'Seamlessly exposes Model Context Protocol tools and Next.js frontend widgets to AI agents.' },
          ].map((feat, idx) => (
            <Card key={idx}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{feat.icon}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFF', marginBottom: '8px' }}>{feat.title}</h3>
              <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.6', margin: 0 }}>{feat.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section style={{ background: 'rgba(30, 41, 59, 0.4)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', padding: '40px 20px', marginBottom: '80px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: '#F8FAFC', fontFamily: "'Outfit', sans-serif" }}>99.4%</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>Fraud Detection Accuracy</div>
          </div>
          <div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: colors.success, fontFamily: "'Outfit', sans-serif" }}>1.4M+</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>Verified Reviews Processed</div>
          </div>
          <div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: colors.secondary, fontFamily: "'Outfit', sans-serif" }}>&lt; 50ms</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>MCP Tool Latency</div>
          </div>
          <div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: '#818CF8', fontFamily: "'Outfit', sans-serif" }}>84.6%</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>Evidence Proof Ratio</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px 40px 20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
        Vouch Platform © 2026 • Designed for Apple, Stripe, Linear & Vercel aesthetics • Powered by NitroStack
      </footer>
    </div>
  );
};
