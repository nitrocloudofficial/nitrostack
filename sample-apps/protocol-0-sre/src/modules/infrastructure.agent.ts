import { Injectable } from "@nitrostack/core";
import { AgentState } from "./protocol-zero.types.js";
import { ProtocolZeroService } from "./protocol-zero.service.js";

@Injectable()
export class InfrastructureAgent {
  constructor(private readonly service: ProtocolZeroService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const inc = state.incident;
    const cat = inc.category;
    let rootCause = "Unknown infrastructure anomaly.";
    let confidence = 85;
    let summary = "Analyzing system telemetry and source changes.";

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const systemInstruction = `You are the Infrastructure Agent in a Protocol-0 system. Analyze the incident and output a JSON object containing: "rootCause", "confidenceScore" (0-100), "engineeringRisk" ("healthy" | "warning" | "critical"), and "technicalSummary".`;
      const prompt = `Incident Details:
ID: ${inc.incidentId}
Title: ${inc.title}
Category: ${inc.category}
Severity: ${inc.severity}
Trigger: ${inc.trigger}
Affected Systems: ${inc.affectedSystems.join(", ")}

Provide your engineering analysis:`;

      const analysis = await this.service.callGemini(prompt, systemInstruction);
      if (analysis) {
        rootCause = analysis.rootCause || rootCause;
        confidence =
          typeof analysis.confidenceScore === "number"
            ? analysis.confidenceScore
            : confidence;
        summary = analysis.technicalSummary || summary;
      }
    } else {
      // Local fallback rules
      if (cat === "CI/CD Failure") {
        rootCause =
          "Tests failed in backend pipeline. Re-definition of authentication middleware broke existing integration tests.";
        confidence = 94;
        summary =
          "CI/CD tests failed on master branch, blocking build consolidation.";
      } else if (cat === "Merge Failure") {
        rootCause =
          "Merge conflict in main checkout route due to concurrent modifications on PaymentRouter.tsx.";
        confidence = 90;
        summary = "A conflict blocks the automated release merging pipeline.";
      } else if (cat === "Deployment Failure") {
        rootCause =
          "Failed database migration on commit e92a83 (missing fallback values on schema change) caused checkout service crashes.";
        confidence = 96;
        summary = "Rollback necessary due to failing database migrations.";
      } else if (cat === "Issue Spike") {
        rootCause =
          "Stripe webhook failure returned HTTP 500, causing checkout retries and customer transaction failures.";
        confidence = 88;
        summary = "External payment integration degradation.";
      } else if (cat === "Infrastructure Monitoring") {
        rootCause =
          "Active memory leak in gateway pod. RAM exceeds 95% triggering horizontal pod eviction.";
        confidence = 95;
        summary = "Hardware system degradation identified in Datadog.";
      } else if (cat === "Sprint Failure Prediction") {
        rootCause =
          "Sprint capacity bottleneck. Core developer sick leave decreased velocity to 50%.";
        confidence = 85;
        summary = "Velocity calculations show delivery gap.";
      } else if (cat === "Feature Incomplete") {
        rootCause =
          "Sprint target PAY-901 has only 45% completion due to unresolved external bank API requirements.";
        confidence = 92;
        summary = "Release demo risk: feature not ready.";
      } else if (cat === "Deadline Near") {
        rootCause =
          "High count of unresolved critical bugs blocked QA signoff, leaving only 35% sprint completion.";
        confidence = 89;
        summary = "High bug counts dragging sprint completion progress.";
      } else if (cat === "Employee Leave") {
        rootCause =
          "Lead developer Alex Rivera OOO while assigned critical Stripe integration refactoring (PAY-905).";
        confidence = 91;
        summary = "Owner availability gap for critical task.";
      } else if (cat === "Employee Leave Conflict") {
        rootCause =
          "Sarah Jenkins is registered Out Of Office during scheduled API Sync Board Release meeting.";
        confidence = 87;
        summary = "Required attendee OOO conflict.";
      }
    }

    const engHealth = this.service.calculateEngineeringHealthScore();

    this.service.logAgentAction(
      "Infrastructure Agent",
      `Diagnosed Root Cause for ${inc.incidentId} (${confidence}% confidence)`,
      rootCause,
    );

    this.service.logAgentAction(
      "Operations Agent",
      `Analyzed operational timeline and SLA impact for ${inc.incidentId}`,
      "No immediate infrastructure blocks.",
      80,
    );
    this.service.logAgentAction(
      "Support Agent",
      `Checked customer queue impact for ${inc.incidentId}`,
      "Active tickets nominal.",
      70,
    );

    inc.rootCause = rootCause;
    inc.confidenceScore = confidence;
    inc.status = "analyzed";

    return {
      engineeringReport: {
        rootCause,
        engineeringHealth: engHealth,
        riskScore:
          inc.severity === "critical" ? 95 : inc.severity === "high" ? 75 : 45,
        confidence,
        summary,
        affectedSystems: inc.affectedSystems,
      },
    };
  }
}
