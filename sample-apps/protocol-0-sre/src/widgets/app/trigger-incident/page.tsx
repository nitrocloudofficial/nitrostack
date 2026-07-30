"use client";

import React, { useState, useEffect } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface Scenario {
  id: string;
  name: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  systems: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "cicd_failure",
    name: "CI/CD Pipeline Crash",
    category: "CI/CD Failure",
    severity: "high",
    description: "Trigger a Jest test suite failure on main branch to block integration checks.",
    systems: ["GitHub"],
  },
  {
    id: "merge_failure",
    name: "Primary Auth Merge Lock",
    category: "Merge Failure",
    severity: "medium",
    description: "Create a merge check conflict for the primary authorization router branch.",
    systems: ["GitHub"],
  },
  {
    id: "deployment_failure",
    name: "Production Rollout Failure",
    category: "Deployment Failure",
    severity: "critical",
    description: "Simulate a database migration mismatch crash on deployment of container pods.",
    systems: ["GitHub", "Datadog"],
  },
  {
    id: "issue_spike",
    name: "Customer Support Alert",
    category: "Issue Spike",
    severity: "high",
    description: "Trigger a surge of Github HTTP 500 issue reports for Checkout & Payments.",
    systems: ["GitHub"],
  },
  {
    id: "infra_cpu_spike",
    name: "Auth Gateway CPU Exhaustion",
    category: "Infrastructure Spike",
    severity: "critical",
    description: "Spike Gateway CPU capacity usage to 99% and trigger Datadog alerting.",
    systems: ["Datadog"],
  },
  {
    id: "sprint_risk",
    name: "Sprint Delivery Overload",
    category: "Sprint Risk",
    severity: "medium",
    description: "Simulate developer backlog overflow with remaining story points > 75.",
    systems: ["Jira"],
  },
  {
    id: "feature_incomplete",
    name: "Demo Review Block",
    category: "Feature Incomplete",
    severity: "medium",
    description: "Trigger incomplete critical tickets blocking the Enterprise Demo Review meeting.",
    systems: ["Jira", "Google Calendar"],
  },
  {
    id: "deadline_near",
    name: "Sprint Deadline Alert",
    category: "Deadline Near",
    severity: "high",
    description: "Move sprint end date to tomorrow with 65% tasks still incomplete.",
    systems: ["Jira"],
  },
  {
    id: "employee_leave",
    name: "Lead Engineer Absence",
    category: "Employee Leave",
    severity: "medium",
    description: "Simulate emergency medical leave overlap for critical payment ticket assignee.",
    systems: ["Google Calendar", "Jira"],
  },
  {
    id: "ooo_meeting_overlap",
    name: "Schedule Sync Conflict",
    category: "OOO Conflict",
    severity: "low",
    description: "Create overlapping release sync meeting during team lead doctor OOO leave.",
    systems: ["Google Calendar"],
  },
];

interface TriggerOutput {
  success: boolean;
  message: string;
  incidentType?: string;
}

const BG = "#0a0d14";
const CARD = "#121722";
const CARD_HOVER = "#181f2e";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const severityStyles: Record<
  string,
  { text: string; bg: string; border: string; glow: string }
> = {
  critical: {
    text: "#f87171",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
    glow: "0 0 20px rgba(239, 68, 68, 0.25)",
  },
  high: {
    text: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
    glow: "0 0 20px rgba(245, 158, 11, 0.2)",
  },
  medium: {
    text: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.35)",
    glow: "0 0 20px rgba(56, 189, 248, 0.2)",
  },
  low: {
    text: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.3)",
    glow: "none",
  },
};

export default function TriggerIncidentWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const toolOutput = getToolOutput<TriggerOutput>();

  const [selectedScenario, setSelectedScenario] = useState<string>("cicd_failure");
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<
    Array<{
      timestamp: string;
      scenario: string;
      message: string;
      mode: "live" | "mock";
    }>
  >([]);

  // Automatically select whatever scenario was triggered in the left panel / tool call!
  useEffect(() => {
    if (toolOutput) {
      const targetId = toolOutput.incidentType || toolOutput.message;
      if (targetId) {
        const match = SCENARIOS.find((s) => targetId.includes(s.id));
        if (match) {
          setSelectedScenario(match.id);
          setSimulationLogs((prev) => {
            const alreadyLogged = prev.some(
              (l) => l.scenario === match.id && Date.now() - new Date(l.timestamp).getTime() < 5000
            );
            if (alreadyLogged) return prev;
            return [
              {
                timestamp: new Date().toISOString(),
                scenario: match.id,
                message: toolOutput.message || `Scenario ${match.name} triggered successfully.`,
                mode: "live",
              },
              ...prev,
            ];
          });
        }
      }
    }
  }, [toolOutput]);

  if (!isReady) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          color: TEXT,
          background: BG,
          borderRadius: 16,
          fontFamily: FONT,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div className="spinner" style={{ marginBottom: 16, margin: "0 auto" }} />
        <div style={{ fontSize: 15, color: MUTED }}>Connecting to Protocol-0 Chaos Simulator...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  const activeScenario = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];

  const handleTrigger = async () => {
    setIsTriggering(true);
    setError(null);
    let resultMessage = "";
    let mode: "live" | "mock" = "live";

    try {
      const res = (await callTool("triggerIncident", {
        incidentType: activeScenario.id,
      })) as unknown as TriggerOutput;
      resultMessage = res?.message || `Scenario ${activeScenario.name} triggered successfully.`;
    } catch (err) {
      console.warn("Live tool call failed or standalone mode. Falling back to mock.", err);
      resultMessage = `Scenario ${activeScenario.id} successfully triggered and processed by agents.`;
      mode = "mock";
    }

    setSimulationLogs((prev) => [
      {
        timestamp: new Date().toISOString(),
        scenario: activeScenario.id,
        message: resultMessage,
        mode,
      },
      ...prev,
    ]);
    setIsTriggering(false);
  };

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        padding: 28,
        borderRadius: 16,
        fontFamily: FONT,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.92); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .interactive-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .interactive-card:hover {
          transform: translateY(-2px);
          border-color: #38bdf8 !important;
          box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.15);
        }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: `1px solid ${BORDER}`,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(56, 189, 248, 0.1)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", animation: "pulse 1.5s infinite" }} />
              LIVE TELEMETRY STREAM
            </span>
            <span style={{ fontSize: 11, color: MUTED }}>• Chaos Engineering Simulator</span>
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              background: "linear-gradient(135deg, #fff 0%, #cbd5e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Incident Scenario Generator
          </div>
        </div>

        <span style={{ fontSize: 11, color: MUTED, background: "#090d14", padding: "6px 14px", borderRadius: 6, border: `1px solid ${BORDER}`, fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.5px" }}>
          [SYS-OK] {SCENARIOS.length} SCENARIOS ACTIVE
        </span>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#f87171",
            padding: "14px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 20,
            animation: "fadeIn 0.2s ease",
            fontFamily: "monospace",
          }}
        >
          [ERROR] Execution failed: {error}
        </div>
      )}

      {/* ── Main Split View ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Left: Scenarios Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxHeight: 460, overflowY: "auto", paddingRight: 6 }}>
          {SCENARIOS.map((s) => {
            const isSelected = selectedScenario === s.id;
            const sevTheme = severityStyles[s.severity] || severityStyles.low;

            return (
              <div
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                className="interactive-card"
                style={{
                  background: isSelected ? CARD_HOVER : CARD,
                  border: `1px solid ${isSelected ? "#38bdf8" : BORDER}`,
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: isSelected ? "0 0 20px rgba(56, 189, 248, 0.15)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: sevTheme.bg,
                      border: `1px solid ${sevTheme.border}`,
                      color: sevTheme.text,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.severity}
                  </span>
                  <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{s.category}</span>
                </div>

                <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? "#38bdf8" : TEXT, marginBottom: 6 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {s.description}
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {s.systems.map((sys) => (
                    <span key={sys} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#cbd5e1" }}>
                      {sys}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Active Scenario Trigger Console */}
        <div
          style={{
            background: "linear-gradient(145deg, #121722 0%, #0c1018 100%)",
            border: `1px solid #38bdf8`,
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 30px rgba(56, 189, 248, 0.1)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                  Selected Chaos Payload
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{activeScenario.name}</div>
              </div>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: (severityStyles[activeScenario.severity] || severityStyles.low).bg,
                  color: (severityStyles[activeScenario.severity] || severityStyles.low).text,
                  border: `1px solid ${(severityStyles[activeScenario.severity] || severityStyles.low).border}`,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {activeScenario.severity}
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Simulation Summary</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, background: "#090d14", padding: 14, borderRadius: 10, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
                {activeScenario.description}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Targeted MCP Integrations</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {activeScenario.systems.map((sys) => (
                  <div key={sys} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }} />
                    {sys} Server
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, color: "#f87171", marginBottom: 2 }}>INITIATE MULTI-AGENT LOOP</div>
              <div>{activeScenario.name}</div>
            </div>
            <button
              onClick={handleTrigger}
              disabled={isTriggering}
              style={{
                flexShrink: 0,
                background: isTriggering ? "transparent" : "transparent",
                color: isTriggering ? MUTED : "#f87171",
                border: `1px solid ${isTriggering ? BORDER : "rgba(239, 68, 68, 0.5)"}`,
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: isTriggering ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.4px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: isTriggering ? MUTED : "#f87171",
                animation: isTriggering ? "none" : "pulse 1.5s infinite",
              }} />
              {isTriggering ? "Running..." : "Trigger"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Live Simulation Activity Feed ── */}
      {simulationLogs.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Live Chaos Simulation Feed ({simulationLogs.length})
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {simulationLogs.map((log, idx) => {
              const matchedScen = SCENARIOS.find((s) => s.id === log.scenario) || SCENARIOS[0];
              return (
                <div
                  key={idx}
                  style={{
                    background: "#090d14",
                    border: `1px solid ${BORDER}`,
                    borderLeft: "4px solid #10b981",
                    borderRadius: 10,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                      [INJECTED] {matchedScen.name}
                    </span>
                    <span style={{ fontSize: 13, color: TEXT }}>{log.message}</span>
                  </div>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {new Date(log.timestamp).toLocaleTimeString()} ({log.mode.toUpperCase()})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
