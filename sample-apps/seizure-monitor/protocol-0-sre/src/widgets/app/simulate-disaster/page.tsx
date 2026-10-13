"use client";

import React, { useState } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface DisasterResponse {
  simulationId: string;
  targetNode: string;
  cascadingImpact: string[];
  estimatedDowntime: string;
  recommendedPreemptiveActions: string[];
}

const BG = "#0a0d14";
const CARD = "#121722";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

export default function SimulateDisasterWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const rawData = getToolOutput<DisasterResponse>();

  const [targetNode, setTargetNode] = useState("auth-db");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localReport, setLocalReport] = useState<DisasterResponse | null>(null);

  const handleSimulate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await callTool("simulate_disaster", { targetNode }) as any;
      if (res) {
        const data = res.structuredContent || res;
        setLocalReport(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to trigger disaster simulation.");
    } finally {
      setLoading(false);
    }
  };

  const report = localReport || rawData;

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
        <div style={{ fontSize: 15, color: MUTED }}>Initializing Disaster Control Room...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

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
              color: "#ef4444",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            Disaster Engineering
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: "-0.5px" }}>
          What-If Outage Simulator
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          Inject catastrophic infrastructure faults to test system resiliency and auto-remediation.
        </div>
      </div>

      {/* Target Selector */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Target Component
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              minWidth: 180,
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "10px 12px",
              color: TEXT,
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="auth-db">Database Cluster (database-pod-0)</option>
            <option value="auth-service">Authentication Gateway (auth-service)</option>
            <option value="gateway-service">API Gateway Router (gateway-service)</option>
            <option value="eu-west-1">Cloud Region (eu-west-1)</option>
          </select>

          <button
            onClick={handleSimulate}
            disabled={loading}
            style={{
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "0 24px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#dc2626";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#ef4444";
            }}
          >
            {loading ? "Injecting Fault..." : "Inject Outage"}
          </button>
        </div>
        {error && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 10, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Output / Report */}
      {report && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.03)",
            border: "1px dashed rgba(239, 68, 68, 0.3)",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>
              Simulation Report: {report.simulationId}
            </span>
            <span style={{ fontSize: 11, background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
              EST. DOWNTIME: {report.estimatedDowntime}
            </span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
              Cascading Operational Impact:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {report.cascadingImpact.map((impact, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "start", gap: 8, fontSize: 12, color: MUTED }}>
                  <span style={{ color: "#ef4444" }}>•</span>
                  <span>{impact}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
              Recommended Preemptive Actions:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {report.recommendedPreemptiveActions.map((action, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 10,
                    padding: "4px 10px",
                    background: CARD,
                    color: TEXT,
                    borderRadius: 6,
                    border: `1px solid ${BORDER}`,
                    fontWeight: 600,
                  }}
                >
                  {action}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
