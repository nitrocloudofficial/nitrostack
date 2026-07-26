'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

interface Trial {
  nctId: string;
  title: string;
  phase: string;
  sponsor: string;
  overallStatus: string;
  eligibilityScore: number;
  matchedCriteria?: string[];
  unmatchedCriteria?: string[];
  contactEmail?: string;
}

interface TrialData {
  condition: string;
  trials: Trial[];
}

/**
 * Clinical Copilot - TrialCard Widget
 *
 * Displays clinical trial search results, match percentage, and eligibility criteria.
 */
export default function TrialCardWidget() {
  const theme = useTheme();
  const { getToolOutput, isReady } = useWidgetSDK();
  const data = getToolOutput<TrialData>();

  if (!isReady) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>Connecting to host...</div>;
  }

  if (!data || !data.trials || data.trials.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center' }}>No matching clinical trials found.</div>;
  }

  const isDark = theme === 'dark';

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '460px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>
        🔬 Clinical Trials ({data.condition})
      </h3>

      {data.trials.map((trial) => (
        <div key={trial.nctId} style={{
          padding: '16px',
          borderRadius: '8px',
          background: isDark ? '#0f172a' : '#f8fafc',
          border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#38bdf8' : '#0284c7' }}>
              {trial.nctId} | {trial.phase}
            </span>
            <span style={{
              fontSize: '12px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: trial.eligibilityScore >= 80 ? '#16a34a' : '#d97706',
              color: '#fff',
              fontWeight: 'bold',
            }}>
              {trial.eligibilityScore}% Match
            </span>
          </div>

          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>{trial.title}</h4>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Sponsor: {trial.sponsor}</div>

          {trial.matchedCriteria && trial.matchedCriteria.length > 0 && (
            <div style={{ fontSize: '12px', color: isDark ? '#4ade80' : '#15803d', marginBottom: '4px' }}>
              ✓ Matched: {trial.matchedCriteria.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
