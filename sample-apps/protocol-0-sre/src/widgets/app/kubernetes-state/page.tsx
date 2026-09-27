"use client";

import React, { useState } from "react";
import { useWidgetSDK } from "@nitrostack/widgets";

export const dynamic = "force-dynamic";

interface PodState {
  podName: string;
  namespace: string;
  status: string;
  cpuUsage: string;
  memoryUsage: string;
  restarts: number;
  createdAt: string;
  reason?: string;
  message?: string;
  failedAt?: string;
}

interface KubernetesData {
  pods: PodState[];
}

const BG = "#0a0d14";
const CARD = "#121722";
const BORDER = "#232d42";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const statusColors: Record<string, { text: string; bg: string; border: string }> = {
  Running: { text: "#34d399", bg: "rgba(52, 211, 153, 0.1)", border: "rgba(52, 211, 153, 0.3)" },
  Pending: { text: "#fbbf24", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  CrashLoopBackOff: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" },
  Failed: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.4)" },
};

export default function KubernetesStateWidget() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const rawData = getToolOutput<KubernetesData>();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [localPods, setLocalPods] = useState<PodState[] | null>(null);

  React.useEffect(() => {
    const fetchPods = async () => {
      try {
        const res = await callTool("getKubernetesState", {}) as any;
        if (res) {
          const data = res.structuredContent || res;
          if (data && data.pods) {
            setLocalPods(data.pods);
          } else if (Array.isArray(data)) {
            setLocalPods(data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch pods:", e);
      }
    };
    if (isReady) {
      fetchPods();
    }
  }, [isReady]);

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
        <div style={{ fontSize: 15, color: MUTED }}>Connecting to Kubernetes API Server...</div>
        <style>{`
          @keyframes spin { 100% { transform: rotate(360deg); } }
          .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  // Extract pods array robustly
  let pods: PodState[] = [];
  if (localPods) {
    pods = localPods;
  } else if (rawData) {
    if (Array.isArray(rawData)) {
      pods = rawData;
    } else if (typeof rawData === "object") {
      const foundArray = Object.values(rawData).find((val) => Array.isArray(val));
      if (foundArray) {
        pods = foundArray as PodState[];
      }
    }
  }

  const filteredPods = pods.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      p.podName.toLowerCase().includes(query) ||
      p.namespace.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query);

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "failing" && p.status !== "Running" && p.status !== "Pending") ||
      (filterStatus === "running" && p.status === "Running");

    return matchesSearch && matchesStatus;
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
            Infrastructure Control
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: "-0.5px" }}>
          Kubernetes Pod Monitor
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          Real-time container infrastructure health check for production namespace.
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter pods by name, status, namespace..."
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
            { label: "All Pods", val: "all" },
            { label: "Healthy", val: "running" },
            { label: "Failing", val: "failing" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setFilterStatus(tab.val)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: filterStatus === tab.val ? TEXT : CARD,
                color: filterStatus === tab.val ? BG : MUTED,
                border: `1px solid ${filterStatus === tab.val ? TEXT : BORDER}`,
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
        {filteredPods.length === 0 ? (
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
            No pods found in namespace.
          </div>
        ) : (
          filteredPods.map((p) => {
            const status = statusColors[p.status] || {
              text: MUTED,
              bg: "rgba(255,255,255,0.05)",
              border: BORDER,
            };

            return (
              <div
                key={p.podName}
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: status.bg,
                        color: status.text,
                        border: `1px solid ${status.border}`,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {p.status}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{p.podName}</span>
                  </div>
                  <span style={{ fontSize: 11, color: MUTED }}>
                    {new Date(p.createdAt).toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    fontSize: 11,
                    background: "rgba(0,0,0,0.15)",
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div>
                    <div style={{ color: MUTED, marginBottom: 2 }}>CPU</div>
                    <div style={{ fontWeight: 600 }}>{p.cpuUsage}</div>
                  </div>
                  <div>
                    <div style={{ color: MUTED, marginBottom: 2 }}>Memory</div>
                    <div style={{ fontWeight: 600 }}>{p.memoryUsage}</div>
                  </div>
                  <div>
                    <div style={{ color: MUTED, marginBottom: 2 }}>Restarts</div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: p.restarts > 0 ? "#ef4444" : TEXT,
                      }}
                    >
                      {p.restarts}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: MUTED, marginBottom: 2 }}>Namespace</div>
                    <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                      {p.namespace}
                    </div>
                  </div>
                </div>

                {p.status !== "Running" && (p.reason || p.message) && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "rgba(239, 68, 68, 0.07)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  >
                    {p.reason && (
                      <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 4 }}>
                        Failure Reason: {p.reason}
                      </div>
                    )}
                    {p.message && (
                      <div style={{ color: "#fca5a5", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", lineHeight: 1.4 }}>
                        {p.message}
                      </div>
                    )}
                    {p.failedAt && (
                      <div style={{ fontSize: 9, color: MUTED, marginTop: 6, textAlign: "right" }}>
                        Failed At: {new Date(p.failedAt).toLocaleString()}
                      </div>
                    )}
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
