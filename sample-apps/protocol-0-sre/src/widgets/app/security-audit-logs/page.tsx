"use client";

import React, { useState } from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface AuditLog {
  event_id: string;
  event_type: string;
  actor: string;
  resource: string;
  action: string;
  status: string;
  timestamp: string;
  risk_level: "critical" | "high" | "medium" | "low";
  source_ip: string;
}

const BG = "#0a0d14";
const CARD = "#121722";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const riskStyles: Record<
  string,
  { text: string; bg: string; border: string; label: string }
> = {
  critical: {
    text: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.35)",
    label: "Critical Risk",
  },
  high: {
    text: "#f57c00",
    bg: "rgba(245, 124, 0, 0.1)",
    border: "rgba(245, 124, 0, 0.35)",
    label: "High Risk",
  },
  medium: {
    text: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.1)",
    border: "rgba(251, 191, 36, 0.3)",
    label: "Medium Risk",
  },
  low: {
    text: "#38bdf8",
    bg: "rgba(56, 189, 248, 0.1)",
    border: "rgba(56, 189, 248, 0.3)",
    label: "Low Risk",
  },
};

const statusStyles: Record<string, { text: string; bg: string }> = {
  SUCCESS: { text: "#34d399", bg: "rgba(52, 211, 153, 0.1)" },
  DENIED: { text: "#f87171", bg: "rgba(248, 113, 113, 0.1)" },
  BLOCKED: { text: "#f87171", bg: "rgba(248, 113, 113, 0.1)" },
  DENIED_HMAC_MISMATCH: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
};

export default function SecurityAuditLogsWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<AuditLog[]>();

  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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
        <div style={{ fontSize: 15, color: MUTED }}>Connecting to Zero-Trust Gate Auditor...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  let logs: AuditLog[] = [];
  if (rawData) {
    if (Array.isArray(rawData)) {
      logs = rawData;
    } else if (typeof rawData === "object") {
      // Look for any array property inside the object (e.g. rawData.logs or similar)
      const foundArray = Object.values(rawData).find((val) => Array.isArray(val));
      if (foundArray) {
        logs = foundArray as AuditLog[];
      }
    }
  }

  const filteredLogs = logs.filter((l) => {
    const matchesRisk = filterRisk === "all" || l.risk_level === filterRisk;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      l.event_id.toLowerCase().includes(query) ||
      l.event_type.toLowerCase().includes(query) ||
      l.actor.toLowerCase().includes(query) ||
      l.resource.toLowerCase().includes(query) ||
      l.action.toLowerCase().includes(query);
    return matchesRisk && matchesSearch;
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
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "1px",
              color: "#38bdf8",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Security Telemetry
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, letterSpacing: "-0.5px" }}>
          Zero-Trust Audit Logs
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          Audit trail of role modifications, API executions, and Zero-Trust signatures.
        </div>
      </div>

      {/* Controls: Search and Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Actor, Resource, Event ID..."
          style={{
            flex: 1,
            minWidth: 200,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "8px 12px",
            color: TEXT,
            fontSize: 13,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "critical", "high", "medium", "low"].map((risk) => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: filterRisk === risk ? TEXT : CARD,
                color: filterRisk === risk ? BG : MUTED,
                border: `1px solid ${filterRisk === risk ? TEXT : BORDER}`,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Logs timeline list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 480,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "48px 24px",
              textAlign: "center",
              color: MUTED,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            No matching audit logs found.
          </div>
        ) : (
          filteredLogs.map((l) => {
            const risk = riskStyles[l.risk_level] || riskStyles.low;
            const status = statusStyles[l.status] || { text: TEXT, bg: BORDER };

            return (
              <div
                key={l.event_id}
                className="audit-card"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderLeft: `4px solid ${risk.text}`,
                  borderRadius: 12,
                  padding: 16,
                  transition: "all 0.2s ease",
                }}
              >
                {/* Top metadata line */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: risk.bg,
                        color: risk.text,
                        border: `1px solid ${risk.border}`,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {risk.label}
                    </span>
                    <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
                      ID: {l.event_id}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {new Date(l.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Event details */}
                <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                  {l.event_type}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    fontSize: 12,
                    marginTop: 10,
                    background: "rgba(0,0,0,0.15)",
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div>
                    <span style={{ color: MUTED }}>Actor:</span>{" "}
                    <span style={{ fontWeight: 500 }}>{l.actor}</span>
                  </div>
                  <div>
                    <span style={{ color: MUTED }}>Status:</span>{" "}
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: status.bg,
                        color: status.text,
                        fontWeight: 600,
                        fontSize: 10,
                      }}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: MUTED }}>Action:</span>{" "}
                    <span style={{ fontWeight: 500 }}>{l.action}</span>
                  </div>
                  <div>
                    <span style={{ color: MUTED }}>IP Address:</span>{" "}
                    <span style={{ fontWeight: 500 }}>{l.source_ip}</span>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: MUTED }}>Resource:</span>{" "}
                    <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                      {l.resource}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
