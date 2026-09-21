'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface PaperSummaryData {
  paperId: string;
  summary: string;
  keyFindings: string[];
  citation?: string;
  style?: string;
}

export default function PaperSummaryWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PaperSummaryData>();

  if (!isReady) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: theme === 'dark' ? '#fff' : '#000',
      }}>
        Loading...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const accentBg = isDark ? '#2a2a2a' : '#f0f9ff';
  const accentBorder = isDark ? '#444444' : '#bfdbfe';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const summary = data.summary ?? 'No summary available';
  const keyFindings = data.keyFindings ?? [];
  const citation = data.citation ?? '';

  return (
    <div style={{
      padding: '24px',
      background: bgColor,
      color: textColor,
      borderRadius: '12px',
      maxWidth: '700px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
          📖 Paper Summary
        </h2>
        <p style={{ margin: 0, color: mutedColor, fontSize: '13px' }}>
          Paper ID: <code style={{ background: accentBg, padding: '2px 6px', borderRadius: '4px' }}>
            {data.paperId ?? 'unknown'}
          </code>
        </p>
      </div>

      {/* Summary Section */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: accentBg,
        border: `1px solid ${accentBorder}`,
        borderRadius: '8px',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Summary
        </h3>
        <p style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: '1.6',
          color: textColor,
        }}>
          {summary}
        </p>
      </div>

      {/* Key Findings Section */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
          🔍 Key Findings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {keyFindings.length > 0 ? (
            keyFindings.map((finding, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: accentBg,
                  border: `1px solid ${accentBorder}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <span style={{
                  flexShrink: 0,
                  fontWeight: 'bold',
                  color: '#3b82f6',
                  fontSize: '16px',
                }}>
                  ✓
                </span>
                <span style={{ color: textColor }}>{finding}</span>
              </div>
            ))
          ) : (
            <p style={{ color: mutedColor, fontSize: '14px', margin: 0 }}>
              No key findings available
            </p>
          )}
        </div>
      </div>

      {/* Citation Section */}
      {citation && (
        <div style={{
          padding: '16px',
          background: accentBg,
          border: `1px solid ${accentBorder}`,
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
            📝 Citation
          </h3>
          <p style={{
            margin: 0,
            fontSize: '13px',
            fontFamily: 'monospace',
            color: textColor,
            lineHeight: '1.5',
            wordBreak: 'break-word',
          }}>
            {citation}
          </p>
          {data.style && (
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: mutedColor,
            }}>
              Format: <strong>{data.style}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
