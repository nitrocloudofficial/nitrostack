"use client";

import React from "react";
import { useTheme, useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

type HealthStatus = "healthy" | "warning" | "critical";

interface EngineeringHealthData {
  engineeringHealthScore: number;
  status: HealthStatus;
  breakdown: {
    deploymentSuccess: number;
    cicdSuccess: number;
    sprintHealth: number;
    issueRate: number;
    infrastructureHealth: number;
  };
  metricsWeights: {
    deploymentSuccess: string;
    cicdSuccess: string;
    sprintHealth: string;
    issueRate: string;
    infrastructureHealth: string;
  };
  lastUpdated: string;
}

const statusColor: Record<HealthStatus, string> = {
  healthy: "#10b981", // Emerald
  warning: "#f59e0b", // Amber
  critical: "#ef4444", // Red
};

const MOCK_ENGINEERING_HEALTH: EngineeringHealthData = {
  engineeringHealthScore: 78,
  status: "warning",
  breakdown: {
    deploymentSuccess: 65,
    cicdSuccess: 80,
    sprintHealth: 90,
    issueRate: 85,
    infrastructureHealth: 72,
  },
  metricsWeights: {
    deploymentSuccess: "25%",
    cicdSuccess: "20%",
    sprintHealth: "20%",
    issueRate: "15%",
    infrastructureHealth: "20%",
  },
  lastUpdated: new Date().toISOString(),
};

export default function EngineeringHealthWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const rawData = getToolOutput<EngineeringHealthData>();

  const isDark = theme === "dark";
  const bg = "#111111";
  const card = "#1c1c1c";
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
    minHeight: 300,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  };

  if (!isReady) return <div style={shellStyle}>Connecting to host...</div>;

  const isMock = !rawData;
  const data = rawData || MOCK_ENGINEERING_HEALTH;
  if (!data)
    return (
      <div style={shellStyle}>
        No engineering health telemetry data received.
      </div>
    );

  const score = data.engineeringHealthScore ?? 0;
  const status = (data.status ?? "warning") as HealthStatus;
  const breakdown = data.breakdown ?? {
    deploymentSuccess: 100,
    cicdSuccess: 100,
    sprintHealth: 100,
    issueRate: 100,
    infrastructureHealth: 100,
  };
  const weights = data.metricsWeights ?? {
    deploymentSuccess: "25%",
    cicdSuccess: "20%",
    sprintHealth: "20%",
    issueRate: "15%",
    infrastructureHealth: "20%",
  };

  const metricItems = [
    {
      label: "Deployment Success Rate",
      weight: weights.deploymentSuccess,
      value: breakdown.deploymentSuccess,
      desc: "Weighted rate of successful GitHub Deployments vs rollbacks",
    },
    {
      label: "CI/CD Pipeline Success",
      weight: weights.cicdSuccess,
      value: breakdown.cicdSuccess,
      desc: "Pass rate of GitHub Actions workflow runs",
    },
    {
      label: "Sprint Delivery Velocity",
      weight: weights.sprintHealth,
      value: breakdown.sprintHealth,
      desc: "Ratio of remaining story points to available developer capacity",
    },
    {
      label: "Issue Rate Stability",
      weight: weights.issueRate,
      value: breakdown.issueRate,
      desc: "Active Jira issues vs historical nominal baseline average",
    },
    {
      label: "Infrastructure Health",
      weight: weights.infrastructureHealth,
      value: breakdown.infrastructureHealth,
      desc: "Aggregated Datadog CPU usage, RAM health, and HTTP uptime checks",
    },
  ];

  return (
    <div
      style={{
        background: bg,
        color: text,
        padding: 24,
        borderRadius: 8,
        fontFamily: '"Inter", -apple-system, sans-serif',
        boxShadow: "none",
        border: `1px solid ${border}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.4px",
                color: "#ffffff",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              AI Workplace Digital Twin
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
              fontSize: 24,
              fontWeight: 500,
              marginTop: 4,
              letterSpacing: "0",
            }}
          >
            Engineering Health Center
          </div>
        </div>
        <div style={{ fontSize: 11, color: muted, alignSelf: "flex-end" }}>
          Last Checked: {new Date(data.lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {/* Large Metric circular dial */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: shadow,
            backdropFilter,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              flexShrink: 0,
              background: `conic-gradient(${statusColor[status]} ${score * 3.6}deg, ${border} 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 0 16px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: "50%",
                background: "#1c1c1c",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {score}%
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: muted,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Health Score
              </span>
            </div>
          </div>
          <div
            style={{
              marginTop: 20,
              padding: "6px 16px",
              borderRadius: 999,
              background: `rgba(${status === "healthy" ? "16,185,129" : status === "warning" ? "245,158,11" : "239,68,68"}, 0.2)`,
              border: "1px solid #2a2a2a",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            {status}
          </div>
        </div>

        {/* Detailed Slider Breakdown */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: 24,
            boxShadow: shadow,
            backdropFilter,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Weighted Metric Breakdown
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {metricItems.map((m) => (
              <div key={m.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>
                    {m.label}{" "}
                    <span
                      style={{ color: muted, fontSize: 10, fontWeight: 600 }}
                    >
                      ({m.weight})
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 500,
                      color:
                        statusColor[
                          m.value >= 85
                            ? "healthy"
                            : m.value >= 65
                              ? "warning"
                              : "critical"
                        ],
                    }}
                  >
                    {m.value}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: border,
                    borderRadius: 999,
                    overflow: "hidden",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: `${m.value}%`,
                      height: "100%",
                      background: "#ffffff",
                      borderRadius: 999,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: muted }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
