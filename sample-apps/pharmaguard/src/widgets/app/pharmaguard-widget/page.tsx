'use client';

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

// ── Theme constants ──────────────────────────────────────────────────────────
const THEME = {
  bg: {
    surface: '#0f172a',
    card: '#1e293b',
    hover: '#334155',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
  },
  accent: {
    cyan: '#22d3ee',
    emerald: '#34d399',
    rose: '#fb7185',
    amber: '#fbbf24',
    violet: '#c084fc',
  },
};

const CHART_COLORS = [
  THEME.accent.cyan,
  THEME.accent.rose,
  THEME.accent.emerald,
  THEME.accent.amber,
  THEME.accent.violet,
];

// ── Types ────────────────────────────────────────────────────────────────────
interface AdverseReaction {
  reaction: string;
  count: number;
  isKnownWarning?: boolean | null;
  matchedSection?: string | null;
  matchedText?: string | null;
}

interface Recall {
  classification: string;
  reason: string;
  status: string;
  initiationDate: string;
}

interface DrugData {
  name: string;
  adverseEvents: AdverseReaction[];
  recalls: Recall[];
}

interface NdcDetails {
  productNdc?: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm?: string;
  productType?: string;
}

interface AdverseDetails {
  topReactions: AdverseReaction[];
  totalReports?: number;
  seriousnessBreakdown?: {
    death: number;
    hospitalization: number;
    lifeThreatening: number;
    disability: number;
    other: number;
    totalSerious: number;
  };
  historicalTrends?: { time: string; count: number }[];
  labelAnalysis?: {
    totalKnownWarnings: number;
    totalPotentiallyUnlisted: number;
    labelAvailable: boolean;
  };
}

interface RecallDetails {
  recalls: Recall[];
  recallCount: number;
  hasActiveRecalls: boolean;
}

interface NormalizedPayload {
  isComparison: boolean;
  drugA?: DrugData;
  drugB?: DrugData;
  ndcData?: NdcDetails;
  adverseData?: AdverseDetails;
  recallData?: RecallDetails;
  found?: boolean;
  message?: string;
  loading: boolean;
  error: string | null;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
interface TooltipPayload {
  name?: string;
  value?: number;
  payload?: { reaction?: string; count?: number; drugA?: number; drugB?: number };
  color?: string;
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0].payload;
  const reaction = data?.reaction || payload[0].name || 'Unknown';

  return (
    <div
      style={{
        backgroundColor: THEME.bg.card,
        border: `1px solid ${THEME.accent.cyan}`,
        borderRadius: '6px',
        padding: '8px 12px',
      }}
    >
      <p style={{ color: THEME.text.primary, margin: '0 0 8px 0', fontSize: '13px' }}>
        <strong>{reaction}</strong>
      </p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color || THEME.accent.cyan, margin: '0 0 4px 0', fontSize: '12px' }}>
          {entry.name || 'Count'}: {entry.value}
        </p>
      ))}
    </div>
  );
};

// ── Helper to normalize incoming props into a common internal model ─────────
function normalizePayload(props: any): NormalizedPayload {
  let raw = props?.input ?? props?.data ?? props ?? {};
  
  // Un-nest if double wrapped
  if (raw && typeof raw === 'object') {
    if (raw.input && typeof raw.input === 'object') raw = raw.input;
    else if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) raw = raw.data;
  }
  raw = raw ?? {};

  const isComparison = Boolean(raw.isComparison || (raw.drugA && raw.drugB));

  // NDC Schema Support
  let ndcData: NdcDetails | undefined = undefined;
  if (raw.productNdc || raw.manufacturer || raw.dosageForm || raw.productType || raw.genericName || raw.brandName || raw.drug) {
    const drugObj = raw.drug || {};
    ndcData = {
      productNdc: raw.productNdc || drugObj.ndc || '—',
      genericName: raw.genericName || drugObj.genericName || '',
      brandName: raw.brandName || drugObj.brandName || drugObj.name || '',
      manufacturer: raw.manufacturer || drugObj.manufacturer || '—',
      dosageForm: raw.dosageForm || drugObj.dosageForm,
      productType: raw.productType || drugObj.productType,
    };
  }

  // Adverse Events Schema Support (topReactions, totalReports, seriousnessBreakdown)
  let adverseData: AdverseDetails | undefined = undefined;
  const rawReactions = raw.topReactions || raw.adverseEvents || [];
  const hasReactions = Array.isArray(rawReactions) && rawReactions.length > 0;
  const hasHistorical = Array.isArray(raw.historicalTrends) && raw.historicalTrends.length > 0;
  const hasSeriousness = Boolean(raw.seriousnessBreakdown);
  
  if (hasReactions || hasHistorical || hasSeriousness) {
    const topReactions: AdverseReaction[] = Array.isArray(rawReactions) ? rawReactions.map((item: any) => ({
      reaction: item.reaction || item.term || item.name || '',
      count: Number(item.count || item.value || 0),
      isKnownWarning: item.isKnownWarning ?? null,
      matchedSection: item.matchedSection ?? null,
      matchedText: item.matchedText ?? null,
    })) : [];
    adverseData = {
      topReactions,
      totalReports: raw.totalReports,
      seriousnessBreakdown: raw.seriousnessBreakdown,
      historicalTrends: raw.historicalTrends,
      labelAnalysis: raw.labelAnalysis,
    };
  }

  // Recall Schema Support (recalls, recallCount, hasActiveRecalls)
  let recallData: RecallDetails | undefined = undefined;
  if (raw.hasActiveRecalls !== undefined || raw.recallCount !== undefined || (Array.isArray(raw.recalls) && raw.recalls.length > 0)) {
    const recalls: Recall[] = Array.isArray(raw.recalls) ? raw.recalls : [];
    const recallCount = raw.recallCount ?? recalls.length;
    const hasActiveRecalls = raw.hasActiveRecalls ?? recallCount > 0;
    recallData = {
      recalls,
      recallCount,
      hasActiveRecalls,
    };
  }

  return {
    isComparison,
    drugA: raw.drugA,
    drugB: raw.drugB,
    ndcData,
    adverseData,
    recallData,
    found: raw.found,
    message: raw.message,
    loading: Boolean(raw.loading),
    error: raw.error ?? null,
  };
}

// ── Main widget page ──────────────────────────────────────────────────────────
export default function PharmaGuardWidgetPage(props?: any) {
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    console.log("Widget mounted");
    
    const initialOutput = typeof window !== 'undefined' ? (window as any).openai?.toolOutput : undefined;
    if (initialOutput) {
      console.log("Initial toolOutput:", initialOutput);
      setPayload(initialOutput);
      console.log("Payload updated");
    } else if (props && Object.keys(props).length > 0) {
      setPayload(props);
      console.log("Payload updated");
    }

    const handleMessage = (event: MessageEvent) => {
      console.log("Message received", event.data);
      if (event.data) {
        setPayload(event.data);
        console.log("Payload updated");
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [props]);

  const normalized = normalizePayload(payload || {});

  // Determine render path for debugging
  let renderPath = 'empty_state';
  if (normalized.loading) renderPath = 'loading';
  else if (normalized.error) renderPath = 'error';
  else if (normalized.isComparison && normalized.drugA && normalized.drugB) renderPath = 'comparison_view';
  else if (normalized.ndcData || normalized.recallData || normalized.adverseData || normalized.found === false) {
    const paths = [];
    if (normalized.ndcData) paths.push('ndc_card');
    if (normalized.recallData) paths.push('recall_card');
    if (normalized.adverseData) paths.push('adverse_charts');
    if (normalized.found === false) paths.push('not_found_message');
    renderPath = paths.join(' + ');
  }

  // STEP 4 TEMPORARY DEBUG LOGS
  const hasTopReactions = Boolean(normalized.adverseData && normalized.adverseData.topReactions.length > 0);
  const hasRecalls = Boolean(normalized.recallData);
  const hasNdc = Boolean(normalized.ndcData);
  const hasComparison = Boolean(normalized.isComparison && normalized.drugA && normalized.drugB);

  console.error("RAW PROPS", JSON.stringify(props, null, 2));
  console.error("STATE PAYLOAD", JSON.stringify(payload, null, 2));
  console.error("NORMALIZED", JSON.stringify(normalized, null, 2));
  console.error("RENDER PATH", {
    hasTopReactions,
    hasRecalls,
    hasNdc,
    hasComparison
  });

  const containerStyle: React.CSSProperties = {
    backgroundColor: THEME.bg.surface,
    color: THEME.text.primary,
    padding: '24px',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100px',
  };

  const handleDownloadCsv = () => {
    let csvContent = "";
    
    if (normalized.adverseData?.topReactions && normalized.adverseData.topReactions.length > 0) {
      csvContent += "Reaction,Count\n";
      normalized.adverseData.topReactions.forEach((row: any) => {
        csvContent += `"${row.reaction}",${row.count}\n`;
      });
      csvContent += "\n";
    }
    
    if (normalized.adverseData?.historicalTrends && normalized.adverseData.historicalTrends.length > 0) {
      csvContent += "Date,Count\n";
      normalized.adverseData.historicalTrends.forEach((row: any) => {
        csvContent += `"${row.time}",${row.count}\n`;
      });
    }

    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${normalized.ndcData?.brandName || normalized.ndcData?.genericName || 'drug_data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (normalized.loading) {
    return (
      <div style={{ ...containerStyle, textAlign: 'center' }}>
        <p>Loading drug information…</p>
      </div>
    );
  }

  if (normalized.error) {
    return (
      <div
        style={{
          ...containerStyle,
          color: THEME.accent.rose,
          border: `1px solid ${THEME.accent.rose}`,
        }}
      >
        <p>Error: {normalized.error}</p>
      </div>
    );
  }

  // 1. Comparison View
  if (normalized.isComparison && normalized.drugA && normalized.drugB) {
    const { drugA, drugB } = normalized;
    const reactionMap = new Map<string, { reaction: string; drugA: number; drugB: number }>();
    
    (drugA.adverseEvents || []).forEach(e => {
      reactionMap.set(e.reaction, { reaction: e.reaction, drugA: e.count, drugB: 0 });
    });
    (drugB.adverseEvents || []).forEach(e => {
      if (reactionMap.has(e.reaction)) {
        reactionMap.get(e.reaction)!.drugB = e.count;
      } else {
        reactionMap.set(e.reaction, { reaction: e.reaction, drugA: 0, drugB: e.count });
      }
    });

    const comparisonData = Array.from(reactionMap.values())
      .sort((a, b) => (b.drugA + b.drugB) - (a.drugA + a.drugB))
      .slice(0, 10);

    return (
      <div style={containerStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Drug A Header */}
          <div style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.accent.cyan}`, borderRadius: '8px', padding: '16px' }}>
            <h2 style={{ color: THEME.accent.cyan, fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0' }}>{drugA.name}</h2>
            <p style={{ color: THEME.text.muted, fontSize: '13px', margin: '0 0 8px 0' }}>Active Recalls: {drugA.recalls?.length || 0}</p>
            {drugA.recalls && drugA.recalls.length > 0 && (
              <div style={{ fontSize: '12px', color: THEME.accent.rose }}>
                {drugA.recalls.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}>⚠ {r.classification}: {r.reason.substring(0, 50)}...</div>
                ))}
              </div>
            )}
          </div>
          {/* Drug B Header */}
          <div style={{ backgroundColor: THEME.bg.card, border: `1px solid ${THEME.accent.rose}`, borderRadius: '8px', padding: '16px' }}>
            <h2 style={{ color: THEME.accent.rose, fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0' }}>{drugB.name}</h2>
            <p style={{ color: THEME.text.muted, fontSize: '13px', margin: '0 0 8px 0' }}>Active Recalls: {drugB.recalls?.length || 0}</p>
            {drugB.recalls && drugB.recalls.length > 0 && (
              <div style={{ fontSize: '12px', color: THEME.accent.rose }}>
                {drugB.recalls.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}>⚠ {r.classification}: {r.reason.substring(0, 50)}...</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dual Bar Chart */}
        {comparisonData.length > 0 && (
          <div style={{ backgroundColor: THEME.bg.card, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ color: THEME.text.primary, fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Side-by-Side Adverse Reactions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.bg.hover} opacity={0.3} />
                <XAxis dataKey="reaction" tick={{ fill: THEME.text.muted, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fill: THEME.text.muted, fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '16px', color: THEME.text.secondary, fontSize: '13px' }} />
                <Bar dataKey="drugA" name={drugA.name} fill={THEME.accent.cyan} radius={[4, 4, 0, 0]} />
                <Bar dataKey="drugB" name={drugB.name} fill={THEME.accent.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  const { ndcData, recallData, adverseData, found, message } = normalized;
  const hasAnySection = Boolean(ndcData || recallData || adverseData || found === false || message);

  return (
    <div style={containerStyle}>
      {/* 1.5 Header Actions */}
      {hasAnySection && (normalized.adverseData?.topReactions || normalized.adverseData?.historicalTrends) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            onClick={handleDownloadCsv}
            style={{
              backgroundColor: THEME.accent.cyan,
              color: THEME.bg.surface,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            Download CSV
          </button>
        </div>
      )}

      {/* 2. Render NDC Details Card if productNdc or manufacturer exists */}
      {ndcData && (
        <div
          style={{
            backgroundColor: THEME.bg.card,
            border: `1px solid ${THEME.accent.cyan}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <h2
            style={{
              color: THEME.accent.cyan,
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 12px 0',
            }}
          >
            {ndcData.brandName || ndcData.genericName || 'Drug Information'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
                NDC Code
              </p>
              <p style={{ color: THEME.text.primary, fontFamily: 'monospace', fontSize: '14px', margin: 0 }}>
                {ndcData.productNdc}
              </p>
            </div>
            <div>
              <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
                Manufacturer
              </p>
              <p style={{ color: THEME.accent.emerald, fontSize: '14px', margin: 0 }}>
                {ndcData.manufacturer}
              </p>
            </div>
          </div>
          {(ndcData.dosageForm || ndcData.productType) && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
              {ndcData.dosageForm && (
                <div>
                  <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
                    Dosage Form
                  </p>
                  <p style={{ color: THEME.text.secondary, fontSize: '13px', margin: 0 }}>
                    {ndcData.dosageForm}
                  </p>
                </div>
              )}
              {ndcData.productType && (
                <div>
                  <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
                    Product Type
                  </p>
                  <p style={{ color: THEME.text.secondary, fontSize: '13px', margin: 0 }}>
                    {ndcData.productType}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Render Dedicated Recall Card if recall data exists */}
      {recallData && (
        !recallData.hasActiveRecalls && recallData.recalls.length === 0 ? (
          <div
            style={{
              backgroundColor: THEME.accent.emerald,
              color: '#0f172a',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontWeight: 'bold',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✓</span>
            <span>No Active Recalls Found</span>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: THEME.bg.card,
              border: `1px solid ${THEME.accent.rose}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ color: THEME.accent.rose, fontWeight: 'bold', fontSize: '16px', marginBottom: '12px' }}>
              ⚠ Active Recalls Alert ({recallData.recallCount || recallData.recalls.length})
            </div>
            {recallData.recalls.length > 0 ? (
              recallData.recalls.map((recall, idx) => (
                <div key={idx} style={{ marginBottom: idx < recallData.recalls.length - 1 ? '12px' : '0', paddingBottom: idx < recallData.recalls.length - 1 ? '12px' : '0', borderBottom: idx < recallData.recalls.length - 1 ? `1px solid ${THEME.bg.hover}` : 'none' }}>
                  <div style={{ color: THEME.text.primary, fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                    [{recall.classification || 'Recall Notice'}] Status: {recall.status || 'Active'}
                  </div>
                  <div style={{ color: THEME.text.secondary, fontSize: '12px', lineHeight: '1.4' }}>
                    {recall.reason}
                  </div>
                  {recall.initiationDate && (
                    <div style={{ color: THEME.text.muted, fontSize: '11px', marginTop: '4px' }}>
                      Initiated: {recall.initiationDate}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: THEME.text.secondary, fontSize: '13px' }}>
                Active FDA enforcement recalls reported for this product.
              </div>
            )}
          </div>
        )
      )}

      {/* 4. Render Adverse Event Charts if adverse data exists */}
      {adverseData && (
        <>
          {adverseData.totalReports !== undefined && (
            <div style={{ color: THEME.text.muted, fontSize: '13px', marginBottom: '12px' }}>
              Total Reports Analyzed: <strong style={{ color: THEME.accent.cyan }}>{adverseData.totalReports.toLocaleString()}</strong>
            </div>
          )}

          {/* FDA Label Analysis Summary Card */}
          {adverseData.labelAnalysis && (
            <div
              style={{
                backgroundColor: THEME.bg.card,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                borderLeft: `4px solid ${adverseData.labelAnalysis.labelAvailable ? THEME.accent.emerald : THEME.text.muted}`,
              }}
            >
              <h3 style={{ color: THEME.text.primary, fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0' }}>FDA Label Analysis</h3>
              {adverseData.labelAnalysis.labelAvailable ? (
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', color: THEME.accent.emerald }}>✓</span>
                    <span style={{ color: THEME.text.secondary, fontSize: '14px' }}>Known Label Reactions: <strong style={{ color: THEME.text.primary }}>{adverseData.labelAnalysis.totalKnownWarnings}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔍</span>
                    <span style={{ color: THEME.text.secondary, fontSize: '14px' }}>Not Found in Label: <strong style={{ color: THEME.text.primary }}>{adverseData.labelAnalysis.totalPotentiallyUnlisted}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ color: THEME.text.muted, fontSize: '12px' }}>Source: FDA Drug Label</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: THEME.text.muted, fontSize: '14px' }}>FDA Label unavailable for this product.</div>
              )}
            </div>
          )}

          {/* Donut chart */}
          {adverseData.topReactions && adverseData.topReactions.length > 0 && (
            <div
              style={{
                backgroundColor: THEME.bg.card,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  color: THEME.accent.cyan,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 16px 0',
                }}
              >
                Top Adverse Reactions
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={adverseData.topReactions.slice(0, 6).map((i) => ({ name: i.reaction, value: i.count }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {adverseData.topReactions.slice(0, 6).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '16px',
                      color: THEME.text.secondary,
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar chart */}
          {adverseData.topReactions && adverseData.topReactions.length > 0 && (
            <div
              style={{
                backgroundColor: THEME.bg.card,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  color: THEME.accent.cyan,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 16px 0',
                }}
              >
                Event Count Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={adverseData.topReactions.slice(0, 6).map((i) => ({ reaction: i.reaction, count: i.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.bg.hover} opacity={0.3} />
                  <XAxis
                    dataKey="reaction"
                    tick={{ fill: THEME.text.muted, fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: THEME.text.muted, fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={THEME.accent.cyan} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Reaction Details List (Badges) */}
          {adverseData.topReactions && adverseData.topReactions.length > 0 && (
            <div style={{ backgroundColor: THEME.bg.card, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ color: THEME.text.primary, fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px 0' }}>Reaction Details</h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {adverseData.topReactions.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg.hover, padding: '12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: THEME.text.primary, fontWeight: 'bold', fontSize: '14px' }}>{item.reaction}</span>
                      <span style={{ color: THEME.text.muted, fontSize: '12px', marginLeft: '8px' }}>({item.count.toLocaleString()} reports)</span>
                      {item.matchedSection && (
                        <div style={{ color: THEME.text.muted, fontSize: '11px', marginTop: '4px' }}>
                          Section: <span style={{ color: THEME.text.secondary }}>{item.matchedSection.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {item.isKnownWarning === true ? (
                        <span title="This reaction appears in the official FDA drug label." style={{ backgroundColor: `${THEME.accent.amber}22`, color: THEME.accent.amber, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'help' }}>⚠️ Known FDA Warning</span>
                      ) : item.isKnownWarning === false ? (
                        <span title="This reaction was not matched in the official FDA label. This does not necessarily indicate a new safety signal." style={{ backgroundColor: `${THEME.accent.cyan}22`, color: THEME.accent.cyan, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'help' }}>🔍 Not Found in FDA Label</span>
                      ) : (
                        <span style={{ backgroundColor: `${THEME.text.muted}22`, color: THEME.text.muted, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>❔ Label Unavailable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seriousness Breakdown Donut */}
          {adverseData.seriousnessBreakdown && adverseData.seriousnessBreakdown.totalSerious > 0 && (
            <div
              style={{
                backgroundColor: THEME.bg.card,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  color: THEME.accent.cyan,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 16px 0',
                }}
              >
                Clinical Seriousness (100 Record Sample)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Death', value: adverseData.seriousnessBreakdown.death },
                      { name: 'Hospitalization', value: adverseData.seriousnessBreakdown.hospitalization },
                      { name: 'Life-Threatening', value: adverseData.seriousnessBreakdown.lifeThreatening },
                      { name: 'Disabling', value: adverseData.seriousnessBreakdown.disability },
                      { name: 'Other Serious', value: adverseData.seriousnessBreakdown.other },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {CHART_COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '16px',
                      color: THEME.text.secondary,
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Historical Trends Line Chart */}
          {Array.isArray(adverseData.historicalTrends) && adverseData.historicalTrends.length > 0 && (() => {
            let trendsData = adverseData.historicalTrends.map((item: any) => ({
              label: String(item.label || item.year || item.time || ''),
              count: Number(item.count || 0),
            }));

            // Downsample / slice to max 100 points if array exceeds limit
            if (trendsData.length > 100) {
              trendsData = trendsData.slice(-100);
            }

            return (
              <div
                style={{
                  backgroundColor: THEME.bg.card,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <h3
                  style={{
                    color: THEME.accent.cyan,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    margin: '0 0 16px 0',
                  }}
                >
                  Historical Trends (Yearly)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.bg.hover} opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fill: THEME.text.muted, fontSize: 12 }} />
                    <YAxis tick={{ fill: THEME.text.muted, fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke={THEME.accent.violet} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </>
      )}

      {/* Message when found === false */}
      {found === false && !hasAnySection && (
        <div
          style={{
            backgroundColor: THEME.bg.card,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: THEME.text.muted,
          }}
        >
          {message || 'No records found for this query in FDA database.'}
        </div>
      )}

      {/* 5. Fallback if no sections rendered */}
      {!hasAnySection && (
        <div
          style={{
            backgroundColor: THEME.bg.card,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: THEME.text.muted,
          }}
        >
          No drug data available
        </div>
      )}
    </div>
  );
}
