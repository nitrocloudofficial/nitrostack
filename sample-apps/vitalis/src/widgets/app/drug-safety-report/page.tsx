'use client';

import React, { useState } from 'react';
import { useWidgetSDK, useTheme, useWidgetState } from '@nitrostack/widgets';

export default function DrugSafetyReportWidget() {
  const { getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<any>();
  const theme = useTheme();
  const isDark = theme === 'dark';
  const [widgetState, setWidgetState] = useWidgetState(() => ({ expandedIndex: 0 as number | null }));
  const [labelDetails, setLabelDetails] = useState<Record<string, any> | null>(null);
  const [labelLoading, setLabelLoading] = useState<string | null>(null);
  const expandedIndex = typeof widgetState?.expandedIndex === 'number' ? widgetState.expandedIndex : null;

  const bg = isDark ? '#111827' : '#ffffff';
  const cardBg = isDark ? '#1f2937' : '#f9fafb';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const mutedText = isDark ? '#9ca3af' : '#4b5563';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  const report = data ?? {
    interactions: [
      {
        pair: ['warfarin', 'aspirin'],
        severity_band: 'major',
        evidence_excerpt:
          'Aspirin may increase the anticoagulant effect of warfarin. Concomitant use of aspirin and warfarin increases the risk of severe upper gastrointestinal bleeding.',
        source: 'fda_label',
      },
    ],
    drugs_without_labels: [],
    methodology_note: 'Cross-scanned FDA drug label interaction text.',
  };

  const severityBadge: Record<string, { bg: string; color: string }> = {
    contraindicated: { bg: '#dc2626', color: '#ffffff' },
    major: { bg: '#ef4444', color: '#ffffff' },
    moderate: { bg: '#f59e0b', color: '#ffffff' },
    minor: { bg: '#10b981', color: '#ffffff' },
    unknown: { bg: '#6b7280', color: '#ffffff' },
  };

  const loadLabel = async (drug: string) => {
    setLabelLoading(drug);
    try {
      const response = await callTool('drug_get_label_info', { drug_name: drug });
      setLabelDetails((response.structuredContent as Record<string, any> | undefined) ?? JSON.parse(response.result));
    } catch {
      setLabelDetails({ error: 'Unable to load FDA label information.' });
    } finally {
      setLabelLoading(null);
    }
  };

  return (
    <div style={{ backgroundColor: bg, color: textColor, fontFamily: 'system-ui, sans-serif', padding: '16px', borderRadius: '12px', border: `1px solid ${borderColor}`, maxWidth: '640px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>FDA Drug Interaction Analysis</h3>
      <div style={{ color: mutedText, fontSize: '11px', marginBottom: '12px' }}>
        Evidence is shown as a pair list because FDA label evidence is not a complete N×N interaction matrix.
      </div>

      {/* Interactions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {report.interactions?.map((item: any, idx: number) => {
          const badge = severityBadge[item.severity_band] ?? severityBadge.unknown;
          const isExpanded = expandedIndex === idx;

          return (
            <div key={idx} style={{ backgroundColor: cardBg, borderRadius: '8px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
              <div
                onClick={() => setWidgetState({ ...widgetState, expandedIndex: isExpanded ? null : idx })}
                style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div>
                  <strong style={{ fontSize: '14px' }}>{item.pair?.[0]} ↔ {item.pair?.[1]}</strong>
                  <div style={{ fontSize: '11px', color: mutedText, marginTop: '2px' }}>Source: FDA Drug Label Text</div>
                </div>
                <span style={{ backgroundColor: badge.bg, color: badge.color, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {item.severity_band}
                </span>
              </div>

              {isExpanded && (
                <div style={{ padding: '12px', borderTop: `1px solid ${borderColor}`, backgroundColor: isDark ? '#111827' : '#ffffff', fontSize: '12px', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: mutedText }}>FDA LABEL EVIDENCE EXCERPT:</div>
                  <div style={{ fontStyle: 'italic', color: textColor }}>&quot;{item.evidence_excerpt}&quot;</div>
                  {item.pair?.[0] && (
                    <button onClick={() => void loadLabel(item.pair[0])} disabled={labelLoading === item.pair[0]} style={{ marginTop: '8px', border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, borderRadius: '5px', padding: '5px 7px', fontSize: '10px', cursor: 'pointer' }}>
                      {labelLoading === item.pair[0] ? 'Loading FDA label…' : `View ${item.pair[0]} label`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {labelDetails && (
        <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '11px' }}>
          <strong>FDA label details</strong>
          <pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{labelDetails.error ?? JSON.stringify(labelDetails, null, 2)}</pre>
        </div>
      )}

      {/* Missing Labels Note */}
      {report.drugs_without_labels && report.drugs_without_labels.length > 0 && (
        <div style={{ fontSize: '12px', color: mutedText, backgroundColor: cardBg, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderColor}` }}>
          ℹ️ No official FDA labels found for: {report.drugs_without_labels.join(', ')}
        </div>
      )}

      {report.methodology_note && (
        <div style={{ color: mutedText, fontSize: '11px', marginTop: '10px' }}>{report.methodology_note}</div>
      )}
    </div>
  );
}
