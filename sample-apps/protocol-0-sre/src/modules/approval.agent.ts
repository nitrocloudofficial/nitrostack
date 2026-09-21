import { Injectable } from "@nitrostack/core";
import { AgentState } from "./protocol-zero.types.js";
import { ProtocolZeroService } from "./protocol-zero.service.js";

@Injectable()
export class ApprovalAgent {
  constructor(private readonly service: ProtocolZeroService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    state.incident.status = "pending_approval";

    this.service.logAgentAction(
      "Incident Commander Agent",
      `Approval required for high-impact actions on ${state.incident.incidentId}`,
      "Pausing execution pipeline...",
    );

    await this.service.sendSimulatedSlackNotification(state.incident);
    this.service.sendSimulatedGmailNotification(state.incident);

    return {};
  }
}
