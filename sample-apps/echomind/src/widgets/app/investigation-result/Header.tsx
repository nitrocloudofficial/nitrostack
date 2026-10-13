"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  Search,
  User,
  FolderGit2,
  Edit2,
  Check,
} from "lucide-react";
import { useWidgetSDK } from "@nitrostack/widgets";

import { colors } from "./styles";

interface Props {
  question: string;
  caseId: string;
  author: string;
  project: string;
  isEditing: boolean;
  onQuestionChange: (q: string) => void;
  onEditToggle: (editing: boolean) => void;
  onExecuteTool?: (toolName: string, params?: any) => Promise<any>;
}

export default function Header({
  question,
  caseId,
  author,
  project,
  isEditing,
  onQuestionChange,
  onEditToggle,
  onExecuteTool
}: Props) {
  const { callTool, sendFollowUpMessage, isReady } = useWidgetSDK();

  const handleSaveQuestion = async () => {
    onEditToggle(false);
    if (question.trim()) {
      if (typeof sendFollowUpMessage === "function") {
        try { sendFollowUpMessage(`Investigate question: ${question.trim()}`); } catch (e) {}
      }
      if (onExecuteTool) {
        await onExecuteTool("create_case", { question: question.trim(), isNewQuery: true });
      } else if (isReady && typeof callTool === "function") {
        try {
          await callTool("create_case", { question: question.trim() });
        } catch (err) {
          console.error("Failed to re-trigger case investigation", err);
        }
      }
    }
  };

  const handleNavigateDashboard = async () => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage("List all active investigation cases"); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("list_cases", {});
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("list_cases", {});
      } catch (err) {
        console.error("Failed to list cases", err);
      }
    }
  };

  const handleCollectProjectEvidence = async () => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Collect code evidence for project ${project || "repository"}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("collect_code_evidence", { file: project, project });
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("collect_code_evidence", { file: project });
      } catch (err) {
        console.error("Failed to collect evidence for project", err);
      }
    }
  };

  const handleAuthorQuery = async () => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Collect code evidence for author ${author || "primary developer"}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("collect_code_evidence", { file: project || "AuthController.ts", author });
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("collect_code_evidence", { file: project || "AuthController.ts" });
      } catch (err) {
        console.error("Failed to collect author evidence", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div
        style={{
          background: colors.surface,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${colors.border}`,
          borderRadius: 24,
          padding: 30,
          marginBottom: 28,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Top Row */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18
            }}
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNavigateDashboard}
              title="Return to Cases Dashboard"
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow:
                  "0 0 40px rgba(59, 130, 246, 0.45)",
                cursor: "pointer",
              }}
            >
              <BrainCircuit
                size={36}
                color="white"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={handleNavigateDashboard}
              style={{ cursor: "pointer" }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: 38,
                  color: colors.text,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 0 30px rgba(59, 130, 246, 0.2)",
                }}
              >
                EchoMind AI
              </h1>

              <div
                style={{
                  color: colors.secondary,
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Enterprise Engineering Memory Platform
              </div>
            </motion.div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNavigateDashboard}
            style={{
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              color: "white",
              padding: "10px 18px",
              borderRadius: 12,
              fontWeight: 700,
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
              cursor: "pointer",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {caseId}
          </motion.div>
        </div>

        {/* Question Card */}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: .2 }}
          style={{
            marginTop: 28,
            background: "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            padding: 22,
            position: "relative",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: colors.secondary,
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".08em"
              }}
            >
              <Search size={16} />
              Investigation Question
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEditToggle(!isEditing)}
              style={{
                background: "transparent",
                border: "none",
                color: colors.secondary,
                cursor: "pointer",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = colors.blue;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = colors.secondary;
              }}
            >
              <Edit2 size={14} />
              {isEditing ? "Cancel" : "Edit"}
            </motion.button>
          </div>

          {isEditing ? (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start"
              }}
            >
              <motion.textarea
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                value={question}
                onChange={(e) => onQuestionChange(e.target.value)}
                placeholder="Enter investigation question..."
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(59, 130, 246, 0.5)",
                  borderRadius: 12,
                  padding: 14,
                  color: colors.text,
                  fontSize: 16,
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.5,
                  resize: "vertical",
                  minHeight: 80,
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxShadow: "0 0 0 rgba(59, 130, 246, 0)",
                }}
                onFocus={(e) => {
                  (e.target as HTMLElement).style.borderColor = "rgba(59, 130, 246, 1)";
                  (e.target as HTMLElement).style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLElement).style.borderColor = "rgba(59, 130, 246, 0.5)";
                  (e.target as HTMLElement).style.boxShadow = "0 0 0 rgba(59, 130, 246, 0)";
                }}
              />

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveQuestion}
                title="Run Investigation with updated question"
                style={{
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  border: "none",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 4,
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
                }}
              >
                <Check size={18} />
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.6,
                color: colors.text,
                wordWrap: "break-word",
                whiteSpace: "normal",
                overflowWrap: "break-word",
                maxWidth: "100%",
              }}
            >
              {question || "No investigation question provided"}
            </motion.div>
          )}
        </motion.div>

        {/* Bottom Row */}

        <div
          style={{
            display: "flex",
            gap: 30,
            marginTop: 24
          }}
        >
          <motion.div
            whileHover={{ x: 4 }}
            onClick={handleAuthorQuery}
            title="Ask AI about author contributions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: colors.secondary,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <User size={18} />
            <span>
              <strong style={{ color: colors.text }}>
                {author}
              </strong>
            </span>
          </motion.div>

          <motion.div
            whileHover={{ x: 4 }}
            onClick={handleCollectProjectEvidence}
            title="Scan project code evidence"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: colors.secondary,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <FolderGit2 size={18} />
            <span>{project}</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
