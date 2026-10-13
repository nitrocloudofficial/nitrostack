import { motion } from "framer-motion";
import {
  GitCommit,
  CalendarDays,
  FileText,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

import { colors } from "./styles";

interface Props {
  evidence: {
    commits: number;
    meetings: number;
    documents: number;
  };
  verdict: {
    confidence: number;
  };
  card: string;
  secondary: string;
  onExecuteTool?: (toolName: string, params?: any) => Promise<any>;
}

export default function Metrics({
  evidence,
  verdict,
  card,
  secondary,
  onExecuteTool,
}: Props) {
  const metrics = [
    {
      title: "Git Commits",
      value: evidence.commits,
      color: "#3B82F6",
      icon: GitCommit,
      footer: "Evidence Collected",
      action: () => onExecuteTool?.("collect_code_evidence", { file: "AuthController.ts" })
    },
    {
      title: "Meetings",
      value: evidence.meetings,
      color: "#10B981",
      icon: CalendarDays,
      footer: "Meeting Records",
      action: () => onExecuteTool?.("search_engineering_docs", { query: "meeting decision" })
    },
    {
      title: "Documents",
      value: evidence.documents,
      color: "#F59E0B",
      icon: FileText,
      footer: "Referenced Files",
      action: () => onExecuteTool?.("search_engineering_docs", { query: "architecture specification" })
    },
    {
      title: "Confidence",
      value: `${verdict.confidence}%`,
      color: "#8B5CF6",
      icon: ShieldCheck,
      footer: "AI Confidence",
      action: () => onExecuteTool?.("find_similar_incidents", { topic: "auth" })
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
        gap: 20,
        marginTop: 34,
      }}
    >
      {metrics.map((metric, index) => {
        const Icon = metric.icon;

        return (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.1,
              duration: 0.45,
            }}
            whileHover={{
              y: -8,
              scale: 1.02,
            }}
            onClick={metric.action}
            style={{
              background: colors.surface,
              borderRadius: 22,
              padding: 24,
              border: `1px solid ${colors.border}`,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: `${metric.color}12`,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: `${metric.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: metric.color,
                  boxShadow: `0 0 15px ${metric.color}22`,
                }}
              >
                <Icon size={26} />
              </div>

              <ArrowUpRight
                size={18}
                color={metric.color}
              />
            </div>

            <div
              style={{
                marginTop: 24,
                fontSize: 13,
                color: colors.secondary,
                fontWeight: 700,
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            >
              {metric.title}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 40,
                fontWeight: 800,
                color: metric.color,
              }}
            >
              {metric.value}
            </div>

            <div
              style={{
                marginTop: 18,
                height: 6,
                borderRadius: 999,
                background: "rgba(255,255,255,.04)",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 1,
                  delay: index * 0.15,
                }}
                style={{
                  height: "100%",
                  background: metric.color,
                  boxShadow: `0 0 10px ${metric.color}`,
                }}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                color: colors.secondary,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {metric.footer}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
