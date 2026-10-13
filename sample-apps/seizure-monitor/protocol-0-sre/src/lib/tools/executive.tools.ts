import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
  Cache,
  RateLimit
} from "@nitrostack/core";
import { ProtocolZeroService } from "../../modules/protocol-zero.service.js";

@Injectable({ deps: [ProtocolZeroService] })
export class ExecutiveTools {
  constructor(private readonly twin: ProtocolZeroService) {}

  @Tool({
    name: "getCompanyHealth",
    description:
      "Get the live Protocol-0 dashboard: overall system health score, per-subsystem health, open incidents, and top recommendations.",
    inputSchema: z.object({}),
  })
  @Widget("system-health")
  @Cache({ ttl: 60 })
  async getCompanyHealth(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Executive Agent aggregating system health");
    return this.twin.getCompanyHealth();
  }

  @Tool({
    name: "executiveChat",
    description:
      'Executive Copilot: Ask natural-language operational questions like "Why is engineering health low?", "Summarize today\'s risks", etc.',
    inputSchema: z.object({
      question: z.string().describe("Operational question"),
    }),
  })
  @Widget("executive-chat")
  @RateLimit({ requests: 5, window: '1m' })
  async executiveChat(input: { question: string }, ctx: ExecutionContext) {
    ctx.logger.info("Executive Copilot query", { question: input.question });
    const response = await this.twin.answerExecutiveQuery(input.question);
    return response;
  }

  @Tool({
    name: "getAgentActivity",
    description:
      "Show the live multi-agent execution pipeline (Monitoring -> Infrastructure -> Incident Commander -> Action) and agent logs.",
    inputSchema: z.object({}),
  })
  @Widget("agent-activity")
  async getAgentActivity(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Rendering agent activity pipeline");
    return this.twin.getAgentActivity();
  }

  @Tool({
    name: "get_company_health",
    description: "Legacy alias for getCompanyHealth.",
    inputSchema: z.object({}),
  })
  @Widget("system-health")
  async get_company_health(input: Record<string, never>, ctx: ExecutionContext) {
    return this.getCompanyHealth(input, ctx);
  }

  @Tool({
    name: "get_agent_activity",
    description: "Legacy alias for getAgentActivity.",
    inputSchema: z.object({}),
  })
  @Widget("agent-activity")
  async get_agent_activity(input: Record<string, never>, ctx: ExecutionContext) {
    return this.getAgentActivity(input, ctx);
  }
}
