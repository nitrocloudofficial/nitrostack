'use client';

import React from 'react';
import { useWidgetSDK, useTheme, useWidgetState } from '@nitrostack/widgets';

export default function TrialListWidget() {
  const { getToolOutput, openExternal } = useWidgetSDK();
  const data = getToolOutput<any>();
  const theme = useTheme();
  const [widgetState, setWidgetState] = useWidgetState(() => ({ recruitingOnly: false }));
  const isDark = theme === 'dark';

  const bg = isDark ? '#111827' : '#ffffff';
  const cardBg = isDark ? '#1f2937' : '#f9fafb';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const mutedText = isDark ? '#9ca3af' : '#4b5563';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  const trialsData = data ?? {
    total_count: 12,
    trials: [
      {
        nct_id: 'NCT04567890',
        title: 'Phase 3 Study of SGLT2 Inhibitor in Type 2 Diabetes',
        overall_status: 'RECRUITING',
        phases: ['PHASE3'],
        conditions: ['Type 2 Diabetes Mellitus'],
        lead_sponsor: 'Global Pharma Institute',
        start_date: '2024-01-15',
        locations: [{ city: 'Boston', country: 'United States' }],
        url: 'https://clinicaltrials.gov/study/NCT04567890',
      },
    ],
  };

  const safeTrialUrl = (url: unknown): url is string => typeof url === 'string' && /^https:\/\/clinicaltrials\.gov\//i.test(url);
  const visibleTrials = trialsData.trials?.filter((trial: any) => !widgetState?.recruitingOnly || trial.overall_status === 'RECRUITING') ?? [];

  return (
    <div style={{ backgroundColor: bg, color: textColor, fontFamily: 'system-ui, sans-serif', padding: '16px', borderRadius: '12px', border: `1px solid ${borderColor}`, maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Clinical Trials Directory</h3>
        <span style={{ fontSize: '12px', color: mutedText }}>Showing {visibleTrials.length} of {trialsData.total_count} studies</span>
      </div>
      <label style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', fontSize: '11px', marginBottom: '12px' }}>
        <input type="checkbox" checked={Boolean(widgetState?.recruitingOnly)} onChange={(event) => setWidgetState({ ...widgetState, recruitingOnly: event.target.checked })} />
        Recruiting only
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {visibleTrials.map((trial: any, idx: number) => {
          const isRecruiting = trial.overall_status === 'RECRUITING';
          return (
            <div key={idx} style={{ backgroundColor: cardBg, padding: '14px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: isRecruiting ? '#10b98120' : '#6b728020', color: isRecruiting ? '#10b981' : '#6b7280', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  {trial.overall_status}
                </span>
                {trial.phases?.map((p: string, i: number) => (
                  <span key={i} style={{ backgroundColor: '#2563eb20', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    {p}
                  </span>
                ))}
              </div>

              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', lineHeight: '1.4' }}>{trial.title}</h4>

              <div style={{ fontSize: '12px', color: mutedText, marginBottom: '8px' }}>
                Sponsor: {trial.lead_sponsor ?? 'Unspecified'} • Start: {trial.start_date ?? 'N/A'}
              </div>

              {safeTrialUrl(trial.url) && (
                <button
                  onClick={() => openExternal(trial.url)}
                  style={{ display: 'inline-block', color: '#2563eb', background: 'transparent', border: 0, padding: 0, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  View Protocol on ClinicalTrials.gov →
                </button>
              )}
            </div>
          );
        })}
        {visibleTrials.length === 0 && <div style={{ color: mutedText, fontSize: '12px' }}>No trials match this filter.</div>}
      </div>
    </div>
  );
}
