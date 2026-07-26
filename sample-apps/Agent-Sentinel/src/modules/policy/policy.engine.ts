import {
  PolicyRequest,
  PolicyEvaluation,
  PolicyViolation,
  PolicyDecision,
  PolicySeverity,
} from "./policy.types.js";

import {
  policyRules,
  blockedKeywords,
  restrictedTools,
  privilegedDepartments,
  policyRecommendations,
} from "./policy.data.js";

export class PolicyEngine {

  //--------------------------------------------------
  // Evaluate Policy
  //--------------------------------------------------

  static evaluate(
    request: PolicyRequest
  ): PolicyEvaluation {

    const violations: PolicyViolation[] = [];

    let score = 0;

    //--------------------------------------------------
    // Unknown Agent
    //--------------------------------------------------

    if (
      request.department.trim().toUpperCase() === "UNKNOWN"
    ) {

      const rule = policyRules.find(
        p => p.id === "ID-001"
      );

      if (rule) {

        score += 25;

        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: "Unknown enterprise agent detected."
        });

      }

    }

    //--------------------------------------------------
    // Prompt Inspection
    //--------------------------------------------------

    const prompt =
      request.prompt.toLowerCase();

    for (const keyword of blockedKeywords) {

      if (
        prompt.includes(keyword.toLowerCase())
      ) {

        const rule = policyRules.find(
          p => p.type === "PROMPT"
        );

        score += 20;

        violations.push({

          ruleId: rule?.id ?? "PROMPT",

          ruleName:
            rule?.name ??
            "Prompt Policy",

          severity:
            rule?.severity ??
            "HIGH",

          message:
            `Blocked keyword detected: ${keyword}`

        });

      }

    }

    //--------------------------------------------------
    // Restricted Tools
    //--------------------------------------------------

    for (const tool of request.tools) {

      if (
        restrictedTools.includes(tool)
      ) {

        const rule = policyRules.find(
          p => p.type === "TOOL"
        );

        score += 20;

        violations.push({

          ruleId: rule?.id ?? "TOOL",

          ruleName:
            rule?.name ??
            "Tool Policy",

          severity:
            rule?.severity ??
            "HIGH",

          message:
            `Restricted MCP tool: ${tool}`

        });

      }

    }

    //--------------------------------------------------
    // Privileged Departments
    //--------------------------------------------------

    if (
      privilegedDepartments.includes(
        request.department
      ) &&
      request.tools.length > 8
    ) {

      score += 15;

      violations.push({

        ruleId: "DP-001",

        ruleName:
          "Department Usage",

        severity: "MEDIUM",

        message:
          "Privileged department requesting excessive tools."

      });

    }

    //--------------------------------------------------
    // Permissions
    //--------------------------------------------------

    if (
      request.permissions.length > 10
    ) {

      score += 15;

      violations.push({

        ruleId: "TL-002",

        ruleName:
          "Permission Abuse",

        severity: "MEDIUM",

        message:
          "Too many permissions requested."

      });

    }

    //--------------------------------------------------

    score = Math.min(score, 100);

    const decision =
      this.getDecision(score);

    return {

      agentId:
        request.agentId,

      agentName:
        request.agentName,

      timestamp:
        new Date().toISOString(),

      decision,

      score,

      violations,

      recommendations:
        policyRecommendations[
          decision
        ]

    };

  }

  //--------------------------------------------------

  static getPolicies() {

    return policyRules;

  }

  //--------------------------------------------------

  static getPolicy(
    id: string
  ) {

    return policyRules.find(
      p => p.id === id
    );

  }

  //--------------------------------------------------

  static getPoliciesByType(
    type: string
  ) {

    return policyRules.filter(
      p => p.type === type
    );

  }

  //--------------------------------------------------

  static enablePolicy(
    id: string
  ) {

    const rule =
      this.getPolicy(id);

    if (rule)
      rule.enabled = true;

    return rule;

  }

  //--------------------------------------------------

  static disablePolicy(
    id: string
  ) {

    const rule =
      this.getPolicy(id);

    if (rule)
      rule.enabled = false;

    return rule;

  }

  //--------------------------------------------------

  private static getDecision(
    score: number
  ): PolicyDecision {

    if (score >= 80)
      return "QUARANTINE";

    if (score >= 60)
      return "BLOCK";

    if (score >= 30)
      return "WARN";

    return "ALLOW";

  }

  //--------------------------------------------------

  static calculateSeverity(
    score: number
  ): PolicySeverity {

    if (score >= 80)
      return "CRITICAL";

    if (score >= 60)
      return "HIGH";

    if (score >= 30)
      return "MEDIUM";

    return "LOW";

  }

}