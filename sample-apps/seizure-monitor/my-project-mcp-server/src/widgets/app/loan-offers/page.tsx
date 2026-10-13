'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Loan Offers Widget
 * Bound to: get_loan_offers
 *
 * Shows financing offers sorted by true effective annual rate.
 * Flags predatory offers prominently so the patient isn't misled.
 * Also renders reconcile_case's `financingOptions` field if ever passed
 * directly — the data normalisation below accepts both shapes — but that
 * tool's primary widget is objectivity-report.
 */

interface LoanOffer {
  offerId?: string;
  lenderName: string;
  apr?: number;
  amount?: number;
  principal?: number;
  tenureMonths?: number;
  flatInterestRate?: number;
  totalRepayable?: number;
  effectiveAnnualRate?: number;
  isPredatory?: boolean;
  flagged?: boolean;
  flagReason?: string;
}

interface LoanOffersData {
  offers: LoanOffer[];
  cheapestOfferId?: string | null;
  flaggedPredatory?: string[];
  // Alternative shape from reconcile_case
  financingOptions?: LoanOffer[];
}

function formatCurrency(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function formatPct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

export default function LoanOffers() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<LoanOffersData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const surfaceAlt = isDark ? '#2a2a3e' : '#f8fafc';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
        <p style={{ margin: 0 }}>No loan offers yet.</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Call <code>get_loan_offers</code> to see financing options.</p>
      </div>
    );
  }

  // Normalise: accept both shapes
  const rawOffers: LoanOffer[] = data.offers ?? data.financingOptions ?? [];
  const cheapestId = data.cheapestOfferId;

  if (rawOffers.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#16a34a', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
        <p style={{ margin: 0, fontWeight: 600 }}>No financing needed!</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted }}>The insurer covers the full estimated cost.</p>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 480,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb22, #7c3aed11)',
        borderBottom: `1px solid ${border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>💰</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            Financing Options
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: textPrimary }}>
            {rawOffers.length} offer{rawOffers.length !== 1 ? 's' : ''} · sorted by true cost
          </p>
        </div>
      </div>

      {/* Warning banner if any predatory */}
      {rawOffers.some((o) => o.isPredatory || o.flagged) && (
        <div style={{
          background: '#fef3c7',
          borderBottom: '1px solid #fcd34d',
          padding: '8px 20px',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <span>⚠️</span>
          <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
            <strong>One or more offers below have been flagged</strong> for high or predatory APRs.
            Always compare the <em>effective annual rate</em>, not the flat rate.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rawOffers.map((offer, idx) => {
          const isCheapest = offer.offerId === cheapestId || idx === 0;
          const isPredatory = offer.isPredatory || offer.flagged;
          const effectiveRate = offer.effectiveAnnualRate ?? offer.apr;
          const total = offer.totalRepayable ?? offer.amount;
          const principal = offer.principal ?? offer.amount;

          return (
            <div
              key={offer.offerId ?? idx}
              style={{
                padding: '14px 20px',
                borderBottom: idx < rawOffers.length - 1 ? `1px solid ${border}` : 'none',
                background: isPredatory ? '#fff7ed' : isCheapest ? '#f0fdf4' : surface,
                position: 'relative',
              }}
            >
              {isCheapest && !isPredatory && (
                <span style={{
                  position: 'absolute',
                  top: 10,
                  right: 16,
                  background: '#16a34a',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 20,
                  padding: '2px 8px',
                }}>
                  RECOMMENDED
                </span>
              )}
              {isPredatory && (
                <span style={{
                  position: 'absolute',
                  top: 10,
                  right: 16,
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 20,
                  padding: '2px 8px',
                }}>
                  ⚠ FLAGGED
                </span>
              )}

              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isPredatory ? '#9a3412' : textPrimary }}>
                {offer.lenderName}
              </p>

              <div style={{ display: 'flex', gap: 20, marginTop: 6, flexWrap: 'wrap' }}>
                {effectiveRate !== undefined && (
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Effective Rate</p>
                    <p style={{ margin: '1px 0 0', fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: isPredatory ? '#dc2626' : '#2563eb' }}>
                      {effectiveRate > 1 ? effectiveRate.toFixed(1) + '%' : formatPct(effectiveRate)}
                    </p>
                  </div>
                )}
                {principal !== undefined && (
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Principal</p>
                    <p style={{ margin: '1px 0 0', fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: textPrimary }}>
                      {formatCurrency(principal)}
                    </p>
                  </div>
                )}
                {total !== undefined && total !== principal && (
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Total Repayable</p>
                    <p style={{ margin: '1px 0 0', fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: isPredatory ? '#dc2626' : textPrimary }}>
                      {formatCurrency(total)}
                    </p>
                  </div>
                )}
                {offer.tenureMonths && (
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: textMuted }}>Tenure</p>
                    <p style={{ margin: '1px 0 0', fontSize: 13, color: textPrimary }}>{offer.tenureMonths} mo</p>
                  </div>
                )}
              </div>

              {(offer.flagReason || isPredatory) && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9a3412', background: '#fff1ee', borderRadius: 4, padding: '4px 8px' }}>
                  {offer.flagReason ?? 'This offer has been flagged for a predatory interest structure.'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 20px', background: surfaceAlt, borderTop: `1px solid ${border}` }}>
        <p style={{ margin: 0, fontSize: 10, color: textMuted }}>
          💡 Effective annual rate includes processing fees and converts flat-rate loans to a comparable figure.
          Always confirm terms with the lender.
        </p>
      </div>
    </div>
  );
}
