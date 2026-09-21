import {
  PromptDecorator as Prompt,
  Injectable,
} from "@nitrostack/core";

@Injectable()
export class AnalyticsPrompts {

  @Prompt({
    name: "analytics_summary_prompt",
    description: "Generate an enterprise analytics summary.",
  })
  async analyticsSummaryPrompt() {
    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Generate an enterprise analytics summary with security score, compliance score, trust score, risk score, active agents, active incidents, healthy connectors, and executive recommendations.",
        },
      },
    ];
  }

  @Prompt({
    name: "risk_analysis_prompt",
    description: "Generate an enterprise risk analysis.",
  })
  async riskAnalysisPrompt() {
    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Analyse the current enterprise risk posture. Include risk trends, high-risk agents, incident severity, business impact, and mitigation recommendations.",
        },
      },
    ];
  }

  @Prompt({
    name: "executive_dashboard_prompt",
    description: "Generate an executive dashboard report.",
  })
  async executiveDashboardPrompt() {
    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Create an executive dashboard summarising enterprise security, compliance, trust, risk, AI agent health, and connector status in a SOC-friendly format.",
        },
      },
    ];
  }
}