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

  if (!isReady) return <div style={styles.loading}>Loading…</div>;

  const data = getToolOutput<AuditData>();
  const entries = data?.entries ?? [];

  if (entries.length === 0) return <div style={styles.empty}>No audit entries yet</div>;

  const t = tokens(theme);

  return (
    <div style={styles.container(t)}>
      <div style={styles.header(t)}>{entries.length} audit {entries.length === 1 ? 'entry' : 'entries'}</div>
      <div style={styles.list}>
        {entries.map((e) => {
          const blocked = e.outcome === 'blocked';
          return (
            <div key={e.seq} style={styles.entry(t, blocked)}>
              <div style={styles.rowHeader(t, blocked)}>
                <span style={styles.badge(t, blocked)}>{blocked ? 'BLOCKED' : 'ALLOWED'}</span>
                <span style={styles.tool}>{e.tool}</span>
                <span style={styles.seq}>#{e.seq}</span>
              </div>
              <div style={styles.meta(t)}>
                {e.subject ?? 'unknown'} · {new Date(e.timestamp).toLocaleString('en-IN')}
              </div>
              {blocked && e.reason && (
                <div style={styles.reason(t)}>
                  {e.reason}
                </div>
              )}
              <div style={styles.hash}>{e.hash}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tokens(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      bg: '#0F0F0F',
      cardBg: '#1A1A1A',
      primaryText: '#F5F4F0',
      secondaryText: '#9A9A9A',
      border: '#2A2A2A',
      blockedBg: '#2A0A0A',
      blockedBorder: '#DC2626',
      blockedBadgeBg: '#DC2626',
      allowedBg: '#0A1A0A',
      allowedBorder: '#16A34A',
      allowedBadgeBg: '#16A34A',
      reasonBg: '#1A0A0A',
      reasonText: '#FCA5A5',
      hashColor: '#4A4A4A',
    };
  }
  return {
    bg: '#FAF9F6',
    cardBg: '#FFFFFF',
    primaryText: '#1A1A1A',
    secondaryText: '#6B6B6B',
    border: '#E8E4DC',
    blockedBg: '#FFF5F5',
    blockedBorder: '#DC2626',
    blockedBadgeBg: '#DC2626',
    allowedBg: '#F5FFF5',
    allowedBorder: '#16A34A',
    allowedBadgeBg: '#16A34A',
    reasonBg: '#FFF0F0',
    reasonText: '#DC2626',
    hashColor: '#A0A0A0',
  };
}

const styles = {
  container: (t: ReturnType<typeof tokens>) => ({
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: 580,
    maxHeight: 500,
    overflowY: 'auto' as const,
    color: t.primaryText,
  }),
  loading: { padding: 20, color: '#6B6B6B' },
  empty: { padding: 20, opacity: 0.6, color: '#6B6B6B' },
  header: (t: ReturnType<typeof tokens>) => ({ fontSize: 13, color: t.secondaryText, marginBottom: 12 }),
  list: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  entry: (t: ReturnType<typeof tokens>, blocked: boolean) => ({
    borderLeft: `4px solid ${blocked ? t.blockedBorder : t.allowedBorder}`,
    backgroundColor: blocked ? t.blockedBg : t.allowedBg,
    borderRadius: 6,
    padding: '10px 14px',
  }),
  rowHeader: (t: ReturnType<typeof tokens>, blocked: boolean) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  }),
  badge: (t: ReturnType<typeof tokens>, blocked: boolean) => ({
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 12,
    backgroundColor: blocked ? t.blockedBadgeBg : t.allowedBadgeBg,
    color: '#fff',
  }),
  tool: { fontWeight: 600, fontSize: 13, marginLeft: 8 },
  seq: { fontSize: 11, opacity: 0.5 },
  meta: (t: ReturnType<typeof tokens>) => ({ fontSize: 12, color: t.secondaryText, marginBottom: 6 }),
  reason: (t: ReturnType<typeof tokens>) => ({
    fontSize: 12,
    fontFamily: 'monospace',
    color: t.reasonText,
    backgroundColor: t.reasonBg,
    padding: '4px 8px',
    borderRadius: 4,
    marginTop: 4,
    wordBreak: 'break-word' as const,
  }),
  hash: { fontSize: 10, fontFamily: 'monospace', color: '#A0A0A0', wordBreak: 'break-all' as const },
};