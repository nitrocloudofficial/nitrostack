'use client';

import React from 'react';
import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

interface ShoeMatch {
  shoe: {
    brand: string;
    model: string;
    size_us: number;
    size_eu: number;
    length_mm: number;
    width_mm: number;
    ratio: number;
    width_category: string;
    url: string;
    price_usd?: number;
  };
  fit_score: number;
  ratio_delta: number;
  fit_summary: string;
}

interface MatchData {
  foot: { length_mm: number; width_mm: number; ratio: number };
  matches: ShoeMatch[];
  total_candidates: number;
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = Math.max(5, Math.min(100, 100 - (score / maxScore) * 100));
  const color = score < 15 ? '#10b981' : score < 30 ? '#f59e0b' : '#ef4444';
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: `${color}22`,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.6s ease-out',
        }}
      />
    </div>
  );
}

export default function ShoeRecommendationsWidget() {
  const theme = useTheme();
  const { getToolOutput, openExternal } = useWidgetSDK();
  const [state, setState] = useWidgetState<{
    expanded: number | null;
    brandFilter: string | null;
  }>(() => ({
    expanded: 0,
    brandFilter: null,
  }));
  const data = getToolOutput<MatchData>();
  const isDark = theme === 'dark';

  if (!data?.matches?.length) {
    return (
      <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>
        No shoe matches yet — measure your foot first.
      </div>
    );
  }

  const bg = isDark ? '#0f172a' : '#fafafa';
  const card = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  // Extract unique brands for filter badges
  const brands = [...new Set(data.matches.map((m) => m.shoe.brand))];
  const filteredMatches = state?.brandFilter
    ? data.matches.filter((m) => m.shoe.brand === state.brandFilter)
    : data.matches;
  const maxScore = Math.max(...data.matches.map((m) => m.fit_score), 1);

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        borderRadius: 16,
        maxWidth: 480,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: text }}>👟 Top Matches</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: muted }}>
          Foot {data.foot.length_mm}×{data.foot.width_mm} mm · ratio {data.foot.ratio} ·{' '}
          {data.total_candidates} candidates
        </p>
      </div>

      {/* Brand filter badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        <button
          onClick={() => setState({ ...state, brandFilter: null })}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: !state?.brandFilter
              ? '#6366f1'
              : isDark
                ? '#334155'
                : '#e2e8f0',
            color: !state?.brandFilter
              ? '#fff'
              : isDark
                ? '#cbd5e1'
                : '#475569',
          }}
        >
          All
        </button>
        {brands.map((brand) => (
          <button
            key={brand}
            onClick={() =>
              setState({
                ...state,
                brandFilter: state?.brandFilter === brand ? null : brand,
              })
            }
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background:
                state?.brandFilter === brand
                  ? '#6366f1'
                  : isDark
                    ? '#334155'
                    : '#e2e8f0',
              color:
                state?.brandFilter === brand
                  ? '#fff'
                  : isDark
                    ? '#cbd5e1'
                    : '#475569',
            }}
          >
            {brand}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredMatches.map((match, index) => {
          const expanded = state?.expanded === index;
          const scoreColor =
            match.fit_score < 15 ? '#10b981' : match.fit_score < 30 ? '#f59e0b' : '#ef4444';

          return (
            <div
              key={`${match.shoe.brand}-${match.shoe.model}-${match.shoe.size_us}`}
              style={{
                background: card,
                borderRadius: 12,
                padding: 14,
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                cursor: 'pointer',
              }}
              onClick={() => setState({ ...state, expanded: expanded ? null : index })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>
                    #{index + 1} · {match.shoe.brand}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: text, marginTop: 2 }}>
                    {match.shoe.model}
                  </div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                    US {match.shoe.size_us} / EU {match.shoe.size_eu} ·{' '}
                    {match.shoe.width_category.replace('_', ' ')}
                  </div>
                  <ScoreBar score={match.fit_score} maxScore={maxScore} />
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: scoreColor,
                      background: `${scoreColor}22`,
                      padding: '4px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Fit {match.fit_score.toFixed(1)}
                  </div>
                  {match.shoe.price_usd && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: text, marginTop: 6 }}>
                      ${match.shoe.price_usd.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                  <p style={{ fontSize: 12, color: muted, margin: '0 0 8px' }}>{match.fit_summary}</p>
                  <div style={{ fontSize: 11, color: muted }}>
                    Shoe ratio {match.shoe.ratio} · Δ{match.ratio_delta} ·{' '}
                    {match.shoe.length_mm}×{match.shoe.width_mm} mm
                  </div>
                  {match.shoe.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openExternal(match.shoe.url);
                      }}
                      style={{
                        marginTop: 10,
                        padding: '6px 12px',
                        fontSize: 11,
                        borderRadius: 6,
                        border: 'none',
                        background: '#3b82f6',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      View on brand site →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
