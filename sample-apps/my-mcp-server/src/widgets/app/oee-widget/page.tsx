'use client';

import React from 'react';
import { createWidget, WidgetComponentProps } from '../../lib/createWidget';

export interface OeeData {
  station_id?: string;
  stationId?: string;
  status: string;
  availability?: number;
  performance?: number;
  quality?: number;
  oee_percent?: number;
  downtime_minutes?: number;
  estimatedHours?: number;
  estimated_cost?: number;
  totalCost?: number;
}

function OeeWidgetComponent({ data, theme }: WidgetComponentProps<OeeData>) {
  const isDark = theme === 'dark';
  const isRunning = data.status === 'RUNNING';
  
  const stationId = data.station_id || data.stationId || 'Unknown Station';
  const downtimeMins = data.downtime_minutes ?? (data.estimatedHours !== undefined ? Math.round(data.estimatedHours * 60) : 0);
  const cost = data.estimated_cost ?? data.totalCost ?? 0;

  const bg = isDark ? '#0d1117' : '#ffffff';
  const cardBg = isDark ? '#161b22' : '#f6f8fa';
  const textPrimary = isDark ? '#f0f6fc' : '#1f2328';
  const textSecondary = isDark ? '#8b949e' : '#656d76';
  const border = isDark ? '#30363d' : '#d0d7de';

  const oeeVal = data.oee_percent ?? 0;
  const oeeColor = oeeVal >= 80 ? '#238636' : oeeVal >= 50 ? '#d29922' : '#f85149';

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      style={{
        background: bg,
        color: textPrimary,
        padding: '24px',
        borderRadius: '16px',
        border: `1px solid ${border}`,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: '720px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Station Analytics & OEE
          </div>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 700 }}>
            {stationId}
          </h2>
        </div>
        <span
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            background: isRunning ? 'rgba(35, 134, 54, 0.15)' : 'rgba(248, 81, 73, 0.15)',
            color: isRunning ? '#3fb950' : '#ff7b72',
            border: `1px solid ${isRunning ? 'rgba(63, 185, 80, 0.3)' : 'rgba(255, 123, 114, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isRunning ? '#3fb950' : '#ff7b72',
              boxShadow: isRunning ? '0 0 8px #3fb950' : '0 0 8px #ff7b72',
            }}
          />
          {data.status}
        </span>
      </div>

      {/* Main OEE Score Gauge (if OEE data exists) */}
      {data.oee_percent !== undefined && (
        <div
          style={{
            background: cardBg,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${border}`,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 500 }}>Overall Equipment Effectiveness</div>
            <div style={{ fontSize: '38px', fontWeight: 800, color: oeeColor, marginTop: '2px' }}>
              {data.oee_percent}%
            </div>
          </div>
          <div style={{ width: '120px', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: textSecondary }}>Performance Status</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: oeeColor, marginTop: '4px' }}>
              {data.oee_percent >= 80 ? 'Optimal Performance' : data.oee_percent >= 50 ? 'Moderate Efficiency' : 'Requires Attention'}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Metrics */}
      {(data.availability !== undefined || data.performance !== undefined || data.quality !== undefined) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
          <MetricCard
            title="Availability"
            value={data.availability ? `${(data.availability * 100).toFixed(1)}%` : 'N/A'}
            percent={data.availability ?? 0}
            color="#58a6ff"
            theme={theme}
          />
          <MetricCard
            title="Performance"
            value={data.performance ? `${(data.performance * 100).toFixed(1)}%` : 'N/A'}
            percent={data.performance ?? 0}
            color="#bc8cff"
            theme={theme}
          />
          <MetricCard
            title="Quality Rate"
            value={data.quality ? `${(data.quality * 100).toFixed(1)}%` : 'N/A'}
            percent={data.quality ?? 0}
            color="#3fb950"
            theme={theme}
          />
        </div>
      )}

      {/* Downtime Alert Banner */}
      {(!isRunning || downtimeMins > 0 || cost > 0) && (
        <div
          style={{
            background: isDark ? 'rgba(248, 81, 73, 0.1)' : 'rgba(255, 235, 235, 1)',
            border: `1px solid ${isDark ? 'rgba(248, 81, 73, 0.4)' : '#ffcdd2'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f85149', fontWeight: 700, fontSize: '15px' }}>
              <span>⚠️</span> Station Downtime Alert
            </div>
            <div style={{ fontSize: '13px', color: textSecondary, marginTop: '4px' }}>
              Station is currently in <strong style={{ color: textPrimary }}>{data.status}</strong> mode. Total duration:{' '}
              <strong style={{ color: textPrimary }}>{downtimeMins} mins</strong>.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: textSecondary, textTransform: 'uppercase', fontWeight: 600 }}>
              Estimated Financial Cost
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f85149', marginTop: '2px' }}>
              {formatCurrency(cost)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  percent,
  color,
  theme,
}: {
  title: string;
  value: string;
  percent: number;
  color: string;
  theme: 'light' | 'dark' | null;
}) {
  const isDark = theme === 'dark';
  return (
    <div
      style={{
        background: isDark ? '#161b22' : '#f6f8fa',
        border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
        borderRadius: '10px',
        padding: '14px',
      }}
    >
      <div style={{ fontSize: '12px', color: isDark ? '#8b949e' : '#656d76', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0', color: isDark ? '#f0f6fc' : '#1f2328' }}>
        {value}
      </div>
      <div style={{ width: '100%', height: '5px', background: isDark ? '#21262d' : '#eaede0', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(Math.max(percent * 100, 0), 100)}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

export default createWidget<OeeData>(OeeWidgetComponent);
