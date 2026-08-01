'use client';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

// Covers the shapes returned by triage_alert, mitre_mapper, recommend_response,
// incident_report, correlate_alerts, lookup_ip, lookup_hash and parse_logs.
// Every field is optional — sections only render when the relevant data is present,
// so the same console works no matter which tool populated it.
interface SocData {
  // triage_alert / incident_report
  severity?: string;
  status?: string;
  summary?: string;
  recommendation?: string;
  alert_type?: string;
  source_ip?: string;
  destination_ip?: string;
  incident?: string;

  // mitre_mapper
  technique?: string;
  tactic?: string;

  // recommend_response
  recommended_actions?: string[];

  // correlate_alerts
  correlated?: boolean;
  campaign?: string;
  confidence?: string;
  matched_on?: { source_ip?: string; username?: string; hostname?: string };

  // lookup_ip
  ip?: string;
  reputation?: string;
  risk?: string;

  // lookup_hash
  hash?: string;

  // parse_logs
  containsPowerShell?: boolean;
  containsFailedLogin?: boolean;
  containsCmd?: boolean;
  logLength?: number;
}

const LEVELS = ['low', 'medium', 'high', 'critical'] as const;

function tokens(dark: boolean) {
  return dark
    ? {
        bg: '#0a0e14',
        panel: '#10151d',
        panelAlt: '#141b25',
        border: '#212938',
        borderSoft: '#1a212c',
        text: '#e6edf3',
        muted: '#7d8ba0',
        faint: '#4b5768',
        accent: '#22d3ee',
      }
    : {
        bg: '#eef1f5',
        panel: '#ffffff',
        panelAlt: '#f7f9fb',
        border: '#dbe1e9',
        borderSoft: '#e7ebf0',
        text: '#0f1620',
        muted: '#5b6472',
        faint: '#8891a0',
        accent: '#0e7490',
      };
}

function severityColor(sev?: string) {
  switch ((sev || '').toLowerCase()) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#22c55e';
    default:
      return '#5b6472';
  }
}

function riskColor(risk?: string) {
  switch ((risk || '').toLowerCase()) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#eab308';
    default:
      return '#22c55e';
  }
}
export default function SocDashboard() {

  const theme = useTheme();

  const { getToolOutput } = useWidgetSDK();

const toolData = getToolOutput<SocData>();

const data: SocData =
  toolData ?? {
    severity: "Critical",
    status: "Detected",
    summary:
      "Encoded PowerShell execution followed by outbound malware download detected.",
    recommendation:
      "Immediately isolate endpoint and notify Tier-2 SOC.",
    alert_type: "PowerShell Execution",
    source_ip: "185.220.101.15",
    destination_ip: "192.168.1.20",
    incident:
      "PowerShell -EncodedCommand launched from WINWORD.EXE.",
    technique: "T1059.001",
    tactic: "Execution",
    reputation: "Suspicious",
    risk: "High",
    campaign: "Possible Multi-Stage Attack",
    confidence: "87%",
    recommended_actions: [
      "Isolate Endpoint",
      "Block Source IP",
      "Collect Memory Dump",
      "Notify Tier-2 SOC"
    ]
  };

const dark = theme === 'dark';
const t = tokens(dark);

  const sev = data.severity || data.risk || '';
  const sevColor = severityColor(sev) !== '#5b6472' ? severityColor(sev) : riskColor(data.risk);
  const activeLevel = LEVELS.indexOf(sev.toLowerCase() as any);

  const readouts = [
    { label: 'ALERT TYPE', value: data.alert_type },
    { label: 'SOURCE IP', value: data.source_ip || data.ip },
    { label: 'DEST IP', value: data.destination_ip },
    { label: 'MITRE TECHNIQUE', value: data.technique },
    { label: 'MITRE TACTIC', value: data.tactic },
    { label: 'REPUTATION', value: data.reputation },
    { label: 'STATUS', value: data.status || (data.correlated ? 'Correlated' : undefined) },
    { label: 'HASH', value: data.hash, mono: true },
  ].filter((r) => r.value);

  return (
    <div
      style={{
        background: t.bg,
        minHeight: '100vh',
        padding: '28px 24px',
        color: t.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        animation: 'sd-fade-in 320ms ease-out',
      }}
    >
      

      <div
        style={{
          maxWidth: 860,
          margin: '0 auto',
          background: t.panel,
          border: `1px solid ${t.border}`,
          borderRadius: 4,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div>
            <div
              className="sd-mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                color: t.faint,
                marginBottom: 6,
              }}
            >
              SENTINEL // AUTONOMOUS TIER-1 ANALYSIS
            </div>
            <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-0.01em' }}>
              SOC Incident Console
            </div>
          </div>
          <div
            className="sd-mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: t.muted,
            }}
          >
            <LiveDot color={t.accent} />
            LIVE
          </div>
        </div>

        {/* Threat level gauge — signature element */}
        {sev && (
          <div style={{ padding: '20px 22px', borderBottom: `1px solid ${t.border}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span
                className="sd-mono"
                style={{ fontSize: 11, letterSpacing: '0.12em', color: t.faint }}
              >
                THREAT LEVEL
              </span>
              <span
                className="sd-mono"
                style={{ fontSize: 22, fontWeight: 700, color: sevColor, letterSpacing: '0.02em' }}
              >
                {sev.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {LEVELS.map((lvl, i) => (
                <div
                  key={lvl}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 2,
                    background: i <= activeLevel ? severityColor(lvl) : t.borderSoft,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Data readout grid */}
        {readouts.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 1,
              background: t.border,
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            {readouts.map((r) => (
              <div key={r.label} style={{ background: t.panel, padding: '14px 18px' }}>
                <div
                  className="sd-mono"
                  style={{ fontSize: 10, letterSpacing: '0.1em', color: t.faint, marginBottom: 6 }}
                >
                  {r.label}
                </div>
                <div
                  className={r.mono ? 'sd-mono' : undefined}
                  style={{
                    fontSize: r.mono ? 12 : 14,
                    fontWeight: 600,
                    wordBreak: 'break-all',
                  }}
                >
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '22px' }}>
          {data.summary && <Section title="Summary" t={t}>{data.summary}</Section>}
          {data.incident && <Section title="Threat Details" t={t}>{data.incident}</Section>}
          {data.recommendation && (
            <Section title="Recommendation" t={t}>{data.recommendation}</Section>
          )}

          {data.campaign && (
            <Section title="Correlation" t={t}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Badge color={t.accent} text={data.campaign} />
                {data.confidence && (
                  <span className="sd-mono" style={{ fontSize: 12, color: t.muted }}>
                    confidence {data.confidence}
                  </span>
                )}
              </div>
              {data.matched_on && (
                <div className="sd-mono" style={{ fontSize: 12, color: t.muted, lineHeight: 1.8 }}>
                  {data.matched_on.source_ip && <div>src_ip: {data.matched_on.source_ip}</div>}
                  {data.matched_on.username && data.matched_on.username !== 'N/A' && (
                    <div>user: {data.matched_on.username}</div>
                  )}
                  {data.matched_on.hostname && data.matched_on.hostname !== 'N/A' && (
                    <div>host: {data.matched_on.hostname}</div>
                  )}
                </div>
              )}
            </Section>
          )}

          {data.recommended_actions && data.recommended_actions.length > 0 && (
            <Section title="Recommended Actions" t={t}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recommended_actions.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        border: `1px solid ${sevColor}`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 14 }}>{a}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(data.containsPowerShell || data.containsFailedLogin || data.containsCmd) && (
            <Section title="Log Indicators" t={t}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.containsPowerShell && <Badge color="#ef4444" text="PowerShell" />}
                {data.containsCmd && <Badge color="#f97316" text="cmd.exe" />}
                {data.containsFailedLogin && <Badge color="#eab308" text="Failed Login" />}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div
          className="sd-mono"
          style={{
            padding: '12px 22px',
            borderTop: `1px solid ${t.border}`,
            fontSize: 10,
            letterSpacing: '0.08em',
            color: t.faint,
          }}
        >
          GENERATED BY SENTINELAI · AUTONOMOUS TIER-1 TRIAGE
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  t,
}: {
  title: string;
  children: React.ReactNode;
  t: ReturnType<typeof tokens>;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="sd-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          color: t.faint,
          marginBottom: 8,
        }}
      >
        {title.toUpperCase()}
      </div>
      <div
        style={{
          background: t.panelAlt,
          border: `1px solid ${t.borderSoft}`,
          borderRadius: 4,
          padding: '14px 16px',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Badge({ color, text }: { color: string; text: string }) {
  return (
    <span
      className="sd-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: `${color}1a`,
        border: `1px solid ${color}40`,
      }}
    >
      {text}
    </span>
  );
}

function LiveDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        animation: 'sd-pulse 1.6s ease-in-out infinite',
      }}
    />
  );
}
