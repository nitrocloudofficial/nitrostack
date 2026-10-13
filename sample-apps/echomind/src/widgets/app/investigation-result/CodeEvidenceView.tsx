"use client";

import { motion } from "framer-motion";
import {
  GitCommit,
  User,
  CalendarDays,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useWidgetSDK } from "@nitrostack/widgets";

import { colors } from "./styles";

interface Author {
  id: string;
  name: string;
  role: string;
  team: string;
}

interface Meeting {
  id: string;
  title: string;
  decision: string;
  date: string;
}

interface Document {
  id: string;
  title: string;
  summary: string;
}

interface CommitEvidence {
  commitId: string;
  date: string;
  message: string;
  project: string;
  author: Author | null;
  meeting: Meeting | null;
  document: Document | null;
}

interface Props {
  data: {
    success: boolean;
    file: string;
    commitsFound?: number;
    message?: string;
    investigation?: CommitEvidence[];
  };
  onExecuteTool?: (toolName: string, params?: any) => Promise<any>;
}

export default function CodeEvidenceView({ data, onExecuteTool }: Props) {
  const { callTool, sendFollowUpMessage, isReady } = useWidgetSDK();

  const handleStartCaseForFile = async () => {
    const params = {
      question: `Investigate code history and decisions for ${data.file}`,
      file: data.file,
      isNewQuery: true
    };
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Start full investigation for ${data.file}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("create_case", params);
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("create_case", params);
      } catch (err) {
        console.error("Failed to start case investigation", err);
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

  const handleAuthorClick = async (authorName: string) => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Collect code evidence for author ${authorName}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("collect_code_evidence", { file: data.file, author: authorName });
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("collect_code_evidence", { file: data.file, author: authorName });
      } catch (err) {
        console.error("Failed to collect evidence for author", err);
      }
    }
  };

  const handleMeetingClick = async (meetingTitle: string) => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Search engineering docs for meeting: ${meetingTitle}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("search_engineering_docs", { query: meetingTitle });
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("search_engineering_docs", { query: meetingTitle });
      } catch (err) {
        console.error("Failed to explain meeting", err);
      }
    }
  };

  const handleDocumentClick = async (docTitle: string) => {
    if (typeof sendFollowUpMessage === "function") {
      try { sendFollowUpMessage(`Search engineering docs for document: ${docTitle}`); } catch (e) {}
    }
    if (onExecuteTool) {
      await onExecuteTool("search_engineering_docs", { query: docTitle });
    } else if (isReady && typeof callTool === "function") {
      try {
        await callTool("search_engineering_docs", { query: docTitle });
      } catch (err) {
        console.error("Failed to summarize document", err);
      }
    }
  };

  if (!data.success || !data.investigation || data.investigation.length === 0) {
    return (
      <div
        style={{
          background: colors.surface,
          borderRadius: 24,
          padding: 40,
          border: `1px solid ${colors.border}`,
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}
      >
        <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 16 }} />
        <h2 style={{ color: colors.text, margin: "0 0 12px 0" }}>No Evidence Found</h2>
        <p style={{ color: colors.secondary, margin: "0 0 20px 0" }}>
          {data.message ?? `No code evidence found for file: ${data.file}`}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenDashboard}
          style={{
            background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
            border: "none",
            padding: "12px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          View Case Dashboard
        </motion.button>
      </div>
    );
  }

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
            Code Evidence Explorer
          </div>
          <h1 style={{ margin: "8px 0 0 0", fontSize: 32, fontWeight: 800, color: colors.text }}>
            {data.file}
          </h1>
          <div style={{ marginTop: 8, color: colors.secondary, fontSize: 14 }}>
            Correlated <strong style={{ color: "#3B82F6" }}>{data.commitsFound} commits</strong> with engineering memory.
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStartCaseForFile}
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            padding: "12px 24px",
            borderRadius: 16,
            color: "#3B82F6",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Run Full Case Investigation
        </motion.button>
      </motion.div>

      {/* Commits Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {data.investigation.map((commit, index) => (
          <motion.div
            key={commit.commitId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              background: colors.surface,
              borderRadius: 24,
              padding: 28,
              border: `1px solid ${colors.border}`,
              boxShadow: "0 15px 35px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Commit Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `1px solid ${colors.border}`,
                paddingBottom: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(59, 130, 246, 0.1)",
                    color: "#3B82F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GitCommit size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
                    {commit.message}
                  </div>
                  <div style={{ fontSize: 13, color: colors.secondary, marginTop: 4 }}>
                    {commit.commitId} • {commit.date} • Project: {commit.project}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${colors.border}`,
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  color: colors.secondary,
                  fontWeight: 600,
                }}
              >
                Commit Verified
              </div>
            </div>

            {/* Correlated Entities Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 20,
              }}
            >
              {/* Author Card */}
              <div
                onClick={() => commit.author && handleAuthorClick(commit.author.name)}
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 18,
                  padding: 18,
                  cursor: commit.author ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <User size={16} color="#3B82F6" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.secondary, textTransform: "uppercase" }}>
                    Author
                  </span>
                </div>
                {commit.author ? (
                  <>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
                      {commit.author.name}
                    </div>
                    <div style={{ fontSize: 13, color: colors.secondary, marginTop: 4 }}>
                      {commit.author.role}
                    </div>
                    <div style={{ fontSize: 12, color: "#3B82F6", marginTop: 8, fontWeight: 600 }}>
                      {commit.author.team}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: colors.secondary, fontStyle: "italic" }}>
                    No author details correlated.
                  </div>
                )}
              </div>

              {/* Meeting Card */}
              <div
                onClick={() => commit.meeting && handleMeetingClick(commit.meeting.title)}
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 18,
                  padding: 18,
                  cursor: commit.meeting ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <CalendarDays size={16} color="#10B981" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.secondary, textTransform: "uppercase" }}>
                    Correlated Meeting
                  </span>
                </div>
                {commit.meeting ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, lineHeight: 1.4 }}>
                      {commit.meeting.title}
                    </div>
                    <div style={{ fontSize: 13, color: colors.secondary, marginTop: 6, fontStyle: "italic" }}>
                      &ldquo;{commit.meeting.decision}&rdquo;
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: colors.secondary, fontStyle: "italic" }}>
                    No meeting records found.
                  </div>
                )}
              </div>

              {/* Document Card */}
              <div
                onClick={() => commit.document && handleDocumentClick(commit.document.title)}
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 18,
                  padding: 18,
                  cursor: commit.document ? "pointer" : "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <FileText size={16} color="#F59E0B" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.secondary, textTransform: "uppercase" }}>
                    Referenced Document
                  </span>
                </div>
                {commit.document ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, lineHeight: 1.4 }}>
                      {commit.document.title}
                    </div>
                    <div style={{ fontSize: 13, color: colors.secondary, marginTop: 6 }}>
                      {commit.document.summary}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: colors.secondary, fontStyle: "italic" }}>
                    No documents referenced.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
