'use client';

import { useState } from 'react';
import { ToolCallLogEntry } from './types';

const STATUS_COLOR: Record<ToolCallLogEntry['status'], string> = {
  pending: '#2563eb',
  success: '#16a34a',
  error: '#dc2626',
};
const STATUS_LABEL: Record<ToolCallLogEntry['status'], string> = {
  pending: 'RUNNING',
  success: 'OK',
  error: 'ERROR',
};

interface DeveloperPanelProps {
  log: ToolCallLogEntry[];
  isDark: boolean;
}

export default function DeveloperPanel({ log, isDark }: DeveloperPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? 'rgba(241,245,249,0.6)' : 'rgba(15,23,42,0.55)';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const rowBg = isDark ? '#0f172a' : '#f8fafc';

  return (
    <div style={{ margin: '12px 16px 16px', borderRadius: 10, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '9px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 800, color: mutedColor }}>🛠 Developer Panel — {log.length} widget-initiated tool call(s)</span>
        <span style={{ fontSize: 11, color: mutedColor }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ fontSize: 10.5, color: mutedColor, marginBottom: 8, lineHeight: 1.5 }}>
            Logs only tool calls this widget makes directly (<code>calculate_route</code>, <code>request_emergency_reservation</code>).
            The upstream calls that ran before this widget mounted (<code>triage_symptoms</code>, <code>get_nearby_hospitals</code>,{' '}
            <code>rank_hospitals</code>, etc.) already completed — MCP gives widgets no live invocation history for them; their results are
            shown in the Patient Summary and hospital data above instead.
          </div>

          {log.length === 0 ? (
            <div style={{ fontSize: 11.5, color: mutedColor }}>No tool calls made yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {log.map((entry, index) => (
                <div key={entry.id} style={{ background: rowBg, borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: textColor }}>
                      #{index + 1} {entry.toolName}
                    </span>
                    <span style={{ fontWeight: 700, color: STATUS_COLOR[entry.status] }}>
                      {STATUS_LABEL[entry.status]}
                      {entry.durationMs !== null ? ` · ${entry.durationMs}ms` : ''}
                    </span>
                  </div>
                  <div style={{ color: mutedColor, marginTop: 3, fontFamily: 'ui-monospace, monospace', fontSize: 10, wordBreak: 'break-all' }}>
                    → {JSON.stringify(entry.requestPayload)}
                  </div>
                  {entry.responseSummary && (
                    <div style={{ color: mutedColor, marginTop: 2, fontFamily: 'ui-monospace, monospace', fontSize: 10, wordBreak: 'break-all' }}>
                      ← {entry.responseSummary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
