import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
} from "@nitrostack/core";
import { ProtocolZeroService } from "../../modules/protocol-zero.service.js";

@Injectable({ deps: [ProtocolZeroService] })
export class IncidentTools {
  constructor(private readonly twin: ProtocolZeroService) {}

  @Tool({
    name: "getIncidentReport",
    description:
      "Get the complete analysis for one incident: timeline, root cause, confidence, affected systems, business impact and recommendations. Renders the incident detail view.",
    inputSchema: z.object({
      incidentId: z.string().describe("Incident ID, e.g. INC-1001"),
    }),
  })
  @Widget("incident-detail")
  async getIncidentReport(
    input: { incidentId: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info("Fetching incident report", {
      incidentId: input.incidentId,
    });
    const inc = this.twin.getIncident(input.incidentId);
    if (!inc) {
      throw new Error(`Incident ${input.incidentId} not found`);
    }
    return inc;
  }

  @Tool({
    name: "getRecommendations",
    description:
      "Get prioritized AI recommendations (high/medium/low). Optionally scoped to one incident. Exposes Approve/Reject actions.",
    inputSchema: z.object({
      incidentId: z
        .string()
        .optional()
        .describe(
          "Optional incident ID to scope recommendations, e.g. INC-1001",
        ),
    }),
  })
  @Widget("recommendation")
  async getRecommendations(
    input: { incidentId?: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info("Fetching recommendations", {
      incidentId: input.incidentId,
    });
    return { recommendations: this.twin.getRecommendations(input.incidentId) };
  }

  @Tool({
    name: "list_incidents",
    description: "List active incidents.",
    inputSchema: z.object({}),
  })
  @Widget("list-incidents")
  async list_incidents(_input: Record<string, never>, ctx: ExecutionContext) {
    return { incidents: this.twin.listIncidents() };
  }

  @Tool({
    name: "get_incident",
    description: "Legacy alias for getIncidentReport.",
    inputSchema: z.object({ incidentId: z.string() }),
  })
  @Widget("incident-detail")
  async get_incident(input: { incidentId: string }, ctx: ExecutionContext) {
    return this.getIncidentReport(input, ctx);
  }

  @Tool({
    name: "getPagerDutyIncidents",
    description: "Fetches the active on-call PagerDuty incidents and alerts across all engineering escalation policies.",
    inputSchema: z.object({}),
  })
  @Widget("pagerduty-incidents")
  async getPagerDutyIncidents(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Incident Commander checking PagerDuty escalation policies...");
    const incidents = await this.twin.getPagerDutyIncidents();
    return { incidents };
  }
}
