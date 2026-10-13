'use client';

import { useState } from 'react';
import { copyToClipboard } from './utils';

interface CallHospitalDialogProps {
  hospitalName: string;
  department: string;
  phoneNumber: string;
  isDark: boolean;
  onClose: () => void;
  onCallNow: () => void;
}

export default function CallHospitalDialog({ hospitalName, department, phoneNumber, isDark, onClose, onCallNow }: CallHospitalDialogProps) {
  const [copied, setCopied] = useState(false);

  const panelBg = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.65)' : 'rgba(15,23,42,0.6)';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  async function handleCopy() {
    const ok = await copyToClipboard(phoneNumber);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{ background: panelBg, borderRadius: 16, padding: 22, width: '100%', maxWidth: 340, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', border: `1px solid ${borderColor}` }}
      >
        <div style={{ fontSize: 30, textAlign: 'center' }}>📞</div>
        <h3 id="call-dialog-title" style={{ color: textColor, textAlign: 'center', margin: '8px 0 2px' }}>
          {hospitalName}
        </h3>
        <p style={{ textAlign: 'center', color: mutedColor, fontSize: 12.5, margin: '0 0 16px' }}>{department}</p>

        <div
          style={{
            background: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)',
            borderRadius: 10,
            padding: 14,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 10, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>Emergency Contact</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: textColor, letterSpacing: 0.5 }}>{phoneNumber}</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleCopy}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontWeight: 700, cursor: 'pointer' }}
          >
            {copied ? '✓ Copied' : '📋 Copy Number'}
          </button>
          <button
            type="button"
            onClick={onCallNow}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
          >
            📞 Call Now
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 10, border: 'none', background: 'transparent', color: mutedColor, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
