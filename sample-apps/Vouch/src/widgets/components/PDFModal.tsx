'use client';

import React from 'react';
import { Button, Badge, colors } from './DesignSystem';

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  businessName?: string;
  auditId?: string;
  trustScore?: number;
}

export const PDFModal: React.FC<PDFModalProps> = ({
  isOpen,
  onClose,
  title = 'Official Trust & Fraud Risk Audit Report',
  businessName = 'Apex Electronics Store',
  auditId = 'VOUCH-PDF-2026-9942X',
  trustScore = 88,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <div style={{
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Modal Top Control Bar */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(30, 41, 59, 0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📄</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFF' }}>PDF Document Viewer — {title}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              🖨️ Print / Save PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Printable PDF Page Canvas */}
        <div style={{ padding: '36px', color: '#0F172A', background: '#FFFFFF', minHeight: '680px', fontFamily: "'Inter', sans-serif" }}>
          {/* Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px' }}>V</div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>Vouch Certification</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                Official Multi-Signal Trust Score & Verification Report
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Document Ref</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>{auditId}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Issued: 2026-07-31</div>
            </div>
          </div>

          {/* Certificate Badge Banner */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Target Entity</span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>{businessName}</h2>
              <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>✓ Verified Authenticated Merchant (142 Reviews Analyzed)</div>
            </div>

            <div style={{ background: '#DCFCE7', border: '2px solid #16A34A', padding: '12px 20px', borderRadius: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>Overall Trust Score</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#15803D', lineHeight: 1 }}>{trustScore}</div>
              <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 700 }}>VERIFIED CLEAN</div>
            </div>
          </div>

          {/* Signal Audit Breakdown Table */}
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
            Multi-Signal Verification Breakdown
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '10px' }}>Verification Signal</th>
                <th style={{ padding: '10px' }}>Max Score</th>
                <th style={{ padding: '10px' }}>Awarded</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>Verified Receipt & Invoice Attachments</td>
                <td style={{ padding: '10px' }}>+30 pts</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>+30 pts</td>
                <td style={{ padding: '10px', color: '#16A34A' }}>✓ 100% Cryptographic Match</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>Reviewer Reputation & Badge Tier</td>
                <td style={{ padding: '10px' }}>+20 pts</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>+20 pts</td>
                <td style={{ padding: '10px', color: '#16A34A' }}>✓ Truth Keeper / Expert Tier</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>AI Text Originality (Jaccard NLP Scan)</td>
                <td style={{ padding: '10px' }}>+20 pts</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>+18 pts</td>
                <td style={{ padding: '10px', color: '#16A34A' }}>✓ 99.2% Unique Content</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>Account Age & Tenure (180+ Days)</td>
                <td style={{ padding: '10px' }}>+15 pts</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>+12 pts</td>
                <td style={{ padding: '10px', color: '#16A34A' }}>✓ Verified Account History</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>Community Agreement Votes</td>
                <td style={{ padding: '10px' }}>+15 pts</td>
                <td style={{ padding: '10px', color: '#16A34A', fontWeight: 700 }}>+10 pts</td>
                <td style={{ padding: '10px', color: '#16A34A' }}>✓ 24 Community Votes</td>
              </tr>
            </tbody>
          </table>

          {/* Cryptographic Hash Stamp */}
          <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#0F172A', display: 'block' }}>Vouch Verification Stamp Hash</span>
              <code>sha256:8f92a4e1b73094c8e100f9a23d456789b1c2e3f4a5b6c7d8e9f0</code>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#16A34A', fontWeight: 800 }}>SECURITY SEAL VALIDATED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
