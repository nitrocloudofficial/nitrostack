import { Module } from "@nitrostack/core";
import { MonitoringTools } from "../lib/tools/monitoring.tools.js";
import { InfrastructureTools } from "../lib/tools/infrastructure.tools.js";
import { IncidentTools } from "../lib/tools/incident.tools.js";
import { ExecutiveTools } from "../lib/tools/executive.tools.js";
import { ActionTools } from "../lib/tools/action.tools.js";
import { SimulationTools } from "../lib/tools/simulation.tools.js";
import { ProtocolZeroService } from "./protocol-zero.service.js";
import { ProtocolZeroPrompts } from "../lib/prompts/protocol-zero.prompts.js";
import { ProtocolZeroResources } from "../lib/resources/protocol-zero.resources.js";
import { ZodValidationPipe } from "../lib/pipes/zod-validation.pipe.js";
import { ZeroTrustGuard } from "../lib/guards/zero-trust.guard.js";

@Module({
  name: "protocol-zero",
  description:
    "AI Workplace Digital Twin — multi-agent enterprise operations control center",
  controllers: [
    MonitoringTools,
    InfrastructureTools,
    IncidentTools,
    ExecutiveTools,
    ActionTools,
    SimulationTools,
    ProtocolZeroPrompts,
    ProtocolZeroResources,
  ],
  providers: [ProtocolZeroService, ZodValidationPipe, ZeroTrustGuard],
})
export class ProtocolZeroModule {}
