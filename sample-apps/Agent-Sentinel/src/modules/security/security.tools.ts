import {
  ToolDecorator as Tool,
  z,
  ExecutionContext,
  Injectable,
} from "@nitrostack/core";

import { RiskEngine } from "./risk.engine.js";
import { promptInjectionPatterns, sensitiveKeywords } from "./risk.data.js";
import { PromptScanResult, RiskAssessment } from "./security.types.js";

@Injectable()
export class SecurityTools {
  @Tool({
    name: "analyze_risk",
    description: "Analyse an AI agent and return an enterprise risk assessment.",
    inputSchema: z.object({
      agentId: z.string(),
      agentName: z.string(),
      department: z.string(),
      prompt: z.string(),
      permissions: z.array(z.string()),
      tools: z.array(z.string()),
    }),
  })
  async analyzeRisk(
    input: {
      agentId: string;
      agentName: string;
      department: string;
      prompt: string;
      permissions: string[];
      tools: string[];
    },
    context: ExecutionContext
  ): Promise<RiskAssessment> {
    context.logger.info(`Analysing agent ${input.agentName}`);

    return RiskEngine.calculate(input);
  }

  @Tool({
    name: "scan_prompt",
    description: "Scan an AI prompt for security threats.",
    inputSchema: z.object({
      prompt: z.string(),
    }),
  })
  async scanPrompt(
    input: {
      prompt: string;
    },
    context: ExecutionContext
  ): Promise<PromptScanResult> {
    context.logger.info("Scanning prompt");

    const findings: string[] = [];
    let score = 0;
    const prompt = input.prompt.toLowerCase();

    for (const keyword of promptInjectionPatterns) {
      if (prompt.includes(keyword.toLowerCase())) {
        findings.push(`Prompt Injection: ${keyword}`);
        score += 30;
      }
    }

    for (const keyword of sensitiveKeywords) {
      if (prompt.includes(keyword.toLowerCase())) {
        findings.push(`Sensitive Data: ${keyword}`);
        score += 20;
      }
    }

    return {
      prompt: input.prompt,
      suspicious: score > 0,
      score,
      findings,
    };
  }

  @Tool({
    name: "quarantine_agent",
    description: "Quarantine an agent and preserve audit metadata.",
    inputSchema: z.object({
      agentId: z.string(),
      reason: z.string().optional(),
      requestedBy: z.string().optional(),
    }),
  })
  async quarantineAgent(
    input: {
      agentId: string;
      reason?: string;
      requestedBy?: string;
    },
    context: ExecutionContext
  ): Promise<{
    agentId: string;
    status: "QUARANTINED";
    message: string;
    reason?: string;
    requestedBy?: string;
    timestamp: string;
  }> {
    context.logger.warn(`Quarantining agent ${input.agentId}`);

    return {
      agentId: input.agentId,
      status: "QUARANTINED",
      message: input.reason
        ? `Agent quarantined due to: ${input.reason}`
        : "Agent quarantined for security review.",
      reason: input.reason,
      requestedBy: input.requestedBy,
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: "block_request",
    description: "Block an incoming request and log the audit event.",
    inputSchema: z.object({
      requestId: z.string(),
      requestor: z.string().optional(),
      reason: z.string().optional(),
    }),
  })
  async blockRequest(
    input: {
      requestId: string;
      requestor?: string;
      reason?: string;
    },
    context: ExecutionContext
  ): Promise<{
    requestId: string;
    status: "BLOCKED";
    message: string;
    requestor?: string;
    reason?: string;
    timestamp: string;
  }> {
    context.logger.warn(`Blocking request ${input.requestId}`);

    return {
      requestId: input.requestId,
      status: "BLOCKED",
      message: input.reason
        ? `Request blocked: ${input.reason}`
        : "Request blocked by security policy.",
      requestor: input.requestor,
      reason: input.reason,
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: "approve_request",
    description: "Approve a request after security validation.",
    inputSchema: z.object({
      requestId: z.string(),
      approvedBy: z.string().optional(),
      notes: z.string().optional(),
    }),
  })
  async approveRequest(
    input: {
      requestId: string;
      approvedBy?: string;
      notes?: string;
    },
    context: ExecutionContext
  ): Promise<{
    requestId: string;
    status: "APPROVED";
    message: string;
    approvedBy?: string;
    notes?: string;
    timestamp: string;
  }> {
    context.logger.info(`Approving request ${input.requestId}`);

    return {
      requestId: input.requestId,
      status: "APPROVED",
      message: input.notes
        ? `Request approved: ${input.notes}`
        : "Request approved by security policy.",
      approvedBy: input.approvedBy,
      notes: input.notes,
      timestamp: new Date().toISOString(),
    };
  }
}
