import { Injectable } from "@nitrostack/core";
import { AgentState } from "./protocol-zero.types.js";
import { ProtocolZeroService } from "./protocol-zero.service.js";
import { Recommendation, HealthStatus } from "./protocol-zero.data.js";

@Injectable()
export class IncidentCommanderAgent {
  constructor(private readonly service: ProtocolZeroService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    const inc = state.incident;
    const report = state.engineeringReport;
    const cat = inc.category;

    let businessImpact = "Nominal operational risk.";
    let priority: "high" | "medium" | "low" = "low";
    let launchDelay: "unlikely" | "possible" | "likely" = "unlikely";
    let customerImpact: HealthStatus = "healthy";
    let revenueRisk: HealthStatus = "healthy";
    let recommendations: Recommendation[] = [];
    let approvalRequired = false;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const systemInstruction = `You are the Incident Commander Agent in a Protocol-0 system. Review the engineering report and generate a business impact report. Output a JSON object containing: "businessImpact" (string), "priority" ("high" | "medium" | "low"), "launchDelay" ("unlikely" | "possible" | "likely"), "customerImpact" ("healthy" | "warning" | "critical"), "revenueRisk" ("healthy" | "warning" | "critical"), and "recommendations" (array of objects with "title", "description", "priority" ("high"|"medium"|"low"), "mcpServer" ("GitHub"|"Jira"|"Datadog"|"Slack"|"Google Calendar")).`;
      const prompt = `Incident Details:
ID: ${inc.incidentId}
Title: ${inc.title}
Category: ${inc.category}

Engineering Root Cause Report:
${report?.rootCause}
Confidence: ${report?.confidence}%
Engineering Risk: ${report?.riskScore}

Provide your executive report:`;

      const analysis = await this.service.callGemini(prompt, systemInstruction);
      if (analysis) {
        businessImpact = analysis.businessImpact || businessImpact;
        priority = analysis.priority || priority;
        launchDelay = analysis.launchDelay || launchDelay;
        customerImpact = analysis.customerImpact || customerImpact;
        revenueRisk = analysis.revenueRisk || revenueRisk;

        if (Array.isArray(analysis.recommendations)) {
          recommendations = analysis.recommendations.map(
            (r: any, idx: number) => ({
              recommendationId: `REC-${Date.now()}-${idx}`,
              incidentId: inc.incidentId,
              priority: r.priority || "medium",
              title: r.title || "Action",
              description: r.description || "",
              mcpServer: r.mcpServer || "Jira",
              status: "pending",
              confidence: report?.confidence,
              evidence: report?.rootCause,
              businessImpact,
            }),
          );

          approvalRequired = recommendations.some((r) =>
            [
              "Cancel Meeting",
              "Reschedule Meeting",
              "Replacement",
              "Rollback",
              "Escalation",
              "postpone",
            ].some(
              (keyword) =>
                r.title.toLowerCase().includes(keyword.toLowerCase()) ||
                r.description.toLowerCase().includes(keyword.toLowerCase()),
            ),
          );
        }
      }
    } else {
      // Local fallback rules
      if (cat === "CI/CD Failure") {
        businessImpact =
          "Blocker on the current release cycle. High priority as it stops critical bugfixes from deploying.";
        priority = "high";
        launchDelay = "possible";
        customerImpact = "warning";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Revert broken commit",
            description:
              "Revert the broken auth middleware commit (a83d91) on master branch to fix the build pipeline.",
            mcpServer: "GitHub",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Merge Failure") {
        businessImpact =
          "Delays PR merge cycle. Stalls developers from pushing updates.";
        priority = "medium";
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "medium",
            title: "Assign developer to resolve conflict",
            description:
              "Assign Sarah Jenkins in Jira to merge master branch and resolve PaymentRouter conflicts.",
            mcpServer: "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Deployment Failure") {
        businessImpact =
          "Production payments degraded. Real-time transactions failing. Immediate recovery required.";
        priority = "high";
        launchDelay = "likely";
        customerImpact = "critical";
        revenueRisk = "critical";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Rollback Recommendation",
            description:
              "Rollback production deployment to last known stable commit (b45c21).",
            mcpServer: "GitHub",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
          {
            recommendationId: `REC-${Date.now()}-2`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Notify leadership of launch risk",
            description:
              "Send warning email to Marcus Chen (PM) about checkout page downtime.",
            mcpServer: "Gmail",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Issue Spike") {
        businessImpact =
          "Payments are failing. Checkout rates dropped by 40%. Customer complaints rising.";
        priority = "high";
        customerImpact = "critical";
        revenueRisk = "warning";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Escalation Recommendation",
            description:
              "Escalate ticket to Stripe Support API desk and notify dev team via Slack.",
            mcpServer: "Slack",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Infrastructure Monitoring") {
        businessImpact =
          "Gateway container restart loop causing temporary connection drops.";
        priority = "high";
        customerImpact = "warning";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Scale replicas and restart pods",
            description:
              "Increase Gateway deployment replicas and trigger pod rollouts.",
            mcpServer: "Datadog",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Sprint Failure Prediction") {
        businessImpact =
          "Feature release deadline at risk. Velocity drops threaten the sprint scope.";
        priority = "medium";
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "medium",
            title: "Review Sprint capacity",
            description:
              "Rescope 10 story points of low-priority items out of the current sprint.",
            mcpServer: "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Feature Incomplete") {
        businessImpact =
          "Release meeting will fail to demo core multi-sig features if kept tomorrow.";
        priority = "high";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Reschedule Meeting",
            description:
              "Reschedule Q3 Enterprise Demo Review calendar event to 3 days later.",
            mcpServer: "Google Calendar",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Deadline Near") {
        businessImpact =
          "Sprint deliverables will miss deadline. Core checkout revamp delayed.";
        priority = "high";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Escalation Recommendation",
            description:
              "Escalate to VP of Product and assign secondary developer to clear blockers.",
            mcpServer: "Slack",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Employee Leave") {
        businessImpact =
          "Stripe integration refactoring blocked. Risk of missing sprint commitment.";
        priority = "high";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "high",
            title: "Notify about Replacement",
            description:
              "Reassign Stripe refactoring (PAY-905) to Sarah Jenkins in Jira and notify her in Slack.",
            mcpServer: "Jira",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      } else if (cat === "Employee Leave Conflict") {
        businessImpact =
          "Sarah Jenkins is registered OOO but scheduled for critical API Board Sync.";
        priority = "medium";
        approvalRequired = true;
        recommendations = [
          {
            recommendationId: `REC-${Date.now()}-1`,
            incidentId: inc.incidentId,
            priority: "medium",
            title: "Reschedule Meeting",
            description:
              "Reschedule API Version Sync Board meeting by moving it 2 days forward.",
            mcpServer: "Google Calendar",
            status: "pending",
            confidence: report?.confidence,
            evidence: report?.rootCause,
            businessImpact,
          },
        ];
      }
    }

    const projectedHealthScore = Math.max(
      50,
      (report?.engineeringHealth ?? 98) - (priority === "high" ? 15 : 5),
    );

    inc.businessImpact = {
      summary: businessImpact,
      engineeringRisk:
        priority === "high"
          ? "critical"
          : priority === "medium"
            ? "warning"
            : "healthy",
      launchDelay,
      customerImpact,
      revenueRisk,
      projectedHealthScore,
    };

    inc.recommendations = recommendations;

    const companyHealth = Math.round(
      this.service.calculateEngineeringHealthScore() * 0.4 +
        95 * 0.2 +
        96 * 0.15 +
        100 * 0.1 +
        98 * 0.1 +
        100 * 0.05,
    );

    this.service.logAgentAction(
      "Incident Commander Agent",
      `Calculated Business Impact for ${inc.incidentId} (Projected company health: ${projectedHealthScore}%)`,
      businessImpact,
    );

    return {
      executiveReport: {
        businessImpact,
        recommendations,
        priority,
        companyHealth,
        approvalRequired,
      },
    };
  }
}
