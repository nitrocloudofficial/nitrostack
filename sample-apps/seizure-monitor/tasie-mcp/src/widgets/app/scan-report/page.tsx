'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * TASIE scan report widget.
 * Renders the output of the `scan_code` tool inside ChatGPT / Studio.
 */

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Finding {
  vuln_class: string;
  line: number | null;
  severity: Severity;
  confidence: string | null;
  cwe: string | null;
  owasp: string | null;
  route: string | null;
  message: string | null;
}

interface ScanData {
  ok: boolean;
  filename: string;
  clean?: boolean;
  parsed?: boolean;
  status?: string;
  error?: string;
  backend?: string;
  headline?: string;
  summary?: { critical: number; high: number; medium: number; low: number; total: number };
  confirmed_targets?: string[];
  findings?: Finding[];
  suppressed_count?: number;
}

const SEV_COLOR: Record<Severity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
};

export default function ScanReport() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ScanData>();

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f1419' : '#ffffff';
  const fg = isDark ? '#e6edf3' : '#0f1419';
  const muted = isDark ? 'rgba(230,237,243,0.6)' : 'rgba(15,20,25,0.55)';
  const border = isDark ? 'rgba(230,237,243,0.12)' : 'rgba(15,20,25,0.1)';
  const cardBg = isDark ? '#161b22' : '#f7f9fb';

  if (!data) {
    return <Shell bg={bg} fg={muted}>Loading scan…</Shell>;
  }

  if (!data.ok) {
    return (
      <Shell bg={bg} fg={fg}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <strong style={{ fontSize: 16 }}>TASIE backend error</strong>
        </div>
        <div style={{ color: muted, fontSize: 13, lineHeight: 1.5 }}>{data.error}</div>
        {data.backend && (
          <div style={{ color: muted, fontSize: 12, marginTop: 8 }}>
            Backend: <code>{data.backend}</code>
          </div>
        )}
      </Shell>
    );
  }

  // Source failed to parse (e.g. newlines stripped) — not a clean result.
  if (data.parsed === false) {
    return (
      <Shell bg={bg} fg={fg}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 22 }}>🟡</span>
          <strong style={{ fontSize: 16 }}>Could not scan {data.filename}</strong>
        </div>
        <div style={{ color: muted, fontSize: 13, lineHeight: 1.5 }}>
          {data.headline ||
            `Source did not parse (status=${data.status}). Send the complete, valid source with newlines preserved.`}
        </div>
      </Shell>
    );
  }

  const s = data.summary || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  const findings = data.findings || [];

  return (
    <Shell bg={bg} fg={fg}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>{data.clean ? '🛡️' : '🚨'}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            TASIE Security Scan
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            {data.filename} · {data.clean ? 'clean' : `${s.total} finding${s.total === 1 ? '' : 's'}`}
          </div>
        </div>
      </div>

      {/* severity summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
          <div
            key={sev}
            style={{
              flex: '1 1 64px',
              minWidth: 64,
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: SEV_COLOR[sev] }}>
              {s[sev] ?? 0}
            </div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: muted }}>
              {sev}
            </div>
          </div>
        ))}
      </div>

      {data.clean && (
        <div style={{ color: muted, fontSize: 13 }}>
          No vulnerabilities detected. {data.suppressed_count ? `${data.suppressed_count} suppressed.` : ''}
        </div>
      )}

      {/* findings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {findings.map((f, i) => (
          <div
            key={i}
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderLeft: `4px solid ${SEV_COLOR[f.severity] || muted}`,
              borderRadius: 8,
              padding: '10px 12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {prettyClass(f.vuln_class)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#fff',
                  background: SEV_COLOR[f.severity] || muted,
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {f.severity}
              </span>
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {f.line != null && <span>line {f.line}</span>}
              {f.route && <span>route {f.route}</span>}
              {f.cwe && <span>{f.cwe}</span>}
              {f.owasp && <span>{f.owasp}</span>}
              {f.confidence && <span>{f.confidence} confidence</span>}
            </div>
            {f.message && (
              <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>{f.message}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: muted, display: 'flex', justifyContent: 'space-between' }}>
        <span>⚡ TASIE · autonomous SAST + real exploit</span>
        {data.suppressed_count ? <span>{data.suppressed_count} suppressed</span> : null}
      </div>
    </Shell>
  );
}

function Shell({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        background: bg,
        color: fg,
        borderRadius: 16,
        maxWidth: 460,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
      }}
    >
      {children}
    </div>
  );
}

function prettyClass(c: string): string {
  return (c || 'finding')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
