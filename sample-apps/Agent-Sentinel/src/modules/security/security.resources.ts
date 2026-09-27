import {
  ResourceDecorator as Resource,
  ExecutionContext
} from "@nitrostack/core";

import {
  securityPolicies,
  decisionThresholds,
  riskWeights,
  promptInjectionPatterns,
  sensitiveKeywords,
  suspiciousPermissions,
  highRiskTools
} from "./risk.data.js";

export class SecurityResources {

  @Resource({

    uri: "security://policies",

    name: "Enterprise Security Policies",

    description:
      "Returns all enterprise AI security policies configured inside AgentSentinel.",

    mimeType: "application/json",

    examples: {

      response: {

        totalPolicies: 5,

        policies: [

          {

            id: "POL-001",

            name: "Prompt Injection Protection",

            enabled: true

          }

        ]

      }

    }

  })

  async getSecurityPolicies(

    uri: string,

    context: ExecutionContext

  ) {

    context.logger.info(
      "Serving Enterprise Security Policies"
    );

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify({

            timestamp: new Date().toISOString(),

            totalPolicies: securityPolicies.length,

            policies: securityPolicies

          }, null, 2)

        }

      ]

    };

  }

  @Resource({

    uri: "security://risk-model",

    name: "Enterprise Risk Model",

    description:
      "Returns the enterprise AI risk scoring model used by AgentSentinel.",

    mimeType: "application/json"

  })

  async getRiskModel(

    uri: string,

    context: ExecutionContext

  ) {

    context.logger.info(
      "Serving Enterprise Risk Model"
    );

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify({

            timestamp: new Date().toISOString(),

            thresholds: decisionThresholds,

            weights: riskWeights,

            signatures: {

              promptInjection: promptInjectionPatterns,

              sensitiveKeywords,

              suspiciousPermissions,

              highRiskTools

            }

          }, null, 2)

        }

      ]

    };

  }

}