'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Sanction Letter widget — the ceremony moment. Document card with key numbers,
 * SHA256 integrity hash and a download affordance. Renders create_sanction_letter output.
 */

interface SanctionOut {
  url: string;
  hash: string;
  valid_till: string;
  letter_fields: {
    borrower_name?: string;
    sanction_amount?: number;
    roi_annual_pct?: number;
    apr_pct?: number;
    emi?: number;
    tenure_months?: number;
    total_cost?: number;
    first_emi_date?: string;
    cooling_off_days?: number;
    html?: string;
  };
}

const inr = (n?: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function SanctionLetter() {
  const theme = useTheme();
  const { getToolOutput, openExternal } = useWidgetSDK();
  const [linkHint, setLinkHint] = useState<string | null>(null); // hooks BEFORE any early return
  const d = getToolOutput<SanctionOut>();
  const isDark = theme === 'dark';

  const fg = isDark ? '#f5f5f5' : '#1f2430';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const paper = isDark ? '#15181f' : '#fffdf7';
  const line = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  if (!d) return <div style={{ padding: 24, textAlign: 'center' }}>Preparing letter…</div>;
  const f = d.letter_fields || {};

  const download = () => {
    // 1) real hosted URL (server mounts GET /letters/:leadId) — works everywhere
    if (d.url?.startsWith('http')) {
      try {
        openExternal(d.url);
        return;
      } catch {
        /* host blocks openExternal — try blob next */
      }
    }
    // 2) blob download from the embedded html
    if (f.html) {
      try {
        const blob = new Blob([f.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vitta-sanction-letter.html';
        a.click();
        URL.revokeObjectURL(url);
        return;
      } catch {
        /* sandbox blocks downloads too */
      }
    }
    // 3) last resort: surface the link as selectable text
    setLinkHint(d.url ?? 'Ask the agent for your sanction letter link.');
  };

  return (
    <div style={{ maxWidth: 440, fontFamily: 'Georgia, serif', color: fg }}>
      <div style={{ borderRadius: 16, background: paper, border: `1px solid ${line}`, boxShadow: '0 12px 32px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        {/* letterhead */}
        <div style={{ padding: '18px 22px 12px', borderBottom: `2px solid #b8860b` }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: '#b8860b', fontWeight: 700 }}>SANCTION LETTER</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Vitta Financial Services Pvt. Ltd.</div>
          <div style={{ fontSize: 10, color: muted }}>NBFC · RBI Reg N-14.99999 (mock) · digitally signed</div>
        </div>

        <div style={{ padding: '16px 22px' }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Dear <b>{f.borrower_name ?? 'Applicant'}</b>, your loan is approved.</div>
          <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'system-ui, sans-serif', margin: '6px 0 10px' }}>{inr(f.sanction_amount)}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: 'system-ui, sans-serif', fontSize: 12.5 }}>
            <div><span style={{ color: muted }}>EMI</span><br /><b>{inr(f.emi)}/mo × {f.tenure_months}m</b></div>
            <div><span style={{ color: muted }}>Rate / APR</span><br /><b>{f.roi_annual_pct}% · {f.apr_pct}% APR</b></div>
            <div><span style={{ color: muted }}>First EMI</span><br /><b>{f.first_emi_date}</b></div>
            <div><span style={{ color: muted }}>Total cost</span><br /><b>{inr(f.total_cost)}</b></div>
          </div>

          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: isDark ? 'rgba(184,134,11,0.12)' : 'rgba(184,134,11,0.08)', fontSize: 11, fontFamily: 'system-ui, sans-serif' }}>
            {f.cooling_off_days ?? 3}-day cooling-off: cancel without penalty. Offer valid till {String(d.valid_till).slice(0, 10)}.
          </div>

          <button onClick={download}
            style={{ marginTop: 14, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: '#b8860b', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'system-ui, sans-serif' }}>
            ⬇ Download signed letter
          </button>

          {linkHint && (
            <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(184,134,11,0.14)', fontSize: 11, fontFamily: 'system-ui, sans-serif', wordBreak: 'break-all' }}>
              Letter link: {linkHint}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 9, fontFamily: 'monospace', color: muted, wordBreak: 'break-all' }}>
            SHA256 {d.hash}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: muted, marginTop: 8, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        Integrity-hashed · every step in your audit trail · Vitta
      </div>
    </div>
  );
}
