'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface VolumeContextData {
  volume_context: 'organic' | 'explained_by_calendar_event';
  event_type: string | null;
  event_date: string | null;
  event_description: string | null;
  reason: string;
}

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
      fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase' as const, letterSpacing: '0.5px',
      background: bg, color: fg,
    }}>{label}</span>
  );
}

export default function CheckVolumeContext() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state] = useWidgetState<{}>(() => ({}));

  const data = getToolOutput<VolumeContextData>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        color: isDark ? '#8a9bb0' : '#4a5568',
        fontFamily: "'JetBrains Mono', monospace", fontSize: '13px',
      }}>
        Waiting for volume context results...
      </div>
    );
  }

  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb0' : '#4a5568';
  const textMuted = isDark ? '#4a5568' : '#a0aec0';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  const isOrganic = data.volume_context === 'organic';
  const contextBg = isOrganic ? 'rgba(104,211,145,0.15)' : 'rgba(248,168,89,0.15)';
  const contextFg = isOrganic ? '#68d391' : '#f8a859';
  const contextLabel = isOrganic ? 'ORGANIC' : 'CALENDAR EVENT';
  const contextIcon = isOrganic ? '📰' : '📅';

  return (
    <div style={{
      padding: '24px',
      background: isDark
        ? 'linear-gradient(135deg, #0d1420 0%, #080c14 100%)'
        : 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      borderRadius: '16px', color: textPrimary,
      fontFamily: "'Inter', system-ui, sans-serif", maxWidth: '600px',
      boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #63b3ed 0%, #3182ce 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
        }}>📅</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Volume Context Check
          </div>
          <div style={{
            fontSize: '11px', color: textSecondary,
            fontFamily: "'JetBrains Mono', monospace", marginTop: '1px',
          }}>
            Volume spike explanation
          </div>
        </div>
      </div>

      {/* Context badge */}
      <div style={{
        padding: '16px 20px', borderRadius: '12px',
        background: contextBg, border: `1px solid ${contextFg}30`,
        marginBottom: '16px', textAlign: 'center',
      }}>
        <div style={{
          fontSize: '14px', fontWeight: 700, color: contextFg,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {contextIcon} {contextLabel}
        </div>
      </div>

      {/* Event details or organic message */}
      {isOrganic ? (
        <div style={{
          padding: '14px 16px', borderRadius: '10px',
          background: 'rgba(104,211,145,0.06)',
          border: '1px solid rgba(104,211,145,0.15)',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>📰</span>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#68d391',
          }}>
            Volume appears news-driven
          </span>
        </div>
      ) : (
        <div style={{
          padding: '14px 16px', borderRadius: '10px',
          background: surfaceBg, border: `1px solid ${borderColor}`,
          borderLeft: '3px solid #f8a859', marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '9px', fontWeight: 700, color: '#f8a859',
            textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: '8px',
          }}>Calendar Event Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {data.event_type && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '10px', color: textMuted, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", minWidth: '80px',
                }}>Type</span>
                <span style={{
                  fontSize: '12px', color: textSecondary, fontWeight: 600,
                }}>{data.event_type}</span>
              </div>
            )}
            {data.event_date && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '10px', color: textMuted, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", minWidth: '80px',
                }}>Date</span>
                <span style={{
                  fontSize: '12px', color: textSecondary,
                }}>{data.event_date}</span>
              </div>
            )}
            {data.event_description && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '4px' }}>
                <span style={{
                  fontSize: '10px', color: textMuted, fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace", minWidth: '80px', paddingTop: '2px',
                }}>Details</span>
                <span style={{
                  fontSize: '12px', color: textSecondary, lineHeight: 1.5,
                }}>{data.event_description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reason */}
      <div style={{
        padding: '14px 16px', borderRadius: '10px',
        background: surfaceBg, border: `1px solid ${borderColor}`, marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 700, color: '#63b3ed',
          textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: '6px',
        }}>Reason</div>
        <div style={{
          fontSize: '12px', lineHeight: 1.6, color: textSecondary,
        }}>{data.reason}</div>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '10px', textAlign: 'center', color: textMuted,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        NitroSignal Skeptic Agent
      </div>
    </div>
  );
}
