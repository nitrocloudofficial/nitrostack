import {
  RiskAssessment,
  RiskViolation,
  Decision,
  RiskSeverity,
} from "./security.types.js";

import {
  promptInjectionPatterns,
  sensitiveKeywords,
  suspiciousPermissions,
  highRiskTools,
  recommendations,
  decisionThresholds,
  riskWeights,
} from "./risk.data.js";

export interface RiskEngineInput {
  agentId: string;
  agentName: string;
  department: string;
  prompt: string;
  permissions: string[];
  tools: string[];
}

export class RiskEngine {

  static calculate(
    input: RiskEngineInput
  ): RiskAssessment {

    let score = 0;

    const violations: RiskViolation[] = [];

    const recommendationList: string[] = [];

    const prompt = input.prompt.toLowerCase();

    //------------------------------------------------
    // Prompt Injection
    //------------------------------------------------

    for (const pattern of promptInjectionPatterns) {

      if (prompt.includes(pattern.toLowerCase())) {

        score += riskWeights.promptInjection;

        violations.push({

          code: "PROMPT_INJECTION",

          title: "Prompt Injection",

          description: `Detected "${pattern}"`,

          score: riskWeights.promptInjection,

        });

        recommendationList.push(
          recommendations.promptInjection
        );

      }

    }

    //------------------------------------------------
    // Sensitive Data
    //------------------------------------------------

    for (const keyword of sensitiveKeywords) {

      if (prompt.includes(keyword.toLowerCase())) {

        score += riskWeights.sensitiveData;

        violations.push({

          code: "SENSITIVE_DATA",

          title: "Sensitive Data",

          description: `Requested "${keyword}"`,

          score: riskWeights.sensitiveData,

        });

        recommendationList.push(
          recommendations.sensitiveData
        );

      }

    }

    //------------------------------------------------
    // Permissions
    //------------------------------------------------

    for (const permission of input.permissions) {

      if (
        suspiciousPermissions.includes(permission)
      ) {

        score += riskWeights.suspiciousPermission;

        violations.push({

          code: "PERMISSION",

          title: "Suspicious Permission",

          description: permission,

          score: riskWeights.suspiciousPermission,

        });

        recommendationList.push(
          recommendations.suspiciousPermission
        );

      }

    }

    //------------------------------------------------
    // High Risk Tools
    //------------------------------------------------

    for (const tool of input.tools) {

      if (
        highRiskTools.includes(tool)
      ) {

        score += riskWeights.blockedTool;

        violations.push({

          code: "HIGH_RISK_TOOL",

          title: "Dangerous MCP Tool",

          description: tool,

          score: riskWeights.blockedTool,

        });

        recommendationList.push(
          recommendations.blockedTool
        );

      }

    }

    //------------------------------------------------
    // Excessive Tool Usage
    //------------------------------------------------

    if (input.tools.length > 10) {

      score += riskWeights.excessiveTools;

      violations.push({

        code: "TOOL_ABUSE",

        title: "Excessive Tool Usage",

        description:
          "Too many MCP tools requested.",

        score: riskWeights.excessiveTools,

      });

      recommendationList.push(
        recommendations.excessiveTools
      );

    }

    //------------------------------------------------
    // Unknown Agent
    //------------------------------------------------

    if (
      input.department.toLowerCase() ===
      "unknown"
    ) {

      score += riskWeights.unknownAgent;

      violations.push({

        code: "UNKNOWN_AGENT",

        title: "Unknown Agent",

        description:
          "Agent department not recognised.",

        score: riskWeights.unknownAgent,

      });

      recommendationList.push(
        recommendations.unknownAgent
      );

    }

    //------------------------------------------------

    score = Math.min(score, 100);

    return {

      agentId: input.agentId,

      agentName: input.agentName,

      timestamp: new Date().toISOString(),

      riskScore: score,

      severity:
        this.getSeverity(score),

      decision:
        this.getDecision(score),

      violations,

      recommendations:
        [...new Set(recommendationList)],

    };

  }

  //------------------------------------------------

  private static getSeverity(
    score: number
  ): RiskSeverity {

    if (score >= 90)
      return "CRITICAL";

    if (score >= 70)
      return "HIGH";

    if (score >= 40)
      return "MEDIUM";

    return "LOW";

  }

  //------------------------------------------------

  private static getDecision(
    score: number
  ): Decision {

    if (
      score >= decisionThresholds.quarantine
    )
      return "QUARANTINE";

    if (
      score >= decisionThresholds.block
    )
      return "BLOCK";

    if (
      score >= decisionThresholds.warn
    )
      return "WARN";

    return "ALLOW";

  }

}