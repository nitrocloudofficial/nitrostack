/**
 * PipelineProgress — the horizontal pipeline status bar
 * Shows Scout → Analyst → Skeptic with active/done state per step.
 */

"use client";

import type { AgentStage } from "../types";

interface PipelineProgressProps {
  stage: AgentStage;
  ticker: string;
}

const STEPS = [
  {
    key: "scout",
    icon: "🔭",
    name: "Scout Agent",
    stages: ["scout"],
  },
  {
    key: "analyst",
    icon: "📊",
    name: "Analyst Agent",
    stages: ["analyst"],
  },
  {
    key: "skeptic",
    icon: "⚖️",
    name: "Skeptic Agent",
    stages: ["skeptic"],
  },
];

function getStepStage(stepKey: string, currentStage: AgentStage): "idle" | "active" | "done" {
  const stageOrder = ["idle", "scout", "analyst", "skeptic", "done", "error"];
  const stepIdx = stageOrder.indexOf(stepKey);
  const currentIdx = stageOrder.indexOf(currentStage);

  if (currentStage === "error") return stepIdx <= currentIdx ? "done" : "idle";
  if (currentIdx > stepIdx) return "done";
  if (currentIdx === stepIdx) return "active";
  return "idle";
}

function stepStatusText(status: "idle" | "active" | "done", name: string): string {
  if (status === "active") return "Running...";
  if (status === "done") return "Complete ✓";
  return "Waiting";
}

export default function PipelineProgress({ stage, ticker }: PipelineProgressProps) {
  return (
    <div className="pipeline-progress" role="progressbar" aria-label="Agent pipeline status">
      {STEPS.map((step, i) => {
        const status = getStepStage(step.key, stage);
        return (
          <div
            key={step.key}
            className={`pipeline-step ${step.key} ${status === "active" ? "active" : status === "done" ? "done" : ""}`}
          >
            <div className="pipeline-step-icon">
              {status === "done" ? "✓" : step.icon}
            </div>
            <div className="pipeline-step-info">
              <div className="pipeline-step-name">{step.name}</div>
              <div className="pipeline-step-status">
                {stepStatusText(status, step.name)}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ marginLeft: "auto", paddingLeft: "16px" }}>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Ticker
        </div>
        <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
          {ticker}
        </div>
      </div>
    </div>
  );
}
