'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface Citation {
  pubmedId: string; title: string; authors: string; journal: string; year: string; url: string;
}
interface PRSContribution {
  rsid: string; riskAllele: string; genotypeAlleleCount: number;
  effectSize: number; effectType: string; contribution: number;
  studyAccession: string; pubmedId: string;
}
interface AgentStep {
  type: 'thinking' | 'tool_call' | 'tool_result';
  text?: string;
  tool?: string;
  input?: any;
  result?: any;
}

interface PolyRiskReport {
  disease: string; diseaseName: string;
  riskInterpretation: {
    tier: 'low' | 'moderate' | 'high'; prsScore: number; zScore: number;
    percentileApprox: number; confidenceLevel: 'low' | 'moderate' | 'high';
    confidenceReason: string; description: string;
  };
  prsResult: { totalScore: number; contributions: PRSContribution[]; variantsIncluded: number; genotypeAssumed: boolean; };
  filterResult: { total: number; includedCount: number; excludedCount: number; };
  citations: Citation[];
  lifestyleContext: { factors: Array<{ category: string; description: string }>; source: string; };
  disclaimer: string; generatedAt: string;
  // Extended fields from analyze_genetic_file
  narrative?: string;
  agentSteps?: AgentStep[];
  genotypeData?: boolean;
}

const TIER = {
  low:      { track: '#059669', label: 'Low Risk',      text: '#059669', darkText: '#4ADE80', bg: '#DCFCE7', darkBg: '#052E1F' },
  moderate: { track: '#D97706', label: 'Moderate Risk', text: '#B45309', darkText: '#FCD34D', bg: '#FEF9C3', darkBg: '#291600' },
  high:     { track: '#DC2626', label: 'High Risk',     text: '#991B1B', darkText: '#FCA5A5', bg: '#FEE2E2', darkBg: '#2D0808' },
};

const CONF = {
  low:      { label: 'Low confidence',      icon: '▲' },
  moderate: { label: 'Moderate confidence', icon: '◆' },
  high:     { label: 'High confidence',     icon: '●' },
};

function Gauge({ zScore, tier, isDark }: { zScore: number; tier: string; isDark: boolean }) {
  const t = TIER[tier as keyof typeof TIER] ?? TIER.moderate;
  const clamped = Math.max(-2.5, Math.min(2.5, zScore));
  const pct = (clamped + 2.5) / 5;
  const angle = -135 + pct * 270;

  // Arc path helpers
  const R = 90;
  const cx = 110, cy = 110;
  const toXY = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x: cx + R * Math.cos(r), y: cy + R * Math.sin(r) };
  };
  const arcPath = (startDeg: number, endDeg: number) => {
    const s = toXY(startDeg), e = toXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const trackColor = isDark ? '#1A2A40' : '#E2EAF8';
  const needleX = cx + (R - 14) * Math.cos((angle * Math.PI) / 180);
  const needleY = cy + (R - 14) * Math.sin((angle * Math.PI) / 180);

  return (
    <svg viewBox="0 0 220 140" width="220" height="140" style={{ display: 'block', margin: '0 auto' }}>
      {/* Track */}
      <path d={arcPath(-135, 135)} fill="none" stroke={trackColor} strokeWidth="14" strokeLinecap="round"/>
      {/* Low segment */}
      <path d={arcPath(-135, -45)} fill="none" stroke="#059669" strokeWidth="14" strokeLinecap="round" opacity="0.7"/>
      {/* Moderate segment */}
      <path d={arcPath(-45, 45)} fill="none" stroke="#D97706" strokeWidth="14" strokeLinecap="round" opacity="0.7"/>
      {/* High segment */}
      <path d={arcPath(45, 135)} fill="none" stroke="#DC2626" strokeWidth="14" strokeLinecap="round" opacity="0.7"/>
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY}
        stroke={t.track} strokeWidth="3" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="7" fill={t.track}/>
      <circle cx={cx} cy={cy} r="3.5" fill={isDark ? '#0C1826' : '#fff'}/>
      {/* Labels */}
      <text x="22" y="132" fontSize="9" fill={isDark ? '#059669' : '#059669'} fontFamily="ui-monospace,monospace" fontWeight="700">LOW</text>
      <text x="196" y="132" fontSize="9" fill={isDark ? '#F87171' : '#DC2626'} fontFamily="ui-monospace,monospace" fontWeight="700" textAnchor="end">HIGH</text>
    </svg>
  );
}

type TabId = 'summary' | 'variants' | 'citations' | 'lifestyle' | 'narrative' | 'agent';

export default function RiskReportWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ tab: TabId }>(() => ({ tab: 'summary' }));

  const data = getToolOutput<PolyRiskReport>();
  const isDark = theme === 'dark';

  const bg      = isDark ? '#080F1C' : '#F4F7FC';
  const surface = isDark ? '#0D1828' : '#FFFFFF';
  const surface2= isDark ? '#101F38' : '#F0F4FA';
  const text    = isDark ? '#D8E5F5' : '#0C1826';
  const muted   = isDark ? '#607FA0' : '#596880';
  const border  = isDark ? '#182840' : '#CDD8EE';
  const teal    = isDark ? '#0DD4B8' : '#09B8A6';

  const hasNarrative = !!data?.narrative;
  const hasAgentSteps = data?.agentSteps && data.agentSteps.length > 0;

  if (!data) {
    return (
      <div style={{
        padding: 32, textAlign: 'center', color: muted, background: bg,
        minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 14, fontFamily: 'system-ui, sans-serif',
      }}>
        <div>
          <div style={{ fontSize: 13 }}>Generating report…</div>
        </div>
      </div>
    );
  }

  const { riskInterpretation: ri, prsResult, filterResult, citations, lifestyleContext } = data;
  const t = TIER[ri.tier];
  const tab = state?.tab ?? 'summary';
  const tabs: { id: TabId; label: string }[] = [
    { id: 'summary',   label: 'Summary' },
    ...(hasNarrative ? [{ id: 'narrative' as TabId, label: '✦ Narrative' }] : []),
    { id: 'variants',  label: `Variants (${prsResult.variantsIncluded})` },
    { id: 'citations', label: `Citations (${citations.length})` },
    { id: 'lifestyle', label: 'Lifestyle' },
    ...(hasAgentSteps ? [{ id: 'agent' as TabId, label: `Agent Trace` }] : []),
  ];

  return (
    <div style={{
      background: bg, borderRadius: 14, padding: '20px 20px 16px',
      color: text, fontFamily: 'system-ui, sans-serif', maxWidth: 640,
    }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700, letterSpacing: '-.01em' }}>
          PolyRisk Report
        </h2>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: teal }}>
          {data.diseaseName} · {new Date(data.generatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Gauge card */}
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: 12, padding: '16px 16px 14px', marginBottom: 14,
      }}>
        <Gauge zScore={ri.zScore} tier={ri.tier} isDark={isDark}/>

        {/* Risk tier label */}
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span style={{
            display: 'inline-block', padding: '5px 18px', borderRadius: 20,
            fontSize: 13, fontWeight: 700,
            background: isDark ? t.darkBg : t.bg,
            color: isDark ? t.darkText : t.text,
          }}>
            {t.label}
          </span>
        </div>

        {/* Real genotype badge */}
        {data.genotypeData && (
          <div style={{
            marginTop: 8, textAlign: 'center',
          }}>
            <span style={{
              display: 'inline-block', padding: '3px 11px', borderRadius: 20, fontSize: 11,
              background: isDark ? '#052E1F' : '#DCFCE7',
              color: isDark ? '#4ADE80' : '#166534', fontWeight: 600,
            }}>
              ✓ Real genotype data used
            </span>
          </div>
        )}

        {/* PRS score + percentile */}
        <div style={{
          display: 'flex', gap: 12, marginTop: 14, justifyContent: 'center',
        }}>
          {[
            ['PRS score', ri.prsScore.toFixed(4)],
            ['Population %ile', `~${ri.percentileApprox}th`],
            ['Variants used', `${prsResult.variantsIncluded}/${filterResult.total}`],
          ].map(([label, val]) => (
            <div key={label} style={{
              background: surface2, borderRadius: 8, padding: '8px 12px', textAlign: 'center', flex: 1,
            }}>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: muted, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 700, color: text }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Confidence */}
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: surface2, borderRadius: 8, border: `1px solid ${border}`,
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 9, fontWeight: 700,
            color: muted, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4,
          }}>
            {CONF[ri.confidenceLevel]?.icon} Confidence: {CONF[ri.confidenceLevel]?.label}
          </div>
          <div style={{ fontSize: 12, color: muted, lineHeight: 1.55 }}>{ri.confidenceReason}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${border}`, marginBottom: 14,
      }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setState({ tab: id })} style={{
            padding: '7px 13px', fontSize: 12, cursor: 'pointer',
            border: 'none', background: 'transparent',
            color: tab === id ? teal : muted,
            fontWeight: tab === id ? 700 : 400,
            fontFamily: 'ui-monospace, monospace', letterSpacing: '.03em',
            borderBottom: tab === id ? `2px solid ${teal}` : '2px solid transparent',
            marginBottom: -1, transition: 'color .15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Summary */}
      {tab === 'summary' && (
        <p style={{ fontSize: 13, lineHeight: 1.65, color: text, margin: 0 }}>
          {ri.description}
        </p>
      )}

      {/* Tab: Narrative (AI-written personalized analysis) */}
      {tab === 'narrative' && hasNarrative && (
        <div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted,
            letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            AI-written personalized analysis · Powered by Claude
          </div>
          {(data.narrative ?? '').split(/\n\n+/).map((para, i) => (
            <p key={i} style={{
              fontSize: 13, lineHeight: 1.7, color: text,
              margin: '0 0 12px',
            }}>
              {para.trim()}
            </p>
          ))}
        </div>
      )}

      {/* Tab: Variants */}
      {tab === 'variants' && (
        <div>
          {prsResult.genotypeAssumed && (
            <div style={{
              padding: '7px 10px', marginBottom: 10, borderRadius: 6, fontSize: 11,
              background: isDark ? '#0D1E38' : '#EFF6FF',
              border: `1px solid ${isDark ? '#1E3A5F' : '#BFDBFE'}`,
              color: isDark ? '#93C5FD' : '#1D4ED8',
            }}>
              Genotype assumed as 1 risk allele per variant (heterozygous). Actual genotype data would refine this score.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {prsResult.contributions.map(c => {
              const max = Math.max(...prsResult.contributions.map(x => Math.abs(x.contribution)));
              const barW = max > 0 ? (Math.abs(c.contribution) / max) * 100 : 0;
              return (
                <div key={c.rsid} style={{
                  background: surface, border: `1px solid ${border}`,
                  borderRadius: 9, padding: '11px 13px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                    <div>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 700, color: text }}>{c.rsid}</span>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, marginLeft: 8 }}>risk: {c.riskAllele}</span>
                    </div>
                    <span style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700,
                      color: c.contribution > 0 ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#4ADE80' : '#059669'),
                    }}>
                      {c.contribution > 0 ? '+' : ''}{c.contribution.toFixed(4)}
                    </span>
                  </div>
                  <div style={{ background: border, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${barW}%`,
                      background: c.contribution > 0
                        ? 'linear-gradient(90deg,#DC2626,#F87171)'
                        : 'linear-gradient(90deg,#059669,#4ADE80)',
                      borderRadius: 4, transition: 'width .6s ease',
                    }}/>
                  </div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, marginTop: 5 }}>
                    {c.effectType === 'OR_log' ? `log(OR)=${c.effectSize.toFixed(4)}` : `β=${c.effectSize.toFixed(4)}`}
                    {' '}× {c.genotypeAlleleCount} allele{c.genotypeAlleleCount !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Citations */}
      {tab === 'citations' && (
        <div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Peer-reviewed publications · NCBI PubMed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {citations.length === 0 && (
              <div style={{ fontSize: 13, color: muted, textAlign: 'center', padding: 24 }}>No citations fetched yet</div>
            )}
            {citations.map(c => (
              <div key={c.pubmedId} style={{
                background: surface, border: `1px solid ${border}`,
                borderRadius: 9, padding: '11px 13px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: text, lineHeight: 1.45, marginBottom: 5 }}>{c.title}</div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: muted }}>
                  {c.authors} · {c.journal} ({c.year})
                </div>
                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 7,
                  fontFamily: 'ui-monospace, monospace', fontSize: 11,
                  color: isDark ? '#60A5FA' : '#2563EB', textDecoration: 'none',
                }}>
                  PMID {c.pubmedId} → View on PubMed
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Lifestyle */}
      {tab === 'lifestyle' && (
        <div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Modifiable risk factors · {data.diseaseName}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(lifestyleContext?.factors ?? []).map(f => (
              <div key={f.category} style={{
                background: surface, border: `1px solid ${border}`,
                borderRadius: 9, padding: '11px 13px',
              }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: teal, marginBottom: 5 }}>{f.category}</div>
                <div style={{ fontSize: 12, color: muted, lineHeight: 1.6 }}>{f.description}</div>
              </div>
            ))}
          </div>
          {lifestyleContext?.source && (
            <div style={{ marginTop: 10, fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted }}>
              Source: {lifestyleContext.source}
            </div>
          )}
        </div>
      )}

      {/* Tab: Agent Trace */}
      {tab === 'agent' && hasAgentSteps && (
        <div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted,
            letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Agent reasoning trace · {data.agentSteps!.length} steps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.agentSteps!.map((step, i) => (
              <div key={i} style={{
                background: surface, border: `1px solid ${border}`,
                borderLeft: `3px solid ${
                  step.type === 'thinking' ? teal
                  : step.type === 'tool_call' ? '#D97706'
                  : '#059669'
                }`,
                borderRadius: 8, padding: '9px 12px',
              }}>
                <div style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                  color: step.type === 'thinking' ? teal : step.type === 'tool_call' ? '#D97706' : '#059669',
                  marginBottom: 4,
                }}>
                  {step.type === 'thinking' ? '◆ Thinking'
                    : step.type === 'tool_call' ? `⚙ Tool: ${step.tool}`
                    : `✓ Result: ${step.tool}`}
                </div>
                {step.text && (
                  <div style={{ fontSize: 11, color: muted, lineHeight: 1.55 }}>
                    {step.text.length > 200 ? step.text.slice(0, 200) + '…' : step.text}
                  </div>
                )}
                {step.type === 'tool_call' && step.input && (
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, marginTop: 4 }}>
                    input: {JSON.stringify(step.input).slice(0, 120)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: 18, padding: '11px 13px',
        background: isDark ? '#1A1000' : '#FFF9ED',
        border: `1px solid ${isDark ? '#4A3000' : '#FDE68A'}`,
        borderRadius: 9, fontSize: 11, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.55,
      }}>
        <strong>⚠ NOT A DIAGNOSTIC TOOL</strong> — {data.disclaimer?.slice(0, 240)}…
      </div>
    </div>
  );
}
