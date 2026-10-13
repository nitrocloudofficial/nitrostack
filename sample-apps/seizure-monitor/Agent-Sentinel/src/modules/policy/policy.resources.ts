import {
  ResourceDecorator as Resource,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import {
  policyRules,
  calculatePolicyStatistics,
  blockedKeywords,
  restrictedTools,
  privilegedDepartments,
} from "./policy.data.js";

@Injectable()
export class PolicyResources {

  //==================================================
  // Enterprise Policies
  //==================================================

  @Resource({
    uri: "policy://rules",
    name: "Enterprise Policy Rules",
    description: "Returns all enterprise policy rules.",
    mimeType: "application/json",
  })
  async getPolicies(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info(
      "Serving enterprise policy rules."
    );

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify({

            timestamp: new Date().toISOString(),

            totalPolicies: policyRules.length,

            statistics:
              calculatePolicyStatistics(),

            policies: policyRules,

          }, null, 2)

        }

      ]

    };

  }

  //==================================================
  // Policy Model
  //==================================================

  @Resource({
    uri: "policy://model",
    name: "Enterprise Policy Model",
    description: "Returns the enterprise policy evaluation model.",
    mimeType: "application/json",
  })
  async getPolicyModel(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info(
      "Serving policy model."
    );

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify({

            timestamp:
              new Date().toISOString(),

            blockedKeywords,

            restrictedTools,

            privilegedDepartments,

            policyTypes: [

              "IDENTITY",

              "PROMPT",

              "TOOL",

              "RESOURCE",

              "COMPLIANCE",

              "TIME",

              "DEPARTMENT"

            ]

          }, null, 2)

        }

      ]

    };

  }

  //==================================================
  // Policy Statistics
  //==================================================

  @Resource({
    uri: "policy://statistics",
    name: "Policy Statistics",
    description: "Returns policy statistics.",
    mimeType: "application/json",
  })
  async getStatistics(
    uri: string,
    context: ExecutionContext
  ) {

    context.logger.info(
      "Serving policy statistics."
    );

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify({

            timestamp:
              new Date().toISOString(),

            statistics:
              calculatePolicyStatistics(),

          }, null, 2)

        }

      ]

    };

  }

}