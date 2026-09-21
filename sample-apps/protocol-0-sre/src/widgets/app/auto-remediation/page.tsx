"use client";

import React, { useState } from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

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
}

interface RecommendationsData {
  recommendations: Recommendation[];
}

const priorityColor: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#ffffff",
};

const MOCK_RECOMMENDATIONS: RecommendationsData = {
  recommendations: [],
};

export default function AutoRemediationWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const rawData = getToolOutput<RecommendationsData>();

  // Local state to track execution and update UI immediately
  const [actionStates, setActionStates] = useState<
    Record<string, { loading: boolean; status?: string; error?: string }>
  >({});

  const isDark = theme === "dark";
  const bg = "#111111";
  const cardBg = "#1c1c1c";
  const text = "#ffffff";
  const muted = "#888888";
  const border = "#2a2a2a";
  const shadow = "none";
  const backdropFilter = "none";

  const shellStyle: React.CSSProperties = {
    padding: 32,
    textAlign: "center",
    color: text,
    background: bg,
    borderRadius: 8,
    fontFamily: '"Inter", -apple-system, sans-serif',
  };

  if (!isReady)
    return <div style={shellStyle}>Connecting to decision board...</div>;

  const isMock = !rawData;
  const data = rawData || MOCK_RECOMMENDATIONS;
  if (!data) return <div style={shellStyle}>Loading recommendations...</div>;

  const recommendations = data.recommendations ?? [];

  const handleAction = async (recommendationId: string, approve: boolean) => {
    setActionStates((prev) => ({
      ...prev,
      [recommendationId]: { loading: true },
    }));

    try {
      if (isMock) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      } else {
        const toolName = approve
          ? "approveRecommendation"
          : "rejectRecommendation";
        await callTool(toolName, { recommendationId });
      }

      setActionStates((prev) => ({
        ...prev,
        [recommendationId]: {
          loading: false,
          status: approve ? "executed" : "rejected",
        },
      }));
    } catch (err) {
      console.error(err);
      setActionStates((prev) => ({
        ...prev,
        [recommendationId]: {
          loading: false,
          error:
            err instanceof Error ? err.message : "Action execution failed.",
        },
      }));
    }
  };

  return (
    <div
      style={{
        background: bg,
        color: text,
        padding: 24,
        borderRadius: 8,
        fontFamily: '"Inter", -apple-system, sans-serif',
        border: `1px solid ${border}`,
        boxShadow: "none",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.5px",
              color: "#ffffff",
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            Operational Control
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
            fontSize: 22,
            fontWeight: 500,
            marginTop: 4,
            letterSpacing: "0",
          }}
        >
          Action Recommendations
        </div>
        <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
          Executive Agent proposals requiring explicit approval workflow
          confirmation.
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: muted,
            fontWeight: 600,
            boxShadow: shadow,
          }}
        >
          ✅ All systems optimal. No actions pending approval.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {recommendations.map((r) => {
            const state = actionStates[r.recommendationId] || {};
            const currentStatus = state.status || r.status;
            const isPending = currentStatus === "pending";

            return (
              <div
                key={r.recommendationId}
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: shadow,
                  backdropFilter,
                  transition: "all 0.3s ease",
                }}
              >
                {/* Meta details */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "#1c1c1c",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    {r.priority} Priority
                  </span>
                  <span style={{ fontSize: 12, color: muted, fontWeight: 700 }}>
                    Incident: {r.incidentId} · Recommendation:{" "}
                    {r.recommendationId}
                  </span>

                  {/* Status Tag */}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      background:
                        currentStatus === "executed"
                          ? "rgba(16,185,129,0.15)"
                          : currentStatus === "rejected"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(245,158,11,0.15)",
                      color:
                        currentStatus === "executed"
                          ? "#10b981"
                          : currentStatus === "rejected"
                            ? "#ef4444"
                            : "#f59e0b",
                    }}
                  >
                    {currentStatus}
                  </span>
                </div>

                {/* Body */}
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>
                  {r.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: text,
                    marginBottom: 12,
                  }}
                >
                  {r.description}
                </div>

                {/* Sub-details (Impact, Evidence, Confidence) */}
                {(r.businessImpact || r.evidence || r.confidence) && (
                  <div
                    style={{
                      background: isDark ? "rgba(15, 23, 42, 0.4)" : "#f1f5f9",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 16,
                      fontSize: 12,
                      lineHeight: 1.4,
                      border: `1px solid ${border}`,
                    }}
                  >
                    {r.confidence && (
                      <div style={{ marginBottom: 6 }}>
                        <b>Confidence Level:</b>{" "}
                        <span style={{ color: "#10b981", fontWeight: 500 }}>
                          {r.confidence}%
                        </span>
                      </div>
                    )}
                    {r.businessImpact && (
                      <div style={{ marginBottom: 6 }}>
                        <b>Estimated Impact:</b> {r.businessImpact}
                      </div>
                    )}
                    {r.evidence && (
                      <div>
                        <b>Supporting Evidence:</b> <i>{r.evidence}</i>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {isPending && (
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      borderTop: `1px solid ${border}`,
                      paddingTop: 14,
                    }}
                  >
                    <button
                      onClick={() => handleAction(r.recommendationId, true)}
                      disabled={state.loading}
                      style={{
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 20px",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        flex: 1,
                        boxShadow: "0 4px 12px rgba(16,185,129,0.2)",
                        transition: "opacity 0.2s",
                        opacity: state.loading ? 0.6 : 1,
                      }}
                    >
                      {state.loading ? "Executing..." : "Approve & Execute"}
                    </button>
                    <button
                      onClick={() => handleAction(r.recommendationId, false)}
                      disabled={state.loading}
                      style={{
                        background: "none",
                        color: "#ef4444",
                        border: `1px solid #ef4444`,
                        borderRadius: 8,
                        padding: "10px 20px",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        flex: 1,
                        transition: "background 0.2s",
                        opacity: state.loading ? 0.6 : 1,
                      }}
                    >
                      Reject Proposal
                    </button>
                  </div>
                )}

                {/* Error message */}
                {state.error && (
                  <div
                    style={{
                      color: "#ef4444",
                      fontSize: 12,
                      marginTop: 8,
                      fontWeight: 700,
                    }}
                  >
                    ❌ {state.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
