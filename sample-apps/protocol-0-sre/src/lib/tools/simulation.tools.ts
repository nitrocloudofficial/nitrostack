import {
  ToolDecorator as Tool,
  Widget,
  Injectable,
  ExecutionContext,
  z,
} from "@nitrostack/core";
import { ProtocolZeroService } from "../../modules/protocol-zero.service.js";

@Injectable({ deps: [ProtocolZeroService] })
export class SimulationTools {
  constructor(private readonly twin: ProtocolZeroService) {}

  @Tool({
    name: "triggerIncident",
    description:
      "Hackathon Simulator: Trigger one of the 10 supported incident scenarios to observe how the LangGraph multi-agent pipeline reasons and mitigates in real-time.",
    inputSchema: z.object({
      incidentType: z
        .enum([
          "cicd_failure",
          "merge_failure",
          "deployment_failure",
          "issue_spike",
          "infra_cpu_spike",
          "sprint_risk",
          "feature_incomplete",
          "deadline_near",
          "employee_leave",
          "ooo_meeting_overlap",
        ])
        .describe("The specific scenario to simulate."),
    }),
  })
  @Widget("trigger-incident")
  async triggerIncident(
    input: { incidentType: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info("Simulating scenario trigger", {
      type: input.incidentType,
    });
    await this.twin.triggerScenario(input.incidentType);
    return {
      success: true,
      message: `Scenario ${input.incidentType} triggered. Incident created with recommendations. Run getRecommendations to see results.`,
    };
  }

  @Tool({
    name: "simulate_disaster",
    description:
      "What-If Disaster Simulator: Simulate the catastrophic failure of a specific sub-system or cloud region to test auto-remediation and cascading impacts.",
    taskSupport: "optional",
    inputSchema: z.object({
      targetNode: z
        .string()
        .describe(
          "The sub-system or region to simulate failure for (e.g., 'eu-west-1', 'auth-service', 'k8s-cluster-1')",
        ),
    }),
  })
  @Widget("simulate-disaster")
  async simulate_disaster(
    input: { targetNode: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.warn(
      `Triggering What-If Disaster Simulation for ${input.targetNode}`,
    );
    await this.twin.simulateDisaster(input.targetNode);

    if (ctx.task) {
      ctx.task.updateProgress(`Identifying dependencies for ${input.targetNode}...`);
    }

    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (ctx.task) {
      ctx.task.throwIfCancelled();
      ctx.task.updateProgress(`Calculating blast radius...`);
    }

    // Actually parse state instead of hardcoded strings
    const health = this.twin.getCompanyHealth();
    
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (ctx.task) {
      ctx.task.throwIfCancelled();
      ctx.task.updateProgress(`Generating remediation plan...`);
    }

    return {
      simulationId: `SIM-${Date.now()}`,
      targetNode: input.targetNode,
      cascadingImpact: [
        `${input.targetNode} is offline.`,
        `Dependent services starting to queue.`,
        `Impacted ${health.openIncidents} open incidents across ${health.departments.length} departments.`,
      ],
      estimatedDowntime: "45 minutes",
      recommendedPreemptiveActions: [
        "Scale up secondary region capacity",
        "Enable failover DNS routing",
      ],
    };
  }
}
