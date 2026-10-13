"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useWidgetSDK } from "@nitrostack/widgets";

import { colors } from "./styles";

interface Evidence {
  type: "Document" | "Meeting";
  title: string;
  description: string;
  timestamp: string;
}

interface Props {
  data: {
    success: boolean;
    caseId: string;
    evidence: Evidence;
    message: string;
  };
  onExecuteTool?: (toolName: string, params?: any) => Promise<any>;
}

export default function EvidenceAddedView({ data, onExecuteTool }: Props) {
  const { callTool, sendFollowUpMessage, isReady } = useWidgetSDK();
  const Icon = data.evidence.type === "Meeting" ? CalendarDays : FileText;
  const color = data.evidence.type === "Meeting" ? "#10B981" : "#F59E0B";

  const handleViewCaseDetails = async () => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Open case details for ${data.caseId}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("create_case", {
        question: `Show investigation details for ${data.caseId}`,
        file: "PaymentService.ts",
      });
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("create_case", {
          question: `Show investigation details for ${data.caseId}`,
          file: "PaymentService.ts",
        });
      } catch (err) {
        console.error("Failed to view case details", err);
      }
    }
  };

  const handleOpenDashboard = async () => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage("List all active investigation cases"); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("list_cases", {});
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("list_cases", {});
      } catch (err) {
        console.error("Failed to view case dashboard", err);
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: 40,
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        style={{
          background: colors.surface,
          borderRadius: 32,
          padding: 48,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.7)",
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
            zIndex: 0,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.1)",
              border: "2px solid rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px auto",
              boxShadow: "0 0 40px rgba(16, 185, 129, 0.2)",
            }}
          >
            <CheckCircle2 size={48} color="#10B981" />
          </motion.div>

          {/* Title */}
          <h1
            style={{
              margin: "0 0 12px 0",
              fontSize: 32,
              fontWeight: 800,
              color: colors.text,
            }}
          >
            Evidence Attached
          </h1>

          <p
            style={{
              color: colors.secondary,
              fontSize: 16,
              lineHeight: 1.6,
              margin: "0 0 36px 0",
              fontWeight: 500,
            }}
          >
            {data.message}
          </p>

          {/* Evidence Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              padding: 24,
              textAlign: "left",
              marginBottom: 36,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${color}15`,
                  color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.secondary, textTransform: "uppercase" }}>
                  {data.evidence.type} Evidence
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginTop: 2 }}>
                  {data.evidence.title}
                </div>
              </div>
            </div>

            <p style={{ color: colors.secondary, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {data.evidence.description}
            </p>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: colors.secondary,
              }}
            >
              <span>Case ID: <strong>{data.caseId}</strong></span>
              <span>{new Date(data.evidence.timestamp).toLocaleTimeString()}</span>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleViewCaseDetails}
              style={{
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                border: "none",
                padding: "14px 28px",
                borderRadius: 16,
                color: "white",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 0 25px rgba(59, 130, 246, 0.3)",
              }}
            >
              View Case Details
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenDashboard}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${colors.border}`,
                padding: "14px 28px",
                borderRadius: 16,
                color: colors.text,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              View Case Dashboard
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
