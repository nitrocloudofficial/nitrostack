"use client";

import React, { useState } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface Recommendation {
  recommendationId: string;
  incidentId: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  mcpServer: string;
  status:
    | "pending"
    | "approved"
    | "executing"
    | "executed"
    | "rejected"
    | "failed";
  evidence?: string;
  confidence?: number;
  businessImpact?: string;
  zero_trust_token?: string;
}

interface RecommendationsData {
  recommendations: Recommendation[];
}

const MOCK_RECOMMENDATIONS: RecommendationsData = {
  recommendations: [],
};

const BG = "#0a0d14";
const CARD = "#121722";
const CARD_HOVER = "#181f2e";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const priorityStyles: Record<
  string,
  { text: string; bg: string; border: string; glow: string }
> = {
  high: {
    text: "#f87171",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
    glow: "0 0 20px rgba(239, 68, 68, 0.25)",
  },
  medium: {
    text: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
    glow: "0 0 20px rgba(245, 158, 11, 0.2)",
  },
  low: {
    text: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.35)",
    glow: "none",
  },
};

const statusColors: Record<string, { text: string; bg: string; border: string }> = {
  pending: { text: "#fbbf24", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  approved: { text: "#38bdf8", bg: "rgba(56, 189, 248, 0.1)", border: "rgba(56, 189, 248, 0.3)" },
  executing: { text: "#818cf8", bg: "rgba(129, 140, 248, 0.1)", border: "rgba(129, 140, 248, 0.3)" },
  executed: { text: "#34d399", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
  rejected: { text: "#f87171", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
  failed: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" },
};

export default function RecommendationWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const rawData = getToolOutput<RecommendationsData>();
  console.log("[Recommendations Widget] rawData:", rawData, "isMock:", !rawData);

  const [actionStates, setActionStates] = useState<
    Record<string, { loading: boolean; status?: string; error?: string }>
  >({});
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
        <div style={{ fontSize: 15, color: MUTED }}>Connecting to Protocol-0 Operational Control...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  const data = rawData || MOCK_RECOMMENDATIONS;
  const recommendations = data.recommendations || [];

  const activeRecs = recommendations.filter((r) => {
    const state = actionStates[r.recommendationId] || {};
    const currentStatus = state.status || r.status;
    return currentStatus === "pending" || currentStatus === "executing" || currentStatus === "approved";
  });

  const resolvedRecs = recommendations.filter((r) => {
    const state = actionStates[r.recommendationId] || {};
    const currentStatus = state.status || r.status;
    return currentStatus === "executed" || currentStatus === "rejected" || currentStatus === "failed";
  });

  const displayedRecs = activeTab === "active" ? activeRecs : resolvedRecs;

  const handleAction = async (rec: Recommendation, action: "execute" | "reject") => {
    setActionStates((prev) => ({
      ...prev,
      [rec.recommendationId]: { loading: true, status: action === "execute" ? "executing" : "rejected" },
    }));

    if (action === "reject") {
      try {
        await callTool("rejectRecommendation", {
          recommendationId: rec.recommendationId,
          zero_trust_token: rec.zero_trust_token || "default-token",
        });
        setActionStates((prev) => ({
          ...prev,
          [rec.recommendationId]: { loading: false, status: "rejected" },
        }));
      } catch (err) {
        setActionStates((prev) => ({
          ...prev,
          [rec.recommendationId]: {
            loading: false,
            error: err instanceof Error ? err.message : "Action rejection failed.",
          },
        }));
      }
      return;
    }

    try {
      await callTool("approveRecommendation", {
        recommendationId: rec.recommendationId,
        zero_trust_token: rec.zero_trust_token || "default-token",
      });
      setActionStates((prev) => ({
        ...prev,
        [rec.recommendationId]: { loading: false, status: "executed" },
      }));
    } catch (err) {
      setActionStates((prev) => ({
        ...prev,
        [rec.recommendationId]: {
          loading: false,
          error: err instanceof Error ? err.message : "Action execution failed.",
        },
      }));
    }
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
            <span style={{ fontSize: 11, color: MUTED }}>• Operational Control</span>
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
            Action Recommendations
          </div>
        </div>

        {/* Tabs Selector */}
        <div style={{ display: "flex", background: "#090d14", padding: 4, borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <button
            onClick={() => setActiveTab("active")}
            className="tab-btn"
            style={{
              background: activeTab === "active" ? CARD : "transparent",
              color: activeTab === "active" ? TEXT : MUTED,
              borderColor: activeTab === "active" ? BORDER : "transparent",
            }}
          >
            [PENDING] Awaiting Review ({activeRecs.length})
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className="tab-btn"
            style={{
              background: activeTab === "resolved" ? CARD : "transparent",
              color: activeTab === "resolved" ? TEXT : MUTED,
              borderColor: activeTab === "resolved" ? BORDER : "transparent",
            }}
          >
            [EXECUTED] Logged ({resolvedRecs.length})
          </button>
        </div>
      </div>

      {/* ── Recommendations List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
        {displayedRecs.length === 0 ? (
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
                background: activeTab === "active" ? "linear-gradient(135deg, #052e16 0%, #14532d 100%)" : "linear-gradient(135deg, #121722 0%, #1e293b 100%)",
                border: `2px solid ${activeTab === "active" ? "#10b981" : BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: activeTab === "active" ? "#34d399" : MUTED,
                fontFamily: "monospace",
                boxShadow: activeTab === "active" ? "0 0 24px rgba(16,185,129,0.25)" : "none",
              }}
            >
              [OK]
            </div>
            <div style={{ color: activeTab === "active" ? "#34d399" : TEXT, fontWeight: 700, fontSize: 17 }}>
              {activeTab === "active" ? "All Actions Resolved" : "No Executed Actions Yet"}
            </div>
            <div style={{ color: MUTED, fontSize: 13, maxWidth: 320, lineHeight: 1.6 }}>
              {activeTab === "active"
                ? "No pending recommendations require your approval. Protocol-0 AI Mesh is fully synchronized."
                : "No recommendations have been executed or rejected in this session."}
            </div>
          </div>
        ) : (
          displayedRecs.map((r) => {
            const state = actionStates[r.recommendationId] || {};
            const currentStatus = state.status || r.status;
            const isPending = currentStatus === "pending";
            const isExecuting = currentStatus === "executing" || state.loading;
            const priTheme = priorityStyles[r.priority] || priorityStyles.low;
            const statTheme = statusColors[currentStatus] || statusColors.pending;

            return (
              <div
                key={r.recommendationId}
                className="interactive-card"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${priTheme.text}`,
                  borderRadius: 14,
                  padding: 22,
                  boxShadow: priTheme.glow,
                  position: "relative",
                  animation: "fadeIn 0.2s ease",
                }}
              >
                {/* Meta Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: priTheme.bg,
                        border: `1px solid ${priTheme.border}`,
                        color: priTheme.text,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {r.priority} Priority
                    </span>
                    <span style={{ fontSize: 12, color: MUTED }}>Target: <b style={{ color: "#e2e8f0" }}>{r.mcpServer} MCP</b></span>
                    <span style={{ fontSize: 12, color: MUTED }}>Incident: <b style={{ color: "#38bdf8" }}>{r.incidentId}</b></span>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: statTheme.bg,
                      border: `1px solid ${statTheme.border}`,
                      color: statTheme.text,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statTheme.text, animation: isPending ? "pulse 1.5s infinite" : "none" }} />
                    {currentStatus}
                  </span>
                </div>

                {/* Title & Description */}
                <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{r.title}</div>
                <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 16 }}>{r.description}</div>

                {/* Sub-details Panel */}
                {(r.businessImpact || r.evidence || r.confidence !== undefined) && (
                  <div
                    style={{
                      background: "#090d14",
                      borderRadius: 10,
                      padding: 14,
                      marginBottom: 18,
                      fontSize: 12,
                      lineHeight: 1.5,
                      border: `1px solid ${BORDER}`,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {r.confidence !== undefined && (
                      <div>
                        <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>AI Confidence</div>
                        <div style={{ color: "#34d399", fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>[VERIFIED] {r.confidence}% Match</div>
                      </div>
                    )}
                    {r.businessImpact && (
                      <div>
                        <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Projected Impact</div>
                        <div style={{ color: TEXT }}>{r.businessImpact}</div>
                      </div>
                    )}
                    {r.evidence && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Telemetry Evidence</div>
                        <div style={{ color: "#fbbf24", fontStyle: "italic" }}>"{r.evidence}"</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Banner */}
                {state.error && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      color: "#f87171",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      marginBottom: 16,
                      fontWeight: 500,
                      fontFamily: "monospace",
                    }}
                  >
                    [ERROR] Execution failed: {state.error}
                  </div>
                )}

                {/* Interactive Action Buttons */}
                {isPending && (
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleAction(r, "reject")}
                      disabled={isExecuting}
                      style={{
                        background: "transparent",
                        border: `1px solid ${BORDER}`,
                        color: MUTED,
                        padding: "10px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: isExecuting ? "not-allowed" : "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Reject Proposal
                    </button>
                    <button
                      onClick={() => handleAction(r, "execute")}
                      disabled={isExecuting}
                      style={{
                        background: isExecuting ? "#334155" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "none",
                        color: "#ffffff",
                        padding: "10px 24px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: isExecuting ? "not-allowed" : "pointer",
                        boxShadow: isExecuting ? "none" : "0 4px 15px rgba(16, 185, 129, 0.35)",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {isExecuting ? "Executing via MCP..." : `Approve & Execute via ${r.mcpServer}`}
                    </button>
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
