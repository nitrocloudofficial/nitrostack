'use client';

import React from 'react';
import { createWidget, WidgetComponentProps } from '../../lib/createWidget';

export interface Vehicle {
  vin: string;
  model: string;
  trim: string;
  seat_type: string;
  status: string;
}

export interface AssemblyQueueData {
  shift?: string;
  line?: string;
  reason?: string;
  active_queue?: Vehicle[];
  new_sequence?: Vehicle[];
}

function AssemblyQueueWidgetComponent({ data, theme }: WidgetComponentProps<AssemblyQueueData>) {
  const isDark = theme === 'dark';

  const bg = isDark ? '#0d1117' : '#ffffff';
  const cardBg = isDark ? '#161b22' : '#f6f8fa';
  const textPrimary = isDark ? '#f0f6fc' : '#1f2328';
  const textSecondary = isDark ? '#8b949e' : '#656d76';
  const border = isDark ? '#30363d' : '#d0d7de';

  const vehicles: Vehicle[] = data.active_queue || data.new_sequence || [];

  const getSeatTagStyle = (seatType: string) => {
    const seatUpper = seatType.toUpperCase();
    if (seatUpper.includes('RED') || seatUpper.includes('LEATHER')) {
      return {
        bg: isDark ? 'rgba(218, 54, 51, 0.2)' : '#ffebe9',
        color: isDark ? '#ff7b72' : '#cf222e',
        border: isDark ? 'rgba(248, 81, 73, 0.4)' : '#ffc5c2',
      };
    }
    if (seatUpper.includes('BLACK') || seatUpper.includes('FABRIC')) {
      return {
        bg: isDark ? 'rgba(110, 118, 129, 0.2)' : '#f3f4f6',
        color: isDark ? '#c9d1d9' : '#24292f',
        border: isDark ? 'rgba(110, 118, 129, 0.4)' : '#d0d7de',
      };
    }
    return {
      bg: isDark ? 'rgba(56, 139, 253, 0.2)' : '#ddf4ff',
      color: isDark ? '#58a6ff' : '#0969da',
      border: isDark ? 'rgba(56, 139, 253, 0.4)' : '#54aef5',
    };
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
        maxWidth: '780px',
        boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Assembly Queue Sequence
          </div>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 700 }}>
            {data.shift && data.line ? `Shift ${data.shift} — Line ${data.line}` : 'Resequenced Build Queue'}
          </h2>
          {data.reason && (
            <div style={{ fontSize: '13px', color: '#d29922', marginTop: '4px', fontWeight: 500 }}>
              ⚡ Resequence Reason: <strong>{data.reason}</strong>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              background: isDark ? '#21262d' : '#eaede0',
              color: textPrimary,
              border: `1px solid ${border}`,
            }}
          >
            {vehicles.length} Vehicles Queued
          </span>
        </div>
      </div>

      {/* Vehicle VIN Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {vehicles.map((car, idx) => {
          const seatStyle = getSeatTagStyle(car.seat_type);
          return (
            <div
              key={car.vin || idx}
              style={{
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Left Side: Sequence # & VIN Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isDark ? '#21262d' : '#e1e4e8',
                    color: textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  #{idx + 1}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
                        fontWeight: 700,
                        fontSize: '15px',
                        color: isDark ? '#58a6ff' : '#0969da',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {car.vin}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isDark ? '#30363d' : '#e1e4e8',
                        color: textPrimary,
                      }}
                    >
                      {car.model}
                    </span>
                    <span style={{ fontSize: '12px', color: textSecondary }}>{car.trim} Trim</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Seat Status Tag & Vehicle Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Seat Tag */}
                <span
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: seatStyle.bg,
                    color: seatStyle.color,
                    border: `1px solid ${seatStyle.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: seatStyle.color }} />
                  {car.seat_type}
                </span>

                {/* Status Badge */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: isDark ? 'rgba(35, 134, 54, 0.15)' : '#e6ffec',
                    color: isDark ? '#3fb950' : '#1a7f37',
                  }}
                >
                  {car.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default createWidget<AssemblyQueueData>(AssemblyQueueWidgetComponent);
