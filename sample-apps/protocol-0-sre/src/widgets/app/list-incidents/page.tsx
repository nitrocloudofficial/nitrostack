"use client";

import React, { useState } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface Incident {
  incidentId: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  timestamp: string;
  affectedDepartments: string[];
  affectedSystems: string[];
  trigger: string;
  rootCause: string;
  confidenceScore: number;
}

interface IncidentList {
  incidents: Incident[];
}

const MOCK_INCIDENTS: Incident[] = [];

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

const statusColors: Record<string, string> = {
  detected: "#fbbf24",
  investigating: "#38bdf8",
  analyzed: "#818cf8",
  pending_approval: "#f472b6",
  mitigating: "#fb923c",
  resolved: "#34d399",
};

export default function ListIncidentsWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const toolOutput = getToolOutput<IncidentList>();

  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedInc, setSelectedInc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");

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
        <div style={{ fontSize: 15, color: MUTED }}>Connecting to Protocol-0 Command Room...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  const incidents = toolOutput?.incidents ?? MOCK_INCIDENTS;
  const activeIncidents = incidents.filter((inc) => inc.status !== "resolved");
  const resolvedIncidents = incidents.filter((inc) => inc.status === "resolved");
  const targetIncidents = activeTab === "active" ? activeIncidents : resolvedIncidents;

  const displayedIncidents = targetIncidents.filter((inc) => {
    const matchesSeverity = filterSeverity === "all" || inc.severity === filterSeverity;
    const matchesSearch =
      searchQuery === "" ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incidentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

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
        .tab-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
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
            <span style={{ fontSize: 11, color: MUTED }}>• Incident Command Room</span>
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
            Active Incidents Feed
          </div>
        </div>

        {/* Tabs Selector */}
        <div style={{ display: "flex", background: "#090d14", padding: 4, borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <button
            onClick={() => { setActiveTab("active"); setSelectedInc(null); }}
            className="tab-btn"
            style={{
              background: activeTab === "active" ? CARD : "transparent",
              color: activeTab === "active" ? TEXT : MUTED,
              borderColor: activeTab === "active" ? BORDER : "transparent",
            }}
          >
            [OPEN] Active ({activeIncidents.length})
          </button>
          <button
            onClick={() => { setActiveTab("resolved"); setSelectedInc(null); }}
            className="tab-btn"
            style={{
              background: activeTab === "resolved" ? CARD : "transparent",
              color: activeTab === "resolved" ? TEXT : MUTED,
              borderColor: activeTab === "resolved" ? BORDER : "transparent",
            }}
          >
            [CLOSED] Resolved ({resolvedIncidents.length})
          </button>
        </div>
      </div>

      {/* ── Search & Severity Filter Bar ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search incidents by ID, title, or category..."
          style={{
            flex: "1 1 280px",
            background: "#090d14",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            color: TEXT,
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          {["all", "critical", "high", "medium"].map((sev) => {
            const isSelected = filterSeverity === sev;
            const styleTheme = severityStyles[sev] || severityStyles.low;
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: isSelected ? (sev === "all" ? "#fff" : styleTheme.bg) : CARD,
                  color: isSelected ? (sev === "all" ? "#000" : styleTheme.text) : MUTED,
                  border: `1px solid ${isSelected ? (sev === "all" ? "#fff" : styleTheme.border) : BORDER}`,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Incidents List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 440, overflowY: "auto", paddingRight: 4 }}>
        {displayedIncidents.length === 0 ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #052e16 0%, #14532d 100%)",
                border: "2px solid #10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "#34d399",
                fontFamily: "monospace",
                boxShadow: "0 0 24px rgba(16,185,129,0.25)",
              }}
            >
              [OK]
            </div>
            <div style={{ color: "#34d399", fontWeight: 700, fontSize: 17 }}>All Systems Operational</div>
            <div style={{ color: MUTED, fontSize: 13, maxWidth: 320, lineHeight: 1.6 }}>
              {searchQuery || filterSeverity !== "all"
                ? "No incidents match your current filter parameters."
                : "No active incidents detected. Protocol-0 AI Mesh is monitoring your clusters."}
            </div>
            {(searchQuery || filterSeverity !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setFilterSeverity("all"); }}
                style={{
                  marginTop: 6,
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  color: "#38bdf8",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          displayedIncidents.map((inc) => {
            const isSelected = selectedInc === inc.incidentId;
            const sevTheme = severityStyles[inc.severity] || severityStyles.low;
            const statColor = statusColors[inc.status] || "#38bdf8";

            return (
              <div
                key={inc.incidentId}
                className="interactive-card"
                style={{
                  background: isSelected ? CARD_HOVER : CARD,
                  border: `1px solid ${isSelected ? "#38bdf8" : BORDER}`,
                  borderLeft: `4px solid ${sevTheme.text}`,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {/* Header Row */}
                <div
                  onClick={() => setSelectedInc(isSelected ? null : inc.incidentId)}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: sevTheme.bg,
                        border: `1px solid ${sevTheme.border}`,
                        color: sevTheme.text,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        boxShadow: sevTheme.glow,
                      }}
                    >
                      {inc.severity}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>
                      {inc.incidentId} — <span style={{ fontWeight: 400, color: "#e2e8f0" }}>{inc.title}</span>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${BORDER}`,
                        color: statColor,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: statColor }} />
                      {inc.status.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: 12, color: MUTED }}>{isSelected ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded Telemetry Accordion */}
                {isSelected && (
                  <div
                    style={{
                      padding: 20,
                      borderTop: `1px solid ${BORDER}`,
                      background: "#090d14",
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 16 }}>
                      <div>
                        <div style={{ color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                          Scope & Trigger
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 4 }}><b>Category:</b> {inc.category}</div>
                        <div style={{ fontSize: 13 }}><b>Trigger Signal:</b> <span style={{ color: "#fbbf24" }}>{inc.trigger || "Automated Monitoring Alert"}</span></div>
                      </div>
                      <div>
                        <div style={{ color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                          Blast Radius
                        </div>
                        <div style={{ fontSize: 13, marginBottom: 4 }}><b>Affected Depts:</b> {inc.affectedDepartments.join(", ") || "Engineering"}</div>
                        <div style={{ fontSize: 13 }}><b>Connected Systems:</b> {inc.affectedSystems.join(", ") || "Production Mesh"}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 14,
                        background: "rgba(56, 189, 248, 0.05)",
                        borderRadius: 10,
                        border: "1px dashed rgba(56, 189, 248, 0.3)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          [AI-OPS] Incident Commander Diagnosis
                        </span>
                        {inc.confidenceScore && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#34d399", fontFamily: "monospace" }}>
                            [VERIFIED] {inc.confidenceScore}% Confidence Score
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>
                        {inc.rootCause || "Multi-agent loop currently evaluating incident root cause. Check Action Recommendations tab for pending approvals."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
