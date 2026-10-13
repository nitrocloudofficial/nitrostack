"use client";

import { motion } from "framer-motion";
import {
  FolderGit2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { useWidgetSDK } from "@nitrostack/widgets";

import { colors } from "./styles";

interface Case {
  caseId: string;
  title: string;
  file: string;
  project: string;
  status: string;
  priority: string;
  progress: number;
  confidence: number;
  createdAt: string;
}

interface Props {
  data: {
    success: boolean;
    casesCount: number;
    cases: Case[];
  };
  onExecuteTool?: (toolName: string, params?: any) => Promise<any>;
}

export default function CaseDashboardView({ data, onExecuteTool }: Props) {
  const { callTool, sendFollowUpMessage, isReady } = useWidgetSDK();

  const handleOpenCase = async (c: Case) => {
    const targetQuestion = c.title || c.question;
    const params = { question: targetQuestion, file: c.file, caseId: c.caseId };
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Open case ${c.caseId}: ${targetQuestion}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("create_case", params);
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("create_case", params);
      } catch (err) {
        console.error("Failed to open case", err);
      }
    }
  };

  const handleNewInvestigation = async () => {
    const params = {
      question: "Investigate enterprise system architecture security and performance",
      file: "PaymentService.ts",
      isNewQuery: true
    };
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage("Start a new AI investigation case for system architecture"); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("create_case", params);
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("create_case", params);
      } catch (err) {
        console.error("Failed to start new investigation", err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "#10B981";
      case "collecting evidence":
        return "#3B82F6";
      case "generating timeline":
        return "#8B5CF6";
      default:
        return "#F59E0B";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: colors.surface,
          borderRadius: 24,
          padding: 30,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ color: colors.secondary, fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>
            EchoMind AI
          </div>
          <h1 style={{ margin: "8px 0 0 0", fontSize: 32, fontWeight: 800, color: colors.text }}>
            Investigation Dashboard
          </h1>
          <div style={{ marginTop: 8, color: colors.secondary, fontSize: 14 }}>
            Monitoring <strong style={{ color: "#3B82F6" }}>{data.casesCount} active cases</strong> across engineering repositories.
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNewInvestigation}
          style={{
            background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            border: "none",
            padding: "14px 28px",
            borderRadius: 16,
            color: "white",
            fontWeight: 700,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            boxShadow: "0 0 25px rgba(59, 130, 246, 0.4)",
          }}
        >
          <Plus size={18} />
          New Investigation
        </motion.button>
      </motion.div>

      {/* Cases Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 24,
        }}
      >
        {data.cases.map((item, index) => {
          const statusColor = getStatusColor(item.status);
          const priorityColor = getPriorityColor(item.priority);

          return (
            <motion.div
              key={item.caseId}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => handleOpenCase(item)}
              title={`Click to open ${item.caseId}`}
              style={{
                background: colors.surface,
                borderRadius: 24,
                padding: 26,
                border: `1px solid ${colors.border}`,
                boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 320,
                cursor: "pointer",
              }}
            >
              <div>
                {/* Case Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.secondary }}>
                    {item.caseId}
                  </span>

                  <div style={{ display: "flex", gap: 8 }}>
                    <span
                      style={{
                        background: `${priorityColor}15`,
                        color: priorityColor,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.priority}
                    </span>
                  </div>
                </div>

                {/* Case Title */}
                <h3
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 18,
                    fontWeight: 800,
                    color: colors.text,
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </h3>

                {/* File & Project */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: colors.secondary }}>
                    File: <strong style={{ color: colors.text }}>{item.file}</strong>
                  </div>
                  <div style={{ fontSize: 13, color: colors.secondary }}>
                    Project: <strong style={{ color: colors.text }}>{item.project}</strong>
                  </div>
                </div>
              </div>

              <div>
                {/* Progress Bar */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: colors.secondary, marginBottom: 6 }}>
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${item.progress}%`,
                        background: statusColor,
                        boxShadow: `0 0 10px ${statusColor}`,
                      }}
                    />
                  </div>
                </div>

                {/* Case Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: `1px solid ${colors.border}`,
                    paddingTop: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: statusColor,
                        boxShadow: `0 0 8px ${statusColor}`,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ShieldCheck size={14} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>
                      {item.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
