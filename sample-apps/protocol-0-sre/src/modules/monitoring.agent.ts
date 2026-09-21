import { Injectable } from "@nitrostack/core";
import { AgentState } from "./protocol-zero.types.js";
import { ProtocolZeroService } from "./protocol-zero.service.js";

@Injectable()
export class MonitoringAgent {
  constructor(private readonly service: ProtocolZeroService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    state.incident.status = "investigating";
    this.service.logAgentAction(
      "Monitoring Agent",
      `Incident ${state.incident.incidentId} forwarded to Infrastructure Agent`,
      "Transitioning state...",
    );
    return {};
  }
}
