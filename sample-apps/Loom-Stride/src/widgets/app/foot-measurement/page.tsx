'use client';

import React from 'react';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface FootMeasurementData {
  length_mm: number;
  width_mm: number;
  ratio: number;
  confidence: number;
  coin_label: string;
  width_category: string;
  pixels_per_mm: number;
  notes: string[];
  sizing_tip?: string;
}

function ConfidenceRing({ confidence, isDark }: { confidence: number; isDark: boolean }) {
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - confidence * circumference;
  const color = confidence >= 0.85 ? '#10b981' : confidence >= 0.7 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isDark ? '#f8fafc' : '#0f172a'}
        fontSize="13"
        fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {Math.round(confidence * 100)}%
      </text>
    </svg>
  );
}

export default function FootMeasurementWidget() {
  const theme = useTheme();
  const { getToolOutput, callTool } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ showNotes: boolean; searching: boolean }>(() => ({
    showNotes: false,
    searching: false,
  }));
  const data = getToolOutput<FootMeasurementData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: isDark ? '#fff' : '#111' }}>
        Waiting for foot measurement…
      </div>
    );
  }

  const cardBg = isDark
    ? 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)'
    : 'linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 100%)';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  const handleFindShoes = async () => {
    setState({ ...state, searching: true });
    try {
      await callTool('find_matching_shoes', {
        length_mm: data.length_mm,
        width_mm: data.width_mm,
        ratio: data.ratio,
        limit: 8,
      });
    } catch {
      // Tool invocation handled by host
    } finally {
      setState({ ...state, searching: false });
    }
  };

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 16,
        background: cardBg,
        color: text,
        maxWidth: 420,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <ConfidenceRing confidence={data.confidence} isDark={isDark} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Foot Measured</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: muted }}>
            Calibrated with {data.coin_label}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Length', value: `${data.length_mm} mm`, icon: '↕️' },
          { label: 'Width', value: `${data.width_mm} mm`, icon: '↔️' },
          { label: 'Ratio', value: data.ratio.toFixed(3), icon: '📐' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
              borderRadius: 12,
              padding: 14,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18 }}>{item.icon}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{item.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: 10,
          background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.12)',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13 }}>
          Width profile: <strong>{data.width_category.replace('_', ' ')}</strong>
        </span>
        <span
          style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
            color: '#6366f1',
            fontWeight: 600,
          }}
        >
          {data.pixels_per_mm.toFixed(1)} px/mm
        </span>
      </div>

      {data.sizing_tip && (
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, margin: '0 0 12px' }}>
          {data.sizing_tip}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setState({ ...state, showNotes: !state?.showNotes })}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
            background: 'transparent',
            color: text,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {state?.showNotes ? 'Hide' : 'Show'} notes
        </button>
        <button
          onClick={handleFindShoes}
          disabled={state?.searching}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            cursor: state?.searching ? 'wait' : 'pointer',
            fontSize: 12,
            fontWeight: 600,
            opacity: state?.searching ? 0.7 : 1,
          }}
        >
          {state?.searching ? 'Searching…' : '👟 Find shoes'}
        </button>
      </div>

      {state?.showNotes && data.notes?.length > 0 && (
        <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 11, color: muted }}>
          {data.notes.map((note, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
