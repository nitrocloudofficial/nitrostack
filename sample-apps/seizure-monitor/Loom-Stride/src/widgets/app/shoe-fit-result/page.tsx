'use client';

import React from 'react';
import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';

interface FullFitData {
  measurement: {
    length_mm: number;
    width_mm: number;
    ratio: number;
    confidence: number;
    coin_label: string;
    width_category: string;
  };
  recommendations: {
    matches: Array<{
      shoe: {
        brand: string;
        model: string;
        size_us: number;
        size_eu: number;
        width_category: string;
        price_usd?: number;
        url: string;
      };
      fit_score: number;
      fit_summary: string;
    }>;
    total_candidates: number;
  };
  database_stats: { total_records: number; brands: string[] };
}

function FitScoreBar({ score, isDark }: { score: number; isDark: boolean }) {
  const pct = Math.max(8, Math.min(100, 100 - score * 1.5));
  const color = score < 15 ? '#10b981' : score < 30 ? '#f59e0b' : '#ef4444';
  return (
    <div
      style={{
        height: 3,
        borderRadius: 2,
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        overflow: 'hidden',
        marginTop: 4,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.5s ease-out',
        }}
      />
    </div>
  );
}

export default function ShoeFitResultWidget() {
  const theme = useTheme();
  const { getToolOutput, openExternal, sendFollowUpMessage, callTool } = useWidgetSDK();
  const [state, setState] = useWidgetState<{
    tab: 'overview' | 'shoes';
    refreshing: boolean;
  }>(() => ({
    tab: 'overview',
    refreshing: false,
  }));
  const data = getToolOutput<FullFitData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{ padding: 24, color: isDark ? '#fff' : '#111' }}>
        Upload a foot + coin photo to get your ShoeFit analysis.
      </div>
    );
  }

  const { measurement: m, recommendations: r } = data;
  const top = r.matches[0];
  const gradient = isDark
    ? 'linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #0f172a 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)';

  const handleRefreshDb = async () => {
    setState({ ...state, refreshing: true });
    try {
      await callTool('refresh_shoe_database', { force: false });
    } catch {
      // handled by host
    } finally {
      setState({ ...state, refreshing: false });
    }
  };

  return (
    <div
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        maxWidth: 460,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
      }}
    >
      {/* Hero header */}
      <div style={{ background: gradient, padding: '24px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: 1 }}>SHOEFIT ANALYSIS</div>
          <div
            style={{
              fontSize: 10,
              padding: '3px 8px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              fontWeight: 600,
            }}
          >
            {data.database_stats.brands.length} brands · {data.database_stats.total_records} sizes
          </div>
        </div>
        <h1 style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800 }}>Your perfect fit</h1>
        <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.9 }}>
          {m.length_mm} mm × {m.width_mm} mm · ratio {m.ratio} ·{' '}
          {Math.round(m.confidence * 100)}% confidence
        </p>
      </div>

      <div
        style={{
          background: isDark ? '#1e293b' : '#fff',
          padding: 16,
        }}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['overview', 'shoes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setState({ ...state, tab })}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background:
                  state?.tab === tab
                    ? isDark
                      ? '#6366f1'
                      : '#ede9fe'
                    : isDark
                      ? '#334155'
                      : '#f1f5f9',
                color:
                  state?.tab === tab
                    ? isDark
                      ? '#fff'
                      : '#5b21b6'
                    : isDark
                      ? '#cbd5e1'
                      : '#475569',
              }}
            >
              {tab === 'overview' ? '📏 Overview' : '👟 Matches'}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {state?.tab === 'overview' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <Stat label="Length" value={`${m.length_mm} mm`} dark={isDark} />
              <Stat label="Width" value={`${m.width_mm} mm`} dark={isDark} />
              <Stat label="Ratio" value={String(m.ratio)} dark={isDark} />
              <Stat label="Profile" value={m.width_category.replace('_', ' ')} dark={isDark} />
            </div>
            {top && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: isDark ? '#0f172a' : '#f8fafc',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                  BEST MATCH
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    marginTop: 4,
                  }}
                >
                  {top.shoe.brand} {top.shoe.model}
                </div>
                <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                  US {top.shoe.size_us} · {top.fit_summary}
                </div>
                <FitScoreBar score={top.fit_score} isDark={isDark} />
              </div>
            )}

            {/* Refresh DB button */}
            <button
              onClick={handleRefreshDb}
              disabled={state?.refreshing}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: 'transparent',
                color: isDark ? '#94a3b8' : '#64748b',
                cursor: state?.refreshing ? 'wait' : 'pointer',
                fontSize: 11,
                opacity: state?.refreshing ? 0.6 : 1,
              }}
            >
              {state?.refreshing ? '🔄 Refreshing database…' : '🔄 Refresh shoe database'}
            </button>

            <p
              style={{
                fontSize: 11,
                color: isDark ? '#64748b' : '#94a3b8',
                margin: '10px 0 0',
              }}
            >
              {data.database_stats.total_records} sizes across {data.database_stats.brands.length}{' '}
              brands · coin: {m.coin_label}
            </p>
          </div>
        )}

        {/* Shoes tab */}
        {state?.tab === 'shoes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {r.matches.slice(0, 6).map((match, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: isDark ? '#0f172a' : '#f8fafc',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                      {match.shoe.brand} {match.shoe.model}
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                      US {match.shoe.size_us} / EU {match.shoe.size_eu} ·{' '}
                      {match.shoe.width_category.replace('_', ' ')}
                    </div>
                    <FitScoreBar score={match.fit_score} isDark={isDark} />
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: match.fit_score < 15 ? '#10b981' : '#f59e0b',
                        fontWeight: 700,
                      }}
                    >
                      {match.fit_score.toFixed(1)}
                    </span>
                    {match.shoe.price_usd && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', marginTop: 4 }}>
                        ${match.shoe.price_usd}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() =>
                sendFollowUpMessage(
                  'Show me wide alternatives for my foot ratio and compare Nike vs New Balance'
                )
              }
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 8,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Ask for more alternatives
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: dark ? '#0f172a' : '#f8fafc',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, color: dark ? '#64748b' : '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a' }}>{value}</div>
    </div>
  );
}
