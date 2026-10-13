'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

type Match = {
  shoe?: { brand?: string; model?: string; size_us?: number; width_category?: string };
  score?: number;
  fit_score?: number;
  explanation?: string;
};

/**
 * Widget for the FitWise TOPSIS tool.  This route must exist because the
 * backend decorates the tool with @Widget('fitwise-recommendations').
 */
export default function FitWiseRecommendationsWidget() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<{ matches?: Match[]; recommendations?: Match[]; summary?: string }>();
  const matches = data?.matches ?? data?.recommendations ?? [];
  const dark = theme === 'dark';
  const background = dark ? '#18283c' : '#f6f0eb';
  const card = dark ? '#223952' : '#fffaf4';
  const text = dark ? '#f9f4ec' : '#334155';
  const muted = dark ? '#c9d5df' : '#64748b';

  return (
    <main style={{ maxWidth: 540, padding: 20, borderRadius: 20, background, color: text, fontFamily: 'ui-rounded, system-ui, sans-serif' }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ color: '#d07a5d', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>FITWISE</div>
        <h2 style={{ margin: '4px 0', fontSize: 21 }}>Dreamy fit recommendations</h2>
        <p style={{ margin: 0, color: muted, fontSize: 13 }}>{data?.summary ?? 'Your geometry and profile ranked against the available shoes.'}</p>
      </header>
      {matches.length ? matches.map((match, index) => (
        <article key={`${match.shoe?.brand}-${match.shoe?.model}-${index}`} style={{ padding: 14, marginTop: 10, borderRadius: 14, background: card, border: `1px solid ${dark ? '#37516a' : '#eadfd5'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ color: muted, fontSize: 11, fontWeight: 700 }}>#{index + 1} · {match.shoe?.brand ?? 'Shoe'}</div>
              <strong>{match.shoe?.model ?? 'Recommendation'}</strong>
              {match.shoe?.size_us && <span style={{ color: muted, fontSize: 12 }}> · US {match.shoe.size_us}</span>}
            </div>
            <strong style={{ color: '#5c9b7d' }}>Score {(match.score ?? match.fit_score ?? 0).toFixed(1)}</strong>
          </div>
          {match.explanation && <p style={{ margin: '8px 0 0', color: muted, fontSize: 12 }}>{match.explanation}</p>}
        </article>
      )) : <p style={{ color: muted, margin: 0 }}>No recommendations yet — submit a FitWise assessment first.</p>}
    </main>
  );
}
