import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
} from "@nitrostack/core";
import { ProtocolZeroService } from "../../modules/protocol-zero.service.js";

@Injectable({ deps: [ProtocolZeroService] })
export class InfrastructureTools {
  constructor(private readonly twin: ProtocolZeroService) {}

  @Tool({
    name: "getEngineeringHealth",
    description:
      "Get the detailed engineering health report computed from weighted metrics (Deployment Success 25%, CI/CD Success 20%, Sprint Health 20%, Issue Rate 15%, Infrastructure 20%).",
    inputSchema: z.object({}),
  })
  @Widget("engineering-health")
  async getEngineeringHealth(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Engineering Agent calculating weighted health");
    const { engineeringHealthScore, breakdown } =
      this.twin.getEngineeringHealthMetrics();
    let status = "healthy";
    if (engineeringHealthScore < 65) status = "critical";
    else if (engineeringHealthScore < 85) status = "warning";

    return {
      engineeringHealthScore,
      status,
      breakdown,
      metricsWeights: {
        deploymentSuccess: "25%",
        cicdSuccess: "20%",
        sprintHealth: "20%",
        issueRate: "15%",
        infrastructureHealth: "20%",
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  @Tool({
    name: "getKubernetesState",
    description: "Fetches the current live state of the Kubernetes production clusters, identifying failing pods (CrashLoopBackOff, OOMKilled).",
    inputSchema: z.object({}),
  })
  @Widget("kubernetes-state")
  async getKubernetesState(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info("Infrastructure Agent analyzing Kubernetes cluster state...");
    const pods = await this.twin.getKubernetesState();
    return { pods };
  }
}
