"use client";

import React, { useState, useEffect } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

type HealthStatus = "healthy" | "warning" | "critical";

interface SubSystem {
  departmentId: string;
  departmentName: string;
  healthScore: number;
  status: HealthStatus;
  summary: string;
  owningAgent: string;
  sources: string[];
}

interface RecommendationLite {
  recommendationId: string;
  incidentId: string;
  priority: "high" | "medium" | "low";
  title: string;
}

interface CompanyHealth {
  companyHealthScore: number;
  status: HealthStatus;
  openIncidents: number;
  criticalRisks: number;
  departments: SubSystem[];
  recommendations: RecommendationLite[];
  lastUpdated: string;
}

const BG = "#0a0d14";
const CARD = "#121722";
const CARD_HOVER = "#181f2e";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const statusColors: Record<HealthStatus, { text: string; bg: string; border: string; glow: string }> = {
  healthy: {
    text: "#34d399",
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    glow: "0 0 20px rgba(16, 185, 129, 0.25)",
  },
  warning: {
    text: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.1)",
    border: "rgba(245, 158, 11, 0.3)",
    glow: "0 0 20px rgba(245, 158, 11, 0.25)",
  },
  critical: {
    text: "#f87171",
    bg: "rgba(239, 68, 68, 0.1)",
    border: "rgba(239, 68, 68, 0.3)",
    glow: "0 0 20px rgba(239, 68, 68, 0.35)",
  },
};

const DEPT_ICONS: Record<string, { icon: string; color: string }> = {
  engineering: { icon: "ENG", color: "#38bdf8" },
  operations: { icon: "OPS", color: "#818cf8" },
  support: { icon: "SUP", color: "#34d399" },
  hr: { icon: "HR", color: "#f472b6" },
  finance: { icon: "FIN", color: "#fbbf24" },
  security: { icon: "SEC", color: "#f87171" },
  product: { icon: "PRD", color: "#a78bfa" },
};

const MOCK_COMPANY_HEALTH: CompanyHealth = {
  companyHealthScore: 98,
  status: "healthy",
  openIncidents: 0,
  criticalRisks: 0,
  departments: [
    {
      departmentId: "engineering",
      departmentName: "Engineering",
      healthScore: 98,
      status: "healthy",
      summary: "All CI/CD pipelines green. Kubernetes production pods operating nominally.",
      owningAgent: "Engineering Agent",
      sources: ["GitHub", "Datadog", "Kubernetes"],
    },
    {
      departmentId: "operations",
      departmentName: "Operations",
      healthScore: 95,
      status: "healthy",
      summary: "Release schedules align with Jira progress. Sprint burndown is on track.",
      owningAgent: "Operations Agent",
      sources: ["Datadog", "Jira"],
    },
    {
      departmentId: "support",
      departmentName: "Support",
      healthScore: 96,
      status: "healthy",
      summary: "Customer issue reports remain within baseline rates. SLAs met.",
      owningAgent: "Support Agent",
      sources: ["Jira", "Zendesk"],
    },
    {
      departmentId: "hr",
      departmentName: "HR",
      healthScore: 100,
      status: "healthy",
      summary: "No critical staffing absences or scheduling conflicts detected.",
      owningAgent: "Operations Agent",
      sources: ["Google Calendar", "Workday"],
    },
    {
      departmentId: "finance",
      departmentName: "Finance",
      healthScore: 98,
      status: "healthy",
      summary: "Payment processor checkouts operational. No revenue leaks or latency spikes.",
      owningAgent: "Executive Agent",
      sources: ["Stripe", "Jira"],
    },
    {
      departmentId: "security",
      departmentName: "Security",
      healthScore: 100,
      status: "healthy",
      summary: "Zero trust guardrails verified. No unauthorized access attempts or vulnerability spikes.",
      owningAgent: "Monitoring Agent",
      sources: ["Datadog", "PagerDuty"],
    },
  ],
  recommendations: [],
  lastUpdated: new Date().toISOString(),
};

function StatusBadge({ status }: { status: HealthStatus }) {
  const theme = statusColors[status] || statusColors.healthy;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        color: theme.text,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: theme.glow,
        transition: "all 0.3s ease",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: theme.text,
          animation: "pulse 2s infinite",
        }}
      />
      {status}
    </span>
  );
}

export default function CompanyHealthWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<CompanyHealth>();

  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "integrations">("overview");
  const [selectedDept, setSelectedDept] = useState<SubSystem | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [simulatingPing, setSimulatingPing] = useState<string | null>(null);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  const data = rawData || MOCK_COMPANY_HEALTH;
  const score = data.companyHealthScore ?? 0;
  const status = (data.status ?? "healthy") as HealthStatus;
  const departments = data.departments ?? [];
  const recommendations = data.recommendations ?? [];

  const engDept = departments.find((d) => d.departmentId === "engineering");
  const engScore = engDept ? engDept.healthScore : score;

  const engMetrics = [
    { label: "Deployment Success Rate", weight: 25, value: engScore },
    { label: "CI/CD Build Stability", weight: 20, value: Math.min(100, Math.round(engScore * 1.02)) },
    { label: "Sprint Burndown Velocity", weight: 20, value: Math.min(100, Math.round(engScore * 0.95)) },
    { label: "Issue Rate Baseline", weight: 15, value: Math.min(100, Math.round(engScore * 0.98)) },
    { label: "K8s Pod Orchestration", weight: 20, value: Math.min(100, Math.round(engScore * 1.02)) },
  ];

  const handlePingAgent = (agentName: string) => {
    setSimulatingPing(agentName);
    setPingSuccess(null);
    setTimeout(() => {
      setSimulatingPing(null);
      setPingSuccess(agentName);
      setTimeout(() => setPingSuccess(null), 3000);
    }, 800);
  };

  const shellStyle: React.CSSProperties = {
    padding: 48,
    textAlign: "center",
    color: TEXT,
    background: BG,
    borderRadius: 16,
    fontFamily: FONT,
    minHeight: 360,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: `1px solid ${BORDER}`,
  };

  if (!isReady) {
    return (
      <div style={shellStyle}>
        <div className="spinner" style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>Connecting to Protocol-0 Digital Twin...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  const currentTheme = statusColors[status] || statusColors.healthy;

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
        overflow: "hidden",
      }}
    >
      {/* Dynamic Keyframes for micro-animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.92); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(56, 189, 248, 0.15); }
          50% { box-shadow: 0 0 25px rgba(56, 189, 248, 0.35); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .interactive-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .interactive-card:hover {
          transform: translateY(-3px);
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

      {/* ── Top Bar / Header ── */}
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
            <span style={{ fontSize: 11, color: MUTED }}>• Protocol-0 Multi-Agent Mesh</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #fff 0%, #cbd5e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Executive Command Center
          </div>
        </div>

        {/* Interactive Navigation Tabs */}
        <div style={{ display: "flex", background: "#090d14", padding: 4, borderRadius: 10, border: `1px solid ${BORDER}` }}>
          <button
            onClick={() => { setActiveTab("overview"); setSelectedDept(null); }}
            className="tab-btn"
            style={{
              background: activeTab === "overview" ? CARD : "transparent",
              color: activeTab === "overview" ? TEXT : MUTED,
              borderColor: activeTab === "overview" ? BORDER : "transparent",
            }}
          >
            📊 Executive Overview
          </button>
          <button
            onClick={() => { setActiveTab("matrix"); setSelectedDept(null); }}
            className="tab-btn"
            style={{
              background: activeTab === "matrix" ? CARD : "transparent",
              color: activeTab === "matrix" ? TEXT : MUTED,
              borderColor: activeTab === "matrix" ? BORDER : "transparent",
            }}
          >
            🏢 Subsystem Matrix ({departments.length})
          </button>
          <button
            onClick={() => { setActiveTab("integrations"); setSelectedDept(null); }}
            className="tab-btn"
            style={{
              background: activeTab === "integrations" ? CARD : "transparent",
              color: activeTab === "integrations" ? TEXT : MUTED,
              borderColor: activeTab === "integrations" ? BORDER : "transparent",
            }}
          >
            🔌 MCP Feed (6)
          </button>
        </div>
      </div>

      {/* ── Key Metrics Ribbon ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div
          style={{
            background: CARD,
            border: `1px solid ${data.openIncidents > 0 ? "rgba(239,68,68,0.4)" : BORDER}`,
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: data.openIncidents > 0 ? "0 0 20px rgba(239,68,68,0.15)" : "none",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Active Incidents</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: data.openIncidents > 0 ? "#f87171" : TEXT }}>{data.openIncidents ?? 0}</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: data.openIncidents > 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: data.openIncidents > 0 ? "#f87171" : MUTED, fontFamily: "monospace" }}>
            [INC]
          </div>
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${data.criticalRisks > 0 ? "rgba(245,158,11,0.4)" : BORDER}`,
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: data.criticalRisks > 0 ? "0 0 20px rgba(245,158,11,0.15)" : "none",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Critical Risks</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: data.criticalRisks > 0 ? "#fbbf24" : TEXT }}>{data.criticalRisks ?? 0}</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: data.criticalRisks > 0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: data.criticalRisks > 0 ? "#fbbf24" : MUTED, fontFamily: "monospace" }}>
            [RSK]
          </div>
        </div>

        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Autonomous Agents</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#38bdf8" }}>6 Active</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#38bdf8", fontFamily: "monospace" }}>
            [AGN]
          </div>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === "overview" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 1.5fr", gap: 20, marginBottom: 28 }}>
            {/* Circular Gauge Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #121722 0%, #0d121c 100%)",
                border: `1px solid ${currentTheme.border}`,
                borderRadius: 16,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                boxShadow: currentTheme.glow,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  background: `conic-gradient(${currentTheme.text} ${score * 3.6}deg, #1e293b 0deg)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  boxShadow: "0 0 30px rgba(0,0,0,0.5)",
                  transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: CARD,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 32, fontWeight: 800, color: currentTheme.text }}>{score}%</span>
                  <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "1px", marginTop: 2 }}>Health Score</span>
                </div>
              </div>

              <StatusBadge status={status} />
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 14 }}>System Telemetry Nominal</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 6, maxWidth: 220, lineHeight: 1.5 }}>
                Aggregated in real-time across Kubernetes, Datadog, Jira, and Slack integrations.
              </div>
            </div>

            {/* Engineering Breakdown with animated progress */}
            <div
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Engineering & Infrastructure Telemetry</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Real-time signal breakdown from Engineering Agent</div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{engScore}%</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {engMetrics.map((m, idx) => (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "#cbd5e1" }}>
                        {m.label} <span style={{ color: MUTED, fontSize: 11 }}>({m.weight}% weight)</span>
                      </span>
                      <span style={{ fontWeight: 600, color: TEXT }}>{m.value}%</span>
                    </div>
                    <div style={{ height: 6, background: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${m.value}%`,
                          height: "100%",
                          background: idx === 0 ? "linear-gradient(90deg, #38bdf8, #818cf8)" : idx === 4 ? "linear-gradient(90deg, #34d399, #10b981)" : "#38bdf8",
                          borderRadius: 999,
                          transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subsystems Preview Grid */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: MUTED }}>
              Subsystems Overview — <span style={{ color: "#38bdf8", textTransform: "none" }}>Click any card to inspect live telemetry</span>
            </span>
            <button
              onClick={() => setActiveTab("matrix")}
              style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              View Full Matrix →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {departments.map((d) => {
              const s = (d.status ?? "healthy") as HealthStatus;
              const meta = DEPT_ICONS[d.departmentId] || { icon: "🏢", color: "#38bdf8" };
              const isSelected = selectedDept?.departmentId === d.departmentId;

              return (
                <div
                  key={d.departmentId}
                  onClick={() => setSelectedDept(isSelected ? null : d)}
                  className="interactive-card"
                  style={{
                    background: isSelected ? CARD_HOVER : CARD,
                    border: `1px solid ${isSelected ? "#38bdf8" : BORDER}`,
                    borderRadius: 14,
                    padding: 18,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{d.departmentName}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>{d.owningAgent}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>{d.healthScore}%</span>
                  </div>

                  <div style={{ height: 4, background: "#1e293b", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ width: `${d.healthScore}%`, height: "100%", background: meta.color, borderRadius: 999 }} />
                  </div>

                  <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {d.summary}
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    {d.sources.map((src) => (
                      <span key={src} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#cbd5e1" }}>
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: SUBSYSTEM MATRIX / INTERACTIVE INSPECTOR ── */}
      {activeTab === "matrix" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ marginBottom: 16, fontSize: 13, color: MUTED }}>
            Select any subsystem below to run real-time agent diagnostics and inspect deep telemetry feeds.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left Column: Department List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {departments.map((d) => {
                const meta = DEPT_ICONS[d.departmentId] || { icon: "🏢", color: "#38bdf8" };
                const isSelected = (selectedDept || departments[0])?.departmentId === d.departmentId;

                return (
                  <div
                    key={d.departmentId}
                    onClick={() => setSelectedDept(d)}
                    className="interactive-card"
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.08)" : CARD,
                      border: `1px solid ${isSelected ? "#38bdf8" : BORDER}`,
                      borderRadius: 14,
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{d.departmentName}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>Managed by {d.owningAgent}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: meta.color }}>{d.healthScore}%</span>
                      <span style={{ color: MUTED }}>→</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Deep Inspection Panel */}
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
              {(() => {
                const active = selectedDept || departments[0];
                if (!active) return null;
                const meta = DEPT_ICONS[active.departmentId] || { icon: "🏢", color: "#38bdf8" };

                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 50, height: 50, borderRadius: 12, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                          {meta.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700 }}>{active.departmentName} Subsystem</div>
                          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 500 }}>{active.owningAgent} Autonomous Loop</div>
                        </div>
                      </div>
                      <StatusBadge status={active.status} />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Live Diagnostic Summary</div>
                      <div style={{ fontSize: 14, lineHeight: 1.6, background: "#090d14", padding: 16, borderRadius: 10, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
                        {active.summary}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Active MCP Integrations</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {active.sources.map((src) => (
                          <div key={src} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 500 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
                            {src} Server
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Agent Ping Button */}
                    <div style={{ background: "rgba(56,189,248,0.05)", border: "1px dashed rgba(56,189,248,0.3)", borderRadius: 12, padding: 16, textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Automated Guardrail Verification</div>
                      <button
                        onClick={() => handlePingAgent(active.owningAgent)}
                        disabled={simulatingPing === active.owningAgent}
                        style={{
                          background: simulatingPing === active.owningAgent ? "#334155" : pingSuccess === active.owningAgent ? "#10b981" : "#38bdf8",
                          color: "#fff",
                          border: "none",
                          padding: "10px 20px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: "0 4px 12px rgba(56,189,248,0.25)",
                        }}
                      >
                        {simulatingPing === active.owningAgent
                          ? "Running Diagnostics..."
                          : pingSuccess === active.owningAgent
                          ? "[VERIFIED] Health OK (12ms)"
                          : `Run Diagnostic: ${active.owningAgent}`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: INTEGRATIONS / MCP FEED ── */}
      {activeTab === "integrations" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ marginBottom: 16, fontSize: 13, color: MUTED }}>
            Real-time status of connected Model Context Protocol (MCP) data servers feeding the Protocol-0 Digital Twin.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {[
              { name: "Kubernetes Production", status: "Connected", ping: "14ms", events: "Pod telemetry & crash loop monitoring", icon: "K8S", color: "#326ce5" },
              { name: "GitHub Enterprise", status: "Connected", ping: "42ms", events: "PR merge tracking & commit rollbacks", icon: "GH", color: "#f0f6fc" },
              { name: "Datadog Telemetry", status: "Connected", ping: "19ms", events: "APM latency, CPU spikes & OOM alerts", icon: "DD", color: "#6366f1" },
              { name: "Jira Cloud", status: "Connected", ping: "35ms", events: "Sprint velocity & automated ticket assignment", icon: "JIRA", color: "#38bdf8" },
              { name: "Slack Incident Room", status: "Connected", ping: "28ms", events: "Executive notifications & action approvals", icon: "SLK", color: "#34d399" },
              { name: "Google Workspace", status: "Connected", ping: "45ms", events: "OOO calendar syncing & meeting rescheduling", icon: "CAL", color: "#fbbf24" },
            ].map((mcp) => (
              <div
                key={mcp.name}
                className="interactive-card"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: mcp.color }}>{mcp.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{mcp.name}</span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", fontWeight: 600 }}>
                    ● {mcp.status}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>{mcp.events}</div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: MUTED, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                  <span>Transport: <b style={{ color: TEXT }}>MCP Stdio/SSE</b></span>
                  <span>Latency: <b style={{ color: "#34d399" }}>{mcp.ping}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendations Ribbon ── */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Actionable Recommendations Awaiting Review ({recommendations.length})
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recommendations.map((r) => (
              <div
                key={r.recommendationId}
                className="interactive-card"
                style={{
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, background: "#fbbf24", color: "#000", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    {r.priority}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{r.title}</span>
                </div>
                <span style={{ fontSize: 12, color: MUTED }}>Incident: {r.incidentId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
