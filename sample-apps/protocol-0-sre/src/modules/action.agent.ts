import { Injectable } from "@nitrostack/core";
import { AgentState } from "./protocol-zero.types.js";
import { ProtocolZeroService } from "./protocol-zero.service.js";

import { createHmac } from "crypto";

@Injectable()
export class ActionAgent {
  constructor(private readonly service: ProtocolZeroService) {}

  async execute(state: AgentState): Promise<Partial<AgentState>> {
    state.incident.status = "mitigating";
    this.service.logAgentAction(
      "Action Agent",
      `Initiating Zero-Trust Gate check for ${state.incident.incidentId}`,
      "Verifying execution payload integrity...",
    );

    // -------------------------------------------------------------------------
    // Zero-Trust Execution Gate (HMAC Integrity Check)
    // -------------------------------------------------------------------------
    const secret = process.env.ZERO_TRUST_SECRET;
    if (!secret) {
      throw new Error(
        "Zero-Trust Gate Check Failed: Server missing ZERO_TRUST_SECRET configuration.",
      );
    }

    const payload = JSON.stringify(state.incident.recommendations);
    const expectedHash = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // The zeroTrustToken would be injected into the state by the calling tool/client
    const providedHash = (state as any).zeroTrustToken;

    if (!providedHash || providedHash !== expectedHash) {
      this.service.logAgentAction(
        "Action Agent",
        `ZERO-TRUST VIOLATION`,
        `Execution blocked: HMAC mismatch for incident ${state.incident.incidentId}`,
      );
      throw new Error(
        "Zero-Trust Gate Check Failed: Payload Tampering Detected or Token Missing",
      );
    }

    this.service.logAgentAction(
      "Action Agent",
      `Zero-Trust Gate Passed`,
      `Executing auto-approved recommendations for ${state.incident.incidentId}`,
    );

    for (const rec of state.incident.recommendations) {
      rec.status = "executed";
      this.service.logAgentAction(
        "Action Agent",
        `Executed "${rec.title}" via ${rec.mcpServer}`,
        rec.description,
        400,
      );
    }

    state.incident.status = "resolved";
    return {};
  }
}
