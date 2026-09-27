"use client";

import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface AgentLog {
  logId: string;
  agent: string;
  timestamp: string;
  action: string;
  durationMs: number;
  status: "success" | "running" | "failed";
  detail: string;
  incidentId?: string;
}

interface AgentActivity {
  pipeline: string[];
  logs: AgentLog[];
}

const BG = "#0a0d14";
const CARD = "#121722";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const statusColor: Record<string, string> = {
  success: "#34d399",
  running: "#fbbf24",
  failed: "#ef4444",
};

const MOCK_AGENT_ACTIVITY: AgentActivity = {
  pipeline: [
    "Monitoring Agent",
    "Engineering Agent",
    "Executive Agent",
    "Action Agent",
  ],
  logs: [
    {
      logId: "log-1",
      agent: "Monitoring Agent",
      timestamp: new Date(Date.now() - 10000).toISOString(),
      action: "SaaS polling loop execution completed",
      durationMs: 450,
      status: "success",
      detail:
        "Polled GitHub, Jira, and Datadog. Detected 1 critical alert on Datadog CPU usage.",
      incidentId: "INC-1001",
    },
    {
      logId: "log-2",
      agent: "Engineering Agent",
      timestamp: new Date(Date.now() - 8000).toISOString(),
      action: "Root cause analysis triggered",
      durationMs: 1200,
      status: "success",
      detail:
        "Analyzed git commit history and deployment logs. Confirmed db schema migrations mismatch.",
      incidentId: "INC-1001",
    },
    {
      logId: "log-3",
      agent: "Executive Agent",
      timestamp: new Date(Date.now() - 5000).toISOString(),
      action: "Company health risk projection computed",
      durationMs: 850,
      status: "success",
      detail:
        "Determined high revenue risk. Overall company health projection dropped to 82%.",
    },
  ],
};

export default function AgentActivityWidget() {
  const theme = themeCustomizerHack();
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<AgentActivity>();

  const bg = BG;
  const cardBg = CARD;
  const text = TEXT;
  const muted = MUTED;
  const border = BORDER;
  const accent = "#38bdf8";

  const shellStyle: React.CSSProperties = {
    padding: 32,
    textAlign: "center",
    color: text,
    background: bg,
    borderRadius: 16,
    fontFamily: FONT,
    border: `1px solid ${border}`,
  };
  if (!isReady) return <div style={shellStyle}>Initializing agents…</div>;

  const isMock = !rawData;
  const data = rawData || MOCK_AGENT_ACTIVITY;
  if (!data) return <div style={shellStyle}>Loading agent activity…</div>;

  const pipeline = data.pipeline ?? [];
  const logs = data.logs ?? [];

  return (
    <div
      style={{
        background: bg,
        color: text,
        padding: 24,
        borderRadius: 16,
        fontFamily: FONT,
        border: `1px solid ${border}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "1.2px",
            color: accent,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          Live Multi-Agent Pipeline
        </div>
        {isMock && (
          <span
            style={{
              fontSize: 9,
              background: "#1c1c1c",
              color: "#888888",
              padding: "1px 5px",
              borderRadius: 4,
              border: "1px solid #2a2a2a",
              fontWeight: 400,
            }}
          >
            MOCK
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginTop: 4,
          marginBottom: 16,
          letterSpacing: "-0.5px",
        }}
      >
        Agent Activity Log
      </div>

      {/* Pipeline Flow representation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 24,
        }}
      >
        {pipeline.map((agent, i) => (
          <div
            key={agent}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                background: CARD,
                border: `1px solid ${border}`,
                color: text,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {agent}
            </span>
            {i < pipeline.length - 1 && (
              <span style={{ color: accent, fontWeight: 500 }}>→</span>
            )}
          </div>
        ))}
      </div>

      {/* Logs timeline list */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: muted,
          textTransform: "uppercase",
          marginBottom: 12,
          letterSpacing: "1px",
        }}
      >
        Reasoning Log
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 380,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {logs.map((l) => (
          <div
            key={l.logId}
            style={{
              background: CARD,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: statusColor[l.status] ?? muted,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{l.agent}</span>
                {l.incidentId && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      background: "rgba(56, 189, 248, 0.1)",
                      color: accent,
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    {l.incidentId}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: muted,
                  fontWeight: 500,
                }}
              >
                {l.durationMs > 0 ? `${l.durationMs}ms` : ""}
              </span>
            </div>
            
            <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 4 }}>
              {l.action}
            </div>
            
            <div
              style={{
                fontSize: 12,
                color: muted,
                lineHeight: 1.4,
                marginBottom: 8,
              }}
            >
              {l.detail}
            </div>

            <div
              style={{
                textAlign: "right",
                fontSize: 9,
                color: muted,
                borderTop: `1px solid ${border}`,
                paddingTop: 6,
                marginTop: 6,
              }}
            >
              {new Date(l.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function themeCustomizerHack() {
  return "dark";
}
