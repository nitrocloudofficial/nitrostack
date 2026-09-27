'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface AuditEntry {
  seq: number;
  timestamp: string;
  tool: string;
  subject: string | null;
  outcome: 'allowed' | 'blocked';
  reason?: string;
  hash: string;
  prevHash: string;
}

interface AuditData {
  entries: AuditEntry[];
}

export default function AuditTimeline() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  const dark = theme === 'dark';

  if (!isReady) return <div style={{ padding: 16 }}>Loading...</div>;

  const data = getToolOutput<AuditData>();
  const entries = data?.entries ?? [];

  if (entries.length === 0) return <div style={{ padding: 16, opacity: 0.6 }}>No audit entries yet</div>;

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: 580,
      maxHeight: 500,
      overflowY: 'auto',
      color: dark ? '#f5f5f5' : '#111111',
    }}>
      <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
        {entries.length} audit {entries.length === 1 ? 'entry' : 'entries'}
      </div>

      {entries.map(function(e) {
        const blocked = e.outcome === 'blocked';
        return (
          <div key={e.seq} style={{
            borderLeft: '4px solid ' + (blocked ? '#dc2626' : '#16a34a'),
            background: blocked
              ? (dark ? '#2a0a0a' : '#fff5f5')
              : (dark ? '#0a1a0a' : '#f5fff5'),
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: blocked ? '#dc2626' : '#16a34a',
                  color: '#fff',
                }}>
                  {blocked ? 'BLOCKED' : 'ALLOWED'}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{e.tool}</span>
              </div>
              <span style={{ fontSize: 11, opacity: 0.5 }}>#{e.seq}</span>
            </div>

            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: blocked && e.reason ? 6 : 0 }}>
              {e.subject ?? 'unknown'} · {new Date(e.timestamp).toLocaleString('en-IN')}
            </div>

            {blocked && e.reason && (
              <div style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color: '#dc2626',
                background: dark ? '#1a0a0a' : '#fff0f0',
                padding: '4px 8px',
                borderRadius: 4,
                marginTop: 4,
                wordBreak: 'break-word',
              }}>
                {e.reason}
              </div>
            )}

            <div style={{ fontSize: 10, opacity: 0.35, marginTop: 6, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {e.hash}
            </div>
          </div>
        );
      })}
    </div>
  );
}
