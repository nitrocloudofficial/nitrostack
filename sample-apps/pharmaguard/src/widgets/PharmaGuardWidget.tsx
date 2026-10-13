'use client';

import React from 'react';
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
} from 'recharts';
import type { PharmaGuardPayload, AdverseReaction } from './types.js';

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

// ── Custom Tooltip for Charts ────────────────────────────────────────────────
interface TooltipPayload {
  name?: string;
  value?: number;
  payload?: { reaction?: string; count?: number };
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const reaction = data.payload?.reaction || data.name || 'Unknown';
  const count = data.value || data.payload?.count || 0;

  return (
    <div
      style={{
        backgroundColor: THEME.bg.card,
        border: `1px solid ${THEME.accent.cyan}`,
        borderRadius: '6px',
        padding: '8px 12px',
      }}
    >
      <p style={{ color: THEME.text.primary, margin: '0 0 4px 0', fontSize: '12px' }}>
        <strong>{reaction}</strong>
      </p>
      <p style={{ color: THEME.accent.cyan, margin: 0, fontSize: '12px' }}>
        Count: {count}
      </p>
    </div>
  );
};

// ── Header Card ──────────────────────────────────────────────────────────────
interface HeaderCardProps {
  drugName: string;
  ndc: string;
  manufacturer: string;
  dosageForm?: string;
}

const HeaderCard: React.FC<HeaderCardProps> = ({
  drugName,
  ndc,
  manufacturer,
  dosageForm,
}) => (
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
      {drugName}
    </h2>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div>
        <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
          NDC Code
        </p>
        <p
          style={{
            color: THEME.text.primary,
            fontFamily: 'monospace',
            fontSize: '14px',
            margin: 0,
          }}
        >
          {ndc}
        </p>
      </div>
      <div>
        <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
          Manufacturer
        </p>
        <p style={{ color: THEME.accent.emerald, fontSize: '14px', margin: 0 }}>
          {manufacturer}
        </p>
      </div>
    </div>
    {dosageForm && (
      <div style={{ marginTop: '12px' }}>
        <p style={{ color: THEME.text.muted, fontSize: '12px', margin: '0 0 4px 0' }}>
          Dosage Form
        </p>
        <p style={{ color: THEME.text.secondary, fontSize: '13px', margin: 0 }}>
          {dosageForm}
        </p>
      </div>
    )}
  </div>
);

// ── Status Badge ─────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  hasRecalls: boolean;
  recalls: Array<{ reason: string; classification: string; status: string }>;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ hasRecalls, recalls }) => {
  if (!hasRecalls) {
    return (
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
        <span>No Active Recalls</span>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: THEME.accent.rose,
        color: '#fff',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '16px',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
        ⚠ Active Recalls ({recalls.length})
      </div>
      <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
        {recalls.map((recall, idx) => (
          <div key={idx} style={{ marginBottom: idx < recalls.length - 1 ? '6px' : 0 }}>
            <strong>{recall.classification}</strong>: {recall.reason}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Donut Chart (PieChart) ───────────────────────────────────────────────────
interface DonutChartProps {
  data: AdverseReaction[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: THEME.bg.card,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          textAlign: 'center',
          color: THEME.text.muted,
        }}
      >
        No adverse event data available
      </div>
    );
  }

  const chartData = data.slice(0, 6).map((item) => ({
    name: item.reaction,
    value: item.count,
  }));

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
        Top Adverse Reactions
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {chartData.map((_, index) => (
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
  );
};

// ── Bar Chart ────────────────────────────────────────────────────────────────
interface BarChartProps {
  data: AdverseReaction[];
}

const EventCountBarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.slice(0, 6).map((item) => ({
    reaction: item.reaction,
    count: item.count,
  }));

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
        Event Count Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={THEME.bg.hover}
            opacity={0.3}
          />
          <XAxis
            dataKey="reaction"
            tick={{ fill: THEME.text.muted, fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: THEME.text.muted, fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill={THEME.accent.cyan}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Main Widget Component ────────────────────────────────────────────────────
interface PharmaGuardWidgetProps {
  payload: PharmaGuardPayload;
}

export const PharmaGuardWidget: React.FC<PharmaGuardWidgetProps> = ({ payload }) => {
  const { drug, adverseEvents, recalls, loading, error } = payload;

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: THEME.bg.surface,
          color: THEME.text.primary,
          padding: '24px',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p>Loading drug information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: THEME.bg.surface,
          color: THEME.accent.rose,
          padding: '24px',
          borderRadius: '8px',
          border: `1px solid ${THEME.accent.rose}`,
        }}
      >
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!drug) {
    return (
      <div
        style={{
          backgroundColor: THEME.bg.surface,
          color: THEME.text.muted,
          padding: '24px',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p>No drug data available</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: THEME.bg.surface,
        color: THEME.text.primary,
        padding: '24px',
        borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <HeaderCard
        drugName={drug.name}
        ndc={drug.ndc}
        manufacturer={drug.manufacturer}
        dosageForm={drug.dosageForm}
      />

      <StatusBadge
        hasRecalls={recalls.length > 0}
        recalls={recalls}
      />

      {adverseEvents.length > 0 && (
        <>
          <DonutChart data={adverseEvents} />
          <EventCountBarChart data={adverseEvents} />
        </>
      )}

      {adverseEvents.length === 0 && (
        <div
          style={{
            backgroundColor: THEME.bg.card,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            color: THEME.text.muted,
          }}
        >
          No adverse event data available for this drug
        </div>
      )}
    </div>
  );
};

export default PharmaGuardWidget;
