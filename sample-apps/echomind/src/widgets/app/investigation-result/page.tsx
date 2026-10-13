"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useTheme, useWidgetSDK, useMaxHeight } from "@nitrostack/widgets";

import Header from "./Header";
import Metrics from "./Metrics";
import Timeline from "./Timeline";
import Verdict from "./Verdict";

import CodeEvidenceView from "./CodeEvidenceView";
import CaseDashboardView from "./CaseDashboardView";
import EvidenceAddedView from "./EvidenceAddedView";

import { colors } from "./styles";
import { CaseStore } from "../../../services/case.store";
import { InvestigationClassifier } from "../../../services/engine/investigation.classifier";
import { InvestigationScenarioFactory } from "../../../services/engine/investigation.scenarios";

export const dynamic = 'force-dynamic';

export default function InvestigationResult() {
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Initialize data with default scenario so it is never null on mount
  const [data, setData] = useState<any>(() => {
    const defaultScenario = InvestigationScenarioFactory.createScenario(
      "Authentication",
      "Who changed the authentication policy that led to unauthorized access?",
      "AuthController.ts"
    );
    return {
      viewType: "case-investigation",
      caseId: "CASE-002",
      question: "Who changed the authentication policy that led to unauthorized access?",
      title: "Who changed the authentication policy that led to unauthorized access?",
      file: defaultScenario.file,
      project: defaultScenario.project,
      status: "Completed",
      priority: "Critical",
      progress: 100,
      createdAt: "2023-07-18T14:30:00Z",
      primaryAuthor: defaultScenario.primaryAuthor.name,
      confidence: defaultScenario.baseConfidence,
      sources: ["Git Commits", "Meetings", "Documents"],
      evidence: {
        commits: defaultScenario.commits.length,
        meetings: defaultScenario.meetings.length,
        documents: defaultScenario.documents.length
      },
      timeline: defaultScenario.commits.map((c, i) => ({
        id: `t-${i + 1}`,
        title: c.message,
        type: i % 2 === 0 ? "commit" : "meeting",
        description: `Analysis correlated commit ${c.id} by ${defaultScenario.primaryAuthor.name} on ${c.file} with architectural decisions in ${defaultScenario.project}.`,
        timestamp: c.date
      })),
      verdict: {
        rootCause: defaultScenario.rootCauseTemplate,
        recommendation: defaultScenario.recommendations.join(" "),
        confidence: defaultScenario.baseConfidence
      }
    };
  });

  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const toolData = getToolOutput<any>();

  // Extract viewType payload helper
const extractViewPayload = (raw: any): any => {
  if (!raw) return null;

  // NitroStack response
  if (raw.structuredContent) {
    return raw.structuredContent;
  }

  // Already parsed object
  if (raw.viewType) {
    return raw;
  }

  // Parse text content
  if (raw.content && Array.isArray(raw.content) && raw.content[0]?.text) {
    try {
      return JSON.parse(raw.content[0].text);
    } catch {}
  }

  // Parse string
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {}
  }

  return null;
};

  // Only sync toolData when toolData changes from NitroStack host!
useEffect(() => {
    console.log("RAW TOOL DATA:", JSON.stringify(toolData, null, 2));

    if (toolData) {
        const parsed = extractViewPayload(toolData);

        console.log("PARSED DATA:", parsed);

        if (parsed) {
            setData(parsed);

            if (parsed.question) {
                setQuestion(parsed.question);
            }
        } else {
            setData(toolData);

            if (toolData.question) {
                setQuestion(toolData.question);
            }
        }
    }
}, [toolData]);
useEffect(() => {
  runStageAnimation();
}, []);
  const stages = [
    "Creating Investigation",
    "Reading Git History",
    "Scanning Documents",
    "Matching Meetings",
    "Correlating Evidence",
    "Generating Verdict",
  ];

  const runStageAnimation = () => {
    setStep(0);
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setStep(currentStep);
      if (currentStep >= 6) {
        clearInterval(interval);
      }
    }, 500);
  };

  const isDark = theme === "dark";
  const bg = colors.background;
  const card = colors.surface;
  const text = colors.text;
  const secondary = colors.secondary;

 const executeTool = async (
  toolName: string,
  params: Record<string, any> = {}
) => {
  if (!isReady || typeof callTool !== "function") return;

  // Start animation for new investigation
  if (toolName === "collect_code_evidence") {
    runStageAnimation();
  }

  try {
    await callTool(toolName, params);
  } catch (err) {
    console.error("Tool execution failed:", err);
  }
};

  const handleCollectEvidence = async (targetFile?: string) => {
    const fileToScan = targetFile || data?.file || data?.project || "AuthController.ts";
    await executeTool("collect_code_evidence", { file: fileToScan });
  };

  const handleOpenDashboard = async () => {
    await executeTool("list_cases", {});
  };
console.log("executeTool called");
console.log("isReady:", isReady);
console.log("callTool:", callTool);
  if (!isReady || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: bg,
          color: text,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        Initializing EchoMind...
      </div>
    );
  }

  // Determine which view to render based on viewType
  const viewType = data.viewType ?? "case-investigation";

  const renderContent = () => {
    switch (viewType) {
      case "code-evidence":
        return <CodeEvidenceView data={data} onExecuteTool={executeTool} />;
      case "case-dashboard":
        return <CaseDashboardView data={data} onExecuteTool={executeTool} />;
      case "evidence-added":
        return <EvidenceAddedView data={data} onExecuteTool={executeTool} />;
      case "case-investigation":
      default:
        const completed = step >= stages.length;
        return (
          <>
            <Header
              question={question}
              caseId={data.caseId}
              author={data.primaryAuthor}
              project={data.project || "PaymentService"}
              isEditing={isEditing}
              onQuestionChange={setQuestion}
              onEditToggle={setIsEditing}
              onExecuteTool={executeTool}
            />

            {!completed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: "rgba(15,15,15,.75)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 24,
                  padding: 30,
                  boxShadow: "0 20px 50px rgba(0,0,0,.6)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <strong>
                    {stages[Math.min(step, stages.length - 1)]}
                  </strong>

                  <strong>
                    {Math.min(
                      Math.round((step / stages.length) * 100),
                      100
                    )}
                    %
                  </strong>
                </div>

                <div
                  style={{
                    height: 12,
                    background: "rgba(255,255,255,.05)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    animate={{
                      width: `${Math.min(
                        (step / stages.length) * 100,
                        100
                      )}%`,
                    }}
                    transition={{
                      duration: 0.45,
                    }}
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #3B82F6, #8B5CF6)",
                      boxShadow: "0 0 20px rgba(59,130,246,.5)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 28,
                  }}
                >
                  {stages.map((item, index) => (
                    <div
                      key={item}
                      style={{
                        flex: 1,
                        textAlign: "center",
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          margin: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: 700,
                          background:
                            index < step
                              ? "linear-gradient(135deg, #10B981, #059669)"
                              : "rgba(255,255,255,.05)",
                          boxShadow:
                            index < step
                              ? "0 0 20px rgba(16,185,129,.4)"
                              : "none",
                        }}
                      >
                        {index < step ? "✓" : index + 1}
                      </motion.div>

                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: secondary,
                        }}
                      >
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {completed && (
              <>
                <Metrics
                  evidence={data.evidence}
                  verdict={data.verdict}
                  card={card}
                  secondary={secondary}
                  onExecuteTool={executeTool}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "320px 1fr",
                    gap: 24,
                    marginTop: 30,
                    alignItems: "start",
                  }}
                >
                  {/* Sidebar */}

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      background: "rgba(15,15,15,.75)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 24,
                      padding: 24,
                      boxShadow: "0 20px 50px rgba(0,0,0,.6)",
                    }}
                  >
                    <h2
                      style={{
                        marginTop: 0,
                        marginBottom: 24,
                        fontSize: 20,
                        fontWeight: 700,
                      }}
                    >
                      Investigation Details
                    </h2>

                    <div
                      style={{ marginBottom: 24, cursor: "pointer" }}
                      onClick={() =>
    executeTool("collect_code_evidence", {
        file: data?.file,
        author: data?.primaryAuthor,
    })
}
                    >
                      <div
                        style={{
                          color: secondary,
                          fontSize: 12,
                          marginBottom: 8,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        PRIMARY AUTHOR
                      </div>

                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        {data.primaryAuthor}
                      </div>
                    </div>

                    <div
                      style={{ marginBottom: 24, cursor: "pointer" }}
                      onClick={() => handleCollectEvidence(data?.project || data?.file)}
                    >
                      <div
                        style={{
                          color: secondary,
                          fontSize: 12,
                          marginBottom: 8,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        PROJECT
                      </div>

                      <div style={{ fontSize: 15 }}>{data.project || "PaymentService"}</div>
                    </div>

                    <div
                      style={{ marginBottom: 24, cursor: "pointer" }}
                      onClick={() => handleCollectEvidence(data?.file)}
                    >
                      <div
                        style={{
                          color: secondary,
                          fontSize: 12,
                          marginBottom: 8,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        FILE
                      </div>

                      <div style={{ fontSize: 15 }}>{data.file || "PaymentService.ts"}</div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div
                        style={{
                          color: secondary,
                          fontSize: 12,
                          marginBottom: 8,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        STATUS
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        onClick={handleOpenDashboard}
                        style={{
                          display: "inline-block",
                          padding: "8px 16px",
                          borderRadius: 10,
                          background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                          color: "white",
                          fontWeight: 700,
                          fontSize: 13,
                          boxShadow: "0 4px 12px rgba(59,130,246,.3)",
                          cursor: "pointer",
                        }}
                      >
                        {data.status}
                      </motion.div>
                    </div>

                    <div>
                      <div
                        style={{
                          color: secondary,
                          fontSize: 12,
                          marginBottom: 12,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        EVIDENCE SOURCES
                      </div>

                      {[
                        "Git History",
                        "Meeting Notes",
                        "Project Documents",
                      ].map((item) => (
                        <motion.div
                          key={item}
                          whileHover={{ x: 4 }}
                          onClick={() => handleCollectEvidence(data?.file)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 12,
                            padding: "8px 0",
                            cursor: "pointer",
                          }}
                        >
                          <span>{item}</span>

                          <span
                            style={{
                              color: "#10B981",
                              fontWeight: 700,
                            }}
                          >
                            ✓
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <Timeline
                    timeline={data.timeline}
                    card={card}
                    secondary={secondary}
                    onExecuteTool={executeTool}
                  />
                </div>

                <Verdict
                  verdict={data.verdict}
                  card={card}
                  secondary={secondary}
                  isDark={isDark}
                />

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    marginTop: 36,
                    textAlign: "center",
                    color: secondary,
                    fontSize: 13,
                  }}
                >
                  Generated by <strong>EchoMind AI</strong> • Enterprise Engineering
                  Memory & Investigation Platform
                </motion.div>
              </>
            )}
          </>
        );
    }
  };

  return (
    <div
      style={{
        background: bg,
        backgroundImage: `
          radial-gradient(circle at 15% 0%, rgba(59,130,246,.15), transparent 30%),
          radial-gradient(circle at 85% 10%, rgba(139,92,246,.12), transparent 35%),
          radial-gradient(circle at 50% 100%, rgba(34,211,238,.08), transparent 40%)
        `,
        maxHeight: maxHeight ?? "100vh",
        overflowY: "auto",
        padding: 30,
        color: text,
        fontFamily: "Inter, sans-serif",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      {renderContent()}
    </div>
  );
}
