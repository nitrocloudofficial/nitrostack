'use client';

import React from 'react';
import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

// ─────────────────────────────────────────────
// Data Types (mirrors dock.service.ts output)
// ─────────────────────────────────────────────
interface DockRescheduleData {
  truckId: string;
  originalDoorId: string;
  newDoorId: string;
  newDoorLabel: string;
  originalArrival: string;
  newScheduledArrival: string;
  shiftedBy: number; // minutes
  affectedWorkers: string[];
  message: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function minutesToHM(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─────────────────────────────────────────────
// Timeline Slot Component
// ─────────────────────────────────────────────
function TimelineSlot({
  label, doorId, time, date, status, isDark,
}: {
  label: string; doorId: string; time: string; date: string;
  status: 'original' | 'rescheduled' | 'active';
  isDark: boolean;
}) {
  const statusConfig = {
    original: { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)', icon: '⚪', tag: 'ORIGINAL' },
    rescheduled: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.4)', icon: '🟢', tag: 'NEW SLOT' },
    active: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.4)', icon: '🟡', tag: 'ACTIVE' },
  }[status];

  const textPrimary = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  return (
    <div style={{
      background: statusConfig.bg,
      border: `1px solid ${statusConfig.border}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 20 }}>{statusConfig.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: textMuted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{doorId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: statusConfig.color }}>
              {time}
            </div>
            <div style={{ fontSize: 11, color: textMuted }}>{date}</div>
          </div>
        </div>
      </div>
      <div style={{
        background: statusConfig.color, color: '#fff',
        fontSize: 9, fontWeight: 800, padding: '2px 7px',
        borderRadius: 4, letterSpacing: '0.05em', flexShrink: 0,
      }}>
        {statusConfig.tag}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Widget Component
// ─────────────────────────────────────────────
export default function DockScheduleTracker() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ tab: 'timeline' | 'workers' }>(() => ({
    tab: 'timeline',
  }));

  const data = getToolOutput<DockRescheduleData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        color: isDark ? '#9ca3af' : '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <span style={{ fontSize: 32 }}>🚦</span>
        <p>Waiting for dock schedule data...</p>
      </div>
    );
  }

  const textPrimary = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: isDark
        ? 'linear-gradient(135deg, #1a2233 0%, #0f1117 100%)'
        : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      borderRadius: 16, padding: 24, maxWidth: 500,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(14,165,233,0.15)',
      border: `1px solid ${isDark ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.3)'}`,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>🚦</div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>
            Dock Schedule Tracker
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: textMuted }}>
            Stage 1 · Inbound Delay Management
          </p>
        </div>
      </div>

      {/* ── Delay Alert Banner ── */}
      <div style={{
        background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>⏱️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>
            Truck {data.truckId} — Delayed {minutesToHM(data.shiftedBy)}
          </div>
          <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
            {data.message}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['timeline', 'workers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setState({ tab })}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: state?.tab === tab
                ? 'linear-gradient(135deg, #0ea5e9, #2563eb)'
                : surfaceBg,
              color: state?.tab === tab ? '#fff' : textMuted,
              transition: 'all 0.2s',
            }}
          >
            {tab === 'timeline' ? '📅 Timeline' : '👷 Workers'}
          </button>
        ))}
      </div>

      {/* ── Timeline Tab ── */}
      {state?.tab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TimelineSlot
            label="Original Assignment"
            doorId={data.originalDoorId}
            time={formatTime(data.originalArrival)}
            date={formatDate(data.originalArrival)}
            status="original"
            isDark={isDark}
          />

          {/* Arrow connector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
            <div style={{ flex: 1, height: 1, background: borderColor }} />
            <span style={{ fontSize: 11, color: textMuted, whiteSpace: 'nowrap' }}>
              ↓ Shifted +{minutesToHM(data.shiftedBy)}
            </span>
            <div style={{ flex: 1, height: 1, background: borderColor }} />
          </div>

          <TimelineSlot
            label="New Assignment"
            doorId={data.newDoorLabel}
            time={formatTime(data.newScheduledArrival)}
            date={formatDate(data.newScheduledArrival)}
            status="rescheduled"
            isDark={isDark}
          />

          {/* Summary */}
          <div style={{
            background: surfaceBg, border: `1px solid ${borderColor}`,
            borderRadius: 10, padding: '12px 14px', marginTop: 4,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
          }}>
            {[
              { label: 'Delay Duration', value: minutesToHM(data.shiftedBy) },
              { label: 'New Door', value: data.newDoorLabel },
              { label: 'Workers Affected', value: `${data.affectedWorkers.length}` },
              { label: 'Status', value: 'Rescheduled ✓' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: textMuted, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Workers Tab ── */}
      {state?.tab === 'workers' && (
        <div>
          {data.affectedWorkers.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center', color: textMuted, fontSize: 13,
              background: surfaceBg, borderRadius: 10,
            }}>
              No workers were assigned to the original dock slot.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.affectedWorkers.map((workerId, i) => (
                <div key={workerId} style={{
                  background: surfaceBg, border: `1px solid ${borderColor}`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: '#fff', fontWeight: 700,
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{workerId}</div>
                    <div style={{ fontSize: 11, color: textMuted }}>Reassigned → Picking Queue</div>
                  </div>
                  <div style={{
                    background: 'rgba(16,185,129,0.15)', color: '#10b981',
                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                    borderRadius: 4, border: '1px solid rgba(16,185,129,0.3)',
                  }}>
                    REASSIGNED
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            id="btn-reassign-workers"
            onClick={() =>
              sendFollowUpMessage(
                `Reassign dock workers from ${data.originalDoorId} to picking duties due to the truck delay`
              )
            }
            style={{
              width: '100%', marginTop: 12, padding: '10px', borderRadius: 10,
              border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139,92,246,0.35)',
            }}
          >
            👷 Reassign All Dock Workers
          </button>
        </div>
      )}

      <p style={{ margin: '16px 0 0', fontSize: 11, color: textMuted, textAlign: 'center' }}>
        FlowLogix Floor Ops Agent · Stage 1 · Dock Management
      </p>
    </div>
  );
}
