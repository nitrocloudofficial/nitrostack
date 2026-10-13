'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';



interface MeetingSummary {
  title: string;
  attendees: string[];
  duration: string;
  keyPoints: string[];
  decisions: string[];
  nextSteps: string[];
}

export default function MeetingSummaryCard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const [expanded, setExpanded] = useState(false);

  const data = getToolOutput<MeetingSummary>();

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading…
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#000000';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const accentColor = '#06b6d4';

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      maxWidth: '500px',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
        paddingBottom: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: textColor,
          }}>
            📋 Meeting Summary
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: mutedColor,
          }}>
            {data.title}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: `1px solid ${borderColor}`,
            background: isDark ? '#374151' : '#f3f4f6',
            color: textColor,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          {expanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      {/* Quick Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          padding: '12px',
          background: isDark ? '#111827' : '#f9fafb',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Duration
          </p>
          <p style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: accentColor,
          }}>
            {data.duration}
          </p>
        </div>
        <div style={{
          padding: '12px',
          background: isDark ? '#111827' : '#f9fafb',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Attendees
          </p>
          <p style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: accentColor,
          }}>
            {data.attendees?.length ?? 0} people
          </p>
        </div>
      </div>

      {/* Attendees List */}
      {(data.attendees ?? []).length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: isDark ? '#111827' : '#f9fafb',
          borderRadius: '8px',
          border: `1px solid ${borderColor}`,
        }}>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '12px',
            color: mutedColor,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Attendees
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {(data.attendees ?? []).map((attendee, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 10px',
                  background: accentColor,
                  color: '#000',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                {attendee}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Points */}
      {(data.keyPoints ?? []).length > 0 && (
        <div style={{
          marginBottom: '16px',
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: textColor,
          }}>
            🎯 Key Points
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            listStyle: 'none',
          }}>
            {(data.keyPoints ?? []).map((point, idx) => (
              <li
                key={idx}
                style={{
                  margin: '6px 0',
                  fontSize: '13px',
                  color: textColor,
                  lineHeight: '1.5',
                  paddingLeft: '8px',
                  borderLeft: `2px solid ${accentColor}`,
                }}
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decisions - Always visible */}
      {(data.decisions ?? []).length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: isDark ? '#1e3a3a' : '#ecfdf5',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#0d5d5d' : '#a7f3d0'}`,
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: isDark ? '#6ee7b7' : '#059669',
          }}>
            ✅ Decisions Made
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            listStyle: 'none',
          }}>
            {(data.decisions ?? []).map((decision, idx) => (
              <li
                key={idx}
                style={{
                  margin: '6px 0',
                  fontSize: '13px',
                  color: textColor,
                  lineHeight: '1.5',
                  paddingLeft: '8px',
                  borderLeft: `2px solid ${isDark ? '#6ee7b7' : '#10b981'}`,
                }}
              >
                {decision}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps - Expandable */}
      {expanded && (data.nextSteps ?? []).length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: isDark ? '#3a2a1e' : '#fef3c7',
          borderRadius: '8px',
          border: `1px solid ${isDark ? '#78350f' : '#fcd34d'}`,
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: isDark ? '#fbbf24' : '#d97706',
          }}>
            📌 Next Steps
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            listStyle: 'none',
          }}>
            {(data.nextSteps ?? []).map((step, idx) => (
              <li
                key={idx}
                style={{
                  margin: '6px 0',
                  fontSize: '13px',
                  color: textColor,
                  lineHeight: '1.5',
                  paddingLeft: '8px',
                  borderLeft: `2px solid ${isDark ? '#fbbf24' : '#f59e0b'}`,
                }}
              >
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${borderColor}`,
        fontSize: '12px',
        color: mutedColor,
        textAlign: 'center',
      }}>
        ✨ MeetingMind AI Summary
      </div>
    </div>
  );
}
