'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/** The report every Dep Bouncer check returns (see src/modules/bouncer/bouncer.service.ts). */
interface Finding {
  signal: string;
  severity: 'info' | 'warn' | 'high' | 'critical';
  title: string;
  evidence: string[];
}

interface Report {
  package: string;
  version: string;
  verdict: 'ALLOW' | 'REVIEW' | 'BLOCK';
  score: number;
  summary: string;
  findings: Finding[];
  otherTools: { osv: string; npmAudit: string; cooldown: string };
  safeVersion?: { version: string; reason: string };
  replay?: { title: string; disclaimer: string; firstAdvisory: { id: string; lagHours: number } };
}

const VERDICT = {
  BLOCK: { color: '#dc2626', soft: 'rgba(220,38,38,0.12)', icon: '⛔', label: 'Blocked' },
  REVIEW: { color: '#d97706', soft: 'rgba(217,119,6,0.12)', icon: '⚠️', label: 'Needs review' },
  ALLOW: { color: '#16a34a', soft: 'rgba(22,163,74,0.12)', icon: '✅', label: 'Allowed' },
} as const;

const SEVERITY = {
  critical: '#dc2626',
  high: '#ea580c',
  warn: '#d97706',
  info: '#6b7280',
} as const;

export default function VerdictCard() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const data = getToolOutput<Report>();
  const dark = theme === 'dark';
  const ink = dark ? '#f3f4f6' : '#111827';
  const muted = dark ? '#9ca3af' : '#6b7280';
  const card = dark ? '#111827' : '#ffffff';
  const line = dark ? '#1f2937' : '#e5e7eb';

  if (!data) {
    return <div style={{ padding: 20, color: muted, fontFamily: 'system-ui' }}>Checking the release…</div>;
  }

  const v = VERDICT[data.verdict];
  const target = `${data.package}@${data.version}`;

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        background: card,
        color: ink,
        border: `1px solid ${line}`,
        borderTop: `4px solid ${v.color}`,
        borderRadius: 12,
        padding: 16,
        maxWidth: 560,
      }}
    >
      {data.replay && (
        <div style={{ fontSize: 11, color: muted, marginBottom: 10, lineHeight: 1.4 }}>
          🔁 Replay: {data.replay.title}. {data.replay.disclaimer}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            background: v.soft,
            color: v.color,
            fontWeight: 800,
            fontSize: 18,
            padding: '8px 14px',
            borderRadius: 10,
            letterSpacing: 0.5,
          }}
        >
          {v.icon} {data.verdict}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 15, fontWeight: 600, wordBreak: 'break-all' }}>
            {target}
          </div>
          <div style={{ fontSize: 12, color: muted }}>
            {v.label} · risk score {data.score}/100
          </div>
        </div>
      </div>

      {data.findings.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            What Dep Bouncer found
          </div>
          {data.findings.slice(0, 5).map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  background: SEVERITY[f.severity],
                  borderRadius: 4,
                  padding: '2px 6px',
                  height: 'fit-content',
                  textTransform: 'uppercase',
                }}
              >
                {f.severity}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                {f.evidence.slice(0, 2).map((e, j) => (
                  <div
                    key={j}
                    style={{ fontSize: 11, color: muted, fontFamily: 'ui-monospace, Consolas, monospace', wordBreak: 'break-word' }}
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14, borderTop: `1px solid ${line}`, paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          What other checks say right now
        </div>
        {[
          ['npm audit', data.otherTools.npmAudit],
          ['OSV', data.otherTools.osv],
          ['Cooldown', data.otherTools.cooldown],
        ].map(([name, text]) => (
          <div key={name} style={{ display: 'flex', gap: 8, fontSize: 12, marginTop: 6 }}>
            <span style={{ width: 72, flexShrink: 0, color: muted }}>{name}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      {data.safeVersion && data.verdict !== 'ALLOW' && (
        <div
          style={{
            marginTop: 14,
            background: VERDICT.ALLOW.soft,
            border: `1px solid ${VERDICT.ALLOW.color}`,
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              Install {data.package}@{data.safeVersion.version} instead
            </div>
            <div style={{ fontSize: 11, color: muted }}>{data.safeVersion.reason}</div>
          </div>
          <button
            onClick={() =>
              sendFollowUpMessage(
                `Dep Bouncer blocked ${target}. Install ${data.package}@${data.safeVersion!.version} instead.`,
              )
            }
            style={{
              flexShrink: 0,
              background: VERDICT.ALLOW.color,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Use {data.safeVersion.version}
          </button>
        </div>
      )}
    </div>
  );
}
