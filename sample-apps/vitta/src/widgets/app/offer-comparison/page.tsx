'use client';

import { useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Offer Comparison widget — up to 3 tappable offer cards with recommended badge.
 * Renders output of `generate_offers`. Accept button chains create_sanction_letter.
 */

interface Offer {
  offer_id: string;
  amount: number;
  tenure_months: number;
  roi_annual_pct: number;
  emi: number;
  processing_fee_pct: number;
  apr_pct: number;
  total_cost: number;
  valid_till: string;
  recommended: boolean;
  why_recommended?: string;
}
interface OffersOut {
  offers: Offer[];
  recommended_offer_id: string;
}

const inr = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function OfferComparison() {
  const theme = useTheme();
  const { getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  const data = getToolOutput<OffersOut>();
  const [selected, setSelected] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [fallbackHint, setFallbackHint] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const fg = isDark ? '#f5f5f5' : '#111827';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const card = isDark ? '#111827' : '#ffffff';
  const line = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const accent = '#3b82f6';

  if (!data || !data.offers?.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: muted }}>No offers to display.</div>;
  }

  const sel = selected ?? data.recommended_offer_id;

  const accept = async (offer: Offer) => {
    setAccepting(true);
    try {
      // let the agent narrate + run create_sanction_letter with full context
      await Promise.resolve(
        sendFollowUpMessage(`I accept offer ${offer.offer_id} (${inr(offer.amount)} for ${offer.tenure_months} months at EMI ${inr(offer.emi)}). Please generate my sanction letter.`),
      );
    } catch {
      // host doesn't support follow-up messages (e.g. sandboxed preview) —
      // degrade to an explicit typed instruction instead of a dead button
      setFallbackHint(`This host blocks widget actions — type "I accept ${offer.offer_id}" in the chat to proceed.`);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, fontFamily: 'system-ui, sans-serif', color: fg }}>
      <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>Your offers — tap a card to compare, accept when ready. APR and total cost shown upfront.</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {data.offers.map((o) => {
          const active = o.offer_id === sel;
          return (
            <div key={o.offer_id} onClick={() => setSelected(o.offer_id)}
              style={{
                flex: '1 1 200px', minWidth: 200, cursor: 'pointer', borderRadius: 14, padding: 16,
                background: card, border: `2px solid ${active ? accent : line}`,
                boxShadow: active ? '0 8px 24px rgba(59,130,246,0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease', position: 'relative',
              }}>
              {o.recommended && (
                <div style={{ position: 'absolute', top: -10, left: 12, background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>★ RECOMMENDED</div>
              )}
              <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>{o.tenure_months} months</div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: '2px 0' }}>{inr(o.emi)}<span style={{ fontSize: 12, fontWeight: 500, color: muted }}>/mo</span></div>
              <div style={{ fontSize: 12, color: muted }}>{inr(o.amount)} @ {o.roi_annual_pct}% p.a.</div>
              <div style={{ borderTop: `1px solid ${line}`, marginTop: 10, paddingTop: 8, fontSize: 11.5, color: muted, display: 'grid', gap: 3 }}>
                <span>APR {o.apr_pct}%</span>
                <span>Fee {o.processing_fee_pct}%</span>
                <span>Total cost {inr(o.total_cost)}</span>
              </div>
              {active && (
                <>
                  {o.why_recommended && <div style={{ fontSize: 11.5, marginTop: 8, color: '#10b981' }}>{o.why_recommended}</div>}
                  <button onClick={(e) => { e.stopPropagation(); accept(o); }} disabled={accepting}
                    style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: accepting ? 0.6 : 1 }}>
                    {accepting ? 'Working…' : 'Accept this offer →'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {fallbackHint && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.14)', color: '#f59e0b', fontSize: 12 }}>{fallbackHint}</div>
      )}
      <div style={{ fontSize: 10, color: muted, marginTop: 10 }}>3-day cooling-off applies after sanction. No hidden charges — the total cost above is everything.</div>
    </div>
  );
}
