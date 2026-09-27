'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useEffect, useState } from 'react';

interface Commitment {
  commitment_id: string;
  owner: { name: string };
  what: string;
  due_date: string;
  confidence_level: string;
  status: string;
  linked_ticket_id: string | null;
  evidence_log: Array<{ source: string; matched_score: number }>;
  nudge_log: Array<{ type: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  nudged_1: '#f59e0b',
  nudged_2: '#f97316',
  escalated: '#ef4444',
  done: '#10b981',
  expired: '#6b7280',
};

export default function CommitmentDashboard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [rows, setRows] = useState<Commitment[] | null>(null);

  useEffect(() => {
    const data = getToolOutput<{ commitments?: Commitment[] }>();
    setRows(data?.commitments ?? null);
  }, [getToolOutput]);

  const isDark = theme === 'dark';
  const bg = isDark ? '#111827' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const rowAlt = isDark ? '#1f2937' : '#f9fafb';

  if (rows === null) {
    return (
      <div style={{ padding: 24, background: bg, color: text, fontFamily: 'system-ui, sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: 24, background: bg, color: muted, fontFamily: 'system-ui, sans-serif', borderBottom: `1px solid ${border}` }}>
        No commitments yet. Feed a transcript with <code>extract_commitments</code>.
      </div>
    );
  }

  return (
    <div style={{ background: bg, color: text, fontFamily: 'system-ui, sans-serif', padding: 16, fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Follow-Through — Commitments</h3>
        <span style={{ color: muted, fontSize: 12 }}>{rows.length} active</span>
      </div>
      <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: isDark ? '#1f2937' : '#f3f4f6', textAlign: 'left', color: muted }}>
              <th style={{ padding: '8px 10px' }}>Owner</th>
              <th style={{ padding: '8px 10px' }}>Commitment</th>
              <th style={{ padding: '8px 10px' }}>Due</th>
              <th style={{ padding: '8px 10px' }}>Confidence</th>
              <th style={{ padding: '8px 10px' }}>Status</th>
              <th style={{ padding: '8px 10px' }}>Evidence</th>
              <th style={{ padding: '8px 10px' }}>Nudges</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.commitment_id} style={{ background: i % 2 ? rowAlt : 'transparent', borderTop: `1px solid ${border}` }}>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.owner.name}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div>{c.what}</div>
                  {c.linked_ticket_id && <div style={{ color: muted, fontSize: 11 }}>{c.linked_ticket_id}</div>}
                </td>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.due_date || '—'}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ opacity: 0.85 }}>{c.confidence_level}</span>
                </td>
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      background: `${STATUS_COLORS[c.status] || '#6b7280'}22`,
                      color: STATUS_COLORS[c.status] || text,
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', color: muted }}>
                  {c.evidence_log.length > 0
                    ? c.evidence_log
                        .map((e) => `${e.source} ${e.matched_score}`)
                        .join(', ')
                    : '—'}
                </td>
                <td style={{ padding: '8px 10px', color: muted }}>{c.nudge_log.length > 0 ? c.nudge_log.length : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
