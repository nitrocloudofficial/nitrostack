import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { PolicyEngine } from "./policy.engine.js";

@Injectable()
export class PolicyTools {

  //==================================================
  // Evaluate Policy
  //==================================================

  @Tool({
    name: "evaluate_policy",
    description: "Evaluate enterprise security policies for an AI agent request.",
    inputSchema: z.object({
      agentId: z.string().describe("Unique Agent ID"),
      agentName: z.string().describe("Agent Name"),
      department: z.string().describe("Department"),
      prompt: z.string().describe("Prompt to evaluate"),
      permissions: z.array(z.string()).describe("Requested permissions"),
      tools: z.array(z.string()).describe("Requested MCP tools"),
      resource: z.string().optional().describe("Requested resource"),
      time: z.string().optional().describe("Execution time"),
    }),
  })
  async evaluatePolicy(
    input: {
      agentId: string;
      agentName: string;
      department: string;
      prompt: string;
      permissions: string[];
      tools: string[];
      resource?: string;
      time?: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info(
      `Evaluating policies for agent ${input.agentId}`
    );

    return PolicyEngine.evaluate(input);
  }

  //==================================================
  // Get All Policies
  //==================================================

  @Tool({
    name: "get_policies",
    description: "Return all configured enterprise policies.",
    inputSchema: z.object({}),
  })
  async getPolicies(
    input: {},
    context: ExecutionContext
  ) {
    context.logger.info("Fetching all enterprise policies");

    return {
      success: true,
      count: PolicyEngine.getPolicies().length,
      policies: PolicyEngine.getPolicies(),
    };
  }

  //==================================================
  // Get Policy By ID
  //==================================================

  @Tool({
    name: "get_policy",
    description: "Return a specific policy by ID.",
    inputSchema: z.object({
      id: z.string().describe("Policy ID"),
    }),
  })
  async getPolicy(
    input: {
      id: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info(`Fetching policy ${input.id}`);

    const policy = PolicyEngine.getPolicy(input.id);

    if (!policy) {
      return {
        success: false,
        message: `Policy '${input.id}' not found.`,
      };
    }

    return {
      success: true,
      policy,
    };
  }

  //==================================================
  // Get Policies By Type
  //==================================================

  @Tool({
    name: "get_policies_by_type",
    description: "Return policies filtered by type.",
    inputSchema: z.object({
      type: z.enum([
        "IDENTITY",
        "PROMPT",
        "TOOL",
        "RESOURCE",
        "COMPLIANCE",
        "TIME",
        "DEPARTMENT",
      ]),
    }),
  })
  async getPoliciesByType(
    input: {
      type:
        | "IDENTITY"
        | "PROMPT"
        | "TOOL"
        | "RESOURCE"
        | "COMPLIANCE"
        | "TIME"
        | "DEPARTMENT";
    },
    context: ExecutionContext
  ) {
    context.logger.info(
      `Fetching ${input.type} policies`
    );

    const policies =
      PolicyEngine.getPoliciesByType(input.type);

    return {
      success: true,
      count: policies.length,
      policies,
    };
  }

  //==================================================
  // Enable Policy
  //==================================================

  @Tool({
    name: "enable_policy",
    description: "Enable an enterprise security policy.",
    inputSchema: z.object({
      id: z.string().describe("Policy ID"),
    }),
  })
  async enablePolicy(
    input: {
      id: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info(
      `Enabling policy ${input.id}`
    );

    const policy =
      PolicyEngine.enablePolicy(input.id);

    if (!policy) {
      return {
        success: false,
        message: "Policy not found.",
      };
    }

    return {
      success: true,
      message: "Policy enabled successfully.",
      policy,
    };
  }

  //==================================================
  // Disable Policy
  //==================================================

  @Tool({
    name: "disable_policy",
    description: "Disable an enterprise security policy.",
    inputSchema: z.object({
      id: z.string().describe("Policy ID"),
    }),
  })
  async disablePolicy(
    input: {
      id: string;
    },
    context: ExecutionContext
  ) {
    context.logger.info(
      `Disabling policy ${input.id}`
    );

    const policy =
      PolicyEngine.disablePolicy(input.id);

    if (!policy) {
      return {
        success: false,
        message: "Policy not found.",
      };
    }

    return {
      success: true,
      message: "Policy disabled successfully.",
      policy,
    };
  }
}