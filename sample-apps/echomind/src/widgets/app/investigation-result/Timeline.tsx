import { motion } from "framer-motion";
import {
  GitCommit,
  CalendarDays,
  FileText,
} from "lucide-react";

import { colors } from "./styles";

interface TimelineEvent {
  date: string;
  type: "Commit" | "Meeting" | "Document";
  title: string;
  description: string;
}

interface Props {
  timeline: TimelineEvent[];
  card: string;
  secondary: string;
  onExecuteTool?: (toolName: string, params?: any) => Promise<any>;
}

export default function Timeline({
  timeline,
  card,
  secondary,
  onExecuteTool,
}: Props) {
  const getColor = (type: string) => {
    switch (type) {
      case "Commit":
        return "#3B82F6";
      case "Meeting":
        return "#10B981"; // Vibrant emerald green
      default:
        return "#F59E0B";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Commit":
        return GitCommit;
      case "Meeting":
        return CalendarDays;
      default:
        return FileText;
    }
  };

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 24,
        padding: 28,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 28,
          fontSize: 28,
          fontWeight: 800,
          color: colors.text,
        }}
      >
        Investigation Timeline
      </h2>

      <div
        style={{
          position: "relative",
          paddingLeft: 28,
        }}
      >
        {/* Vertical Line */}
        <div
          style={{
            position: "absolute",
            left: 18,
            top: 10,
            bottom: 10,
            width: 2,
            background: "rgba(255, 255, 255, 0.05)",
          }}
        />

        {timeline.map((item, index) => {
          const color = getColor(item.type);
          const Icon = getIcon(item.type);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: .45,
                delay: index * .08,
              }}
              style={{
                position: "relative",
                marginBottom: 28,
              }}
            >
              {/* Dot */}

              <div
                style={{
                  position: "absolute",
                  left: -20,
                  top: 26,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: color,
                  border: "4px solid #050505",
                  boxShadow: `0 0 18px ${color}`,
                }}
              />

              <motion.div
                whileHover={{
                  y: -5,
                }}
                onClick={() => {
                  if (item.type === "commit" || item.type === "Commit") {
                    onExecuteTool?.("collect_code_evidence", { file: "AuthController.ts" });
                  } else {
                    onExecuteTool?.("search_engineering_docs", { query: item.title });
                  }
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 18,
                  padding: 20,
                  border: `1px solid ${colors.border}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        background: `${color}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color,
                        boxShadow: `0 0 15px ${color}11`,
                      }}
                    >
                      <Icon size={22} />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: colors.text,
                        }}
                      >
                        {item.title}
                      </div>

                      <div
                        style={{
                          color: colors.secondary,
                          marginTop: 4,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        {item.type} • {item.date}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: `${color}18`,
                      color,
                      padding: "6px 14px",
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {item.type}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    lineHeight: 1.7,
                    color: colors.secondary,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {item.description}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
