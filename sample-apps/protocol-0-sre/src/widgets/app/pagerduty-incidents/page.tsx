"use client";

import React, { useState } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface PagerDutyIncident {
  id: string;
  title: string;
  status: "triggered" | "acknowledged" | "resolved";
  urgency: "high" | "low";
  created_at: string;
  service: string;
  assigned_to: string;
  escalation_policy: string;
}

interface PagerDutyData {
  incidents: PagerDutyIncident[];
}

const BG = "#0a0d14";
const CARD = "#121722";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const statusColors: Record<string, { text: string; bg: string; border: string }> = {
  triggered: { text: "#f87171", bg: "rgba(248, 113, 113, 0.1)", border: "rgba(248, 113, 113, 0.3)" },
  acknowledged: { text: "#fbbf24", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  resolved: { text: "#34d399", bg: "rgba(52, 211, 153, 0.1)", border: "rgba(52, 211, 153, 0.3)" },
};

const urgencyColors: Record<string, { text: string; bg: string; border: string }> = {
  high: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
  low: { text: "#38bdf8", bg: "rgba(56, 189, 248, 0.1)", border: "rgba(56, 189, 248, 0.3)" },
};

export default function PagerDutyIncidentsWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<PagerDutyData>();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("all");

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
        <div style={{ fontSize: 15, color: MUTED }}>Connecting to PagerDuty API...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  // Extract incidents array robustly
  let incidents: PagerDutyIncident[] = [];
  if (rawData) {
    if (Array.isArray(rawData)) {
      incidents = rawData;
    } else if (typeof rawData === "object") {
      const foundArray = Object.values(rawData).find((val) => Array.isArray(val));
      if (foundArray) {
        incidents = foundArray as PagerDutyIncident[];
      }
    }
  }

  const filteredIncidents = incidents.filter((i) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      i.title.toLowerCase().includes(query) ||
      i.service.toLowerCase().includes(query) ||
      i.assigned_to.toLowerCase().includes(query) ||
      i.id.toLowerCase().includes(query);

    const matchesUrgency = filterUrgency === "all" || i.urgency === filterUrgency;

    return matchesSearch && matchesUrgency;
  });

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        padding: 24,
        borderRadius: 16,
        fontFamily: FONT,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "1.2px",
              color: "#38bdf8",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Incident Command
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: "-0.5px" }}>
          PagerDuty Alerts Queue
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          Escalation queues, assigned engineering on-call responders, and active alerts.
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Team, Service, Alert title..."
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
          {[
            { label: "All Urgency", val: "all" },
            { label: "High Urgency", val: "high" },
            { label: "Low Urgency", val: "low" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setFilterUrgency(tab.val)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: filterUrgency === tab.val ? TEXT : CARD,
                color: filterUrgency === tab.val ? BG : MUTED,
                border: `1px solid ${filterUrgency === tab.val ? TEXT : BORDER}`,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxHeight: 380,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {filteredIncidents.length === 0 ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "48px 24px",
              textAlign: "center",
              color: MUTED,
              fontSize: 13,
            }}
          >
            No active alerts in PagerDuty.
          </div>
        ) : (
          filteredIncidents.map((i) => {
            const status = statusColors[i.status] || {
              text: MUTED,
              bg: "rgba(255,255,255,0.05)",
              border: BORDER,
            };
            const urgency = urgencyColors[i.urgency] || urgencyColors.low;

            return (
              <div
                key={i.id}
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 16,
                  transition: "all 0.2s",
                }}
              >
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
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: status.bg,
                        color: status.text,
                        border: `1px solid ${status.border}`,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {i.status}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: urgency.bg,
                        color: urgency.text,
                        border: `1px solid ${urgency.border}`,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {i.urgency} Urgency
                    </span>
                    <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>
                      ID: {i.id}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {new Date(i.created_at).toLocaleString()}
                  </span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>
                  {i.title}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    fontSize: 11,
                    marginTop: 10,
                    background: "rgba(0,0,0,0.15)",
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div>
                    <span style={{ color: MUTED }}>Service:</span>{" "}
                    <span style={{ fontWeight: 500 }}>{i.service}</span>
                  </div>
                  <div>
                    <span style={{ color: MUTED }}>Assigned To:</span>{" "}
                    <span style={{ fontWeight: 500 }}>{i.assigned_to}</span>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: MUTED }}>Escalation Policy:</span>{" "}
                    <span style={{ fontFamily: "monospace" }}>{i.escalation_policy}</span>
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
