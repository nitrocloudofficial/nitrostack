'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';
import { useState, useEffect } from 'react';

interface FilterDecision {
  rsid: string;
  riskAllele: string;
  studyAccession: string;
  pubmedId: string;
  traitName: string;
  effectSize: number;
  effectType: string;
  pvalue: number;
  pvalueFormatted: string;
  ancestralGroups: string[];
  totalSampleSize: number;
  decision: 'included' | 'excluded';
  reason: string;
}

interface FilterEvidenceResult {
  disease: string;
  total: number;
  includedCount: number;
  excludedCount: number;
  ancestryNote: string | null;
  allDecisions: FilterDecision[];
}

const DISEASE_LABELS: Record<string, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  coronary_artery_disease: 'Coronary Artery Disease',
  age_related_macular_degeneration: 'Age-Related Macular Degeneration',
};

function IncIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      <path d="M5.5 9L7.8 11.5L12.5 6.5" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ExcIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8.5" fill="#DC2626" fillOpacity=".12" stroke="#DC2626" strokeWidth="1.2"/>
      <path d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

export default function EvidenceFilterWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [state, setState] = useWidgetState<{ showAll: boolean }>(() => ({ showAll: false }));

  const data = getToolOutput<FilterEvidenceResult>();
  const isDark = theme === 'dark';

  const bg       = isDark ? '#080F1C' : '#F4F7FC';
  const surface  = isDark ? '#0D1828' : '#FFFFFF';
  const text     = isDark ? '#D8E5F5' : '#0C1826';
  const muted    = isDark ? '#607FA0' : '#596880';
  const border   = isDark ? '#182840' : '#CDD8EE';
  const teal     = isDark ? '#0DD4B8' : '#09B8A6';
  const tealBg   = isDark ? '#041E1A' : '#DDF4F0';

  useEffect(() => {
    if (!data?.allDecisions) return;
    data.allDecisions.forEach((_, i) => {
      setTimeout(() => {
        setRevealedCards(prev => { const s = new Set(prev); s.add(i); return s; });
      }, i * 100);
    });
  }, [data]);

  if (!data) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', color: muted, background: bg,
        minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 14, fontFamily: 'system-ui, sans-serif',
      }}>
        <div>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 10, opacity: 0.5 }}>
            <circle cx="16" cy="16" r="14" stroke={teal} strokeWidth="1.5"/>
            <path d="M10 16c1.5-4 10.5-4 12 0" stroke={teal} strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="11" cy="12" r="1.5" fill={teal}/>
            <circle cx="21" cy="12" r="1.5" fill={teal}/>
          </svg>
          <div style={{ fontSize: 13 }}>Evaluating evidence quality…</div>
        </div>
      </div>
    );
  }

  const decisions = data.allDecisions ?? [];
  const showAll = state?.showAll ?? false;
  const visible = showAll ? decisions : decisions.slice(0, 12);
  const passRate = data.total > 0 ? (data.includedCount / data.total) * 100 : 0;

  return (
    <div style={{
      background: bg, borderRadius: 14, padding: '20px 20px 16px',
      color: text, fontFamily: 'system-ui, sans-serif', maxWidth: 640,
    }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>
            Evidence Filtering
          </h2>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: teal, letterSpacing: '.06em' }}>
            {DISEASE_LABELS[data.disease] ?? data.disease}
          </span>
        </div>
        <div style={{ fontSize: 12, color: muted }}>
          {data.total} candidate {data.total === 1 ? 'study' : 'studies'} evaluated against 5 quality criteria
        </div>
        {data.ancestryNote && (
          <div style={{
            marginTop: 8, padding: '5px 10px',
            background: isDark ? '#0D1E38' : '#EFF6FF',
            border: `1px solid ${isDark ? '#1E3A5F' : '#BFDBFE'}`,
            borderRadius: 6, fontSize: 11, color: isDark ? '#93C5FD' : '#1D4ED8',
          }}>
            {data.ancestryNote}
          </div>
        )}
      </div>

      {/* Pass-rate bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#6EE7B7' : '#059669' }}>
                {data.includedCount} included
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isDark ? '#F87171' : '#DC2626' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#FCA5A5' : '#DC2626' }}>
                {data.excludedCount} excluded
              </span>
            </div>
          </div>
          <span style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700,
            color: passRate >= 70 ? (isDark ? '#6EE7B7' : '#059669') : muted,
          }}>
            {Math.round(passRate)}% pass rate
          </span>
        </div>
        <div style={{ height: 5, background: isDark ? '#182840' : '#E2EAF8', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${passRate}%`,
            background: `linear-gradient(90deg, #059669, #0DD4B8)`,
            borderRadius: 3, transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {visible.map((d, i) => {
          const inc = d.decision === 'included';
          const key = `${d.rsid}-${i}`;
          const expanded = expandedCard === key;
          const revealed = revealedCards.has(i);

          return (
            <div
              key={key}
              onClick={() => setExpandedCard(expanded ? null : key)}
              style={{
                background: surface,
                border: `1px solid ${inc ? (isDark ? '#064E3B' : '#BBF7D0') : (isDark ? '#7F1D1D' : '#FECACA')}`,
                borderLeft: `3px solid ${inc ? '#059669' : (isDark ? '#F87171' : '#DC2626')}`,
                borderRadius: 9,
                padding: '11px 13px',
                cursor: 'pointer',
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'none' : 'translateY(6px)',
                transition: 'opacity .28s ease, transform .28s ease',
                userSelect: 'none',
              }}
            >
              {/* Row 1: rsID + badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {inc ? <IncIcon /> : <ExcIcon />}
                  <div>
                    <div style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: 14, fontWeight: 700, color: text, letterSpacing: '-.01em',
                    }}>
                      {d.rsid}
                    </div>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, marginTop: 1 }}>
                      {d.riskAllele ? `risk allele: ${d.riskAllele}` : ''}
                      {d.effectType === 'OR' && d.effectSize ? ` · OR=${d.effectSize.toFixed(2)}` : ''}
                      {d.effectType === 'beta' && d.effectSize ? ` · β=${d.effectSize.toFixed(3)}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                  letterSpacing: '.06em', padding: '3px 9px', borderRadius: 5,
                  background: inc ? (isDark ? '#064E3B' : '#DCFCE7') : (isDark ? '#7F1D1D' : '#FEE2E2'),
                  color: inc ? (isDark ? '#4ADE80' : '#166534') : (isDark ? '#FCA5A5' : '#991B1B'),
                }}>
                  {inc ? 'INCLUDED' : 'EXCLUDED'}
                </div>
              </div>

              {/* Reason preview */}
              {!expanded && (
                <div style={{
                  marginTop: 8, fontSize: 11, color: muted, lineHeight: 1.5,
                  borderTop: `1px solid ${border}`, paddingTop: 6,
                }}>
                  {d.reason.length > 100 ? d.reason.slice(0, 100) + '…' : d.reason}
                </div>
              )}

              {/* Expanded */}
              {expanded && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 12, color: text, lineHeight: 1.6, marginBottom: 10 }}>
                    {d.reason}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {([
                      ['p-value', d.pvalueFormatted || (d.pvalue ? d.pvalue.toExponential(2) : '—')],
                      ['n (sample)', d.totalSampleSize > 0 ? d.totalSampleSize.toLocaleString() : 'unknown'],
                      ['study', d.studyAccession || '—'],
                      ['ancestry', (d.ancestralGroups ?? []).join(', ') || 'not reported'],
                      ['trait', d.traitName || '—'],
                      ['PubMed ID', d.pubmedId || '—'],
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label} style={{
                        background: isDark ? '#060D1A' : '#F4F7FC',
                        borderRadius: 6, padding: '6px 9px',
                      }}>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: muted, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: text, marginTop: 2, fontWeight: 600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {d.pubmedId && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${d.pubmedId}/`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10,
                        fontFamily: 'ui-monospace, monospace', fontSize: 11,
                        color: isDark ? '#60A5FA' : '#2563EB', textDecoration: 'none',
                      }}
                    >
                      PMID {d.pubmedId} — View on PubMed →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {decisions.length > 12 && (
        <button
          onClick={() => setState({ showAll: !showAll })}
          style={{
            marginTop: 10, width: '100%', padding: '9px',
            background: 'transparent', border: `1px solid ${border}`,
            borderRadius: 8, color: muted, fontSize: 12, cursor: 'pointer',
            fontFamily: 'ui-monospace, monospace', letterSpacing: '.04em',
          }}
        >
          {showAll ? '↑ Show fewer' : `↓ Show all ${decisions.length} studies`}
        </button>
      )}

      <div style={{
        marginTop: 14, paddingTop: 10, borderTop: `1px solid ${border}`,
        fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted,
        lineHeight: 1.6, letterSpacing: '.02em',
      }}>
        Source: NHGRI-EBI GWAS Catalog · Criteria: p&lt;5×10⁻⁸, n≥1,000, valid OR/β, ancestry check, superseded removal
      </div>
    </div>
  );
}
