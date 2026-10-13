import {
  ToolDecorator as Tool,
  Injectable,
  ExecutionContext,
  z
} from "@nitrostack/core";

import { agents } from "./agents.data.js";

@Injectable()
export class DiscoveryTools {

  @Tool({
    name: "discover_agents",

    description:
      "Discover enterprise AI agents connected to the organization.",

    inputSchema: z.object({

      department: z
        .string()
        .optional()
        .describe("Filter by department"),

      status: z
        .enum(["ACTIVE", "QUARANTINED"])
        .optional()
        .describe("Filter by status")

    }),

    examples: {
      request: {
        department: "Finance"
      },

      response: {
        success: true,
        totalAgents: 1
      }
    }

  })

  async discoverAgents(

    input: {

      department?: string;

      status?: "ACTIVE" | "QUARANTINED";

    },

    context: ExecutionContext

  ) {

    context.logger.info(
      "Running enterprise agent discovery",
      input
    );

    let results = [...agents];

    if (input.department) {

      results = results.filter(

        agent =>

          agent.department
            .toLowerCase()
            .includes(input.department!.toLowerCase())

      );

    }

    if (input.status) {

      results = results.filter(

        agent =>

          agent.status === input.status

      );

    }

    return {

      success: true,

      timestamp: new Date().toISOString(),

      totalAgents: results.length,

      activeAgents: results.filter(

        a => a.status === "ACTIVE"

      ).length,

      quarantinedAgents: results.filter(

        a => a.status === "QUARANTINED"

      ).length,

      averageRisk:

        results.length === 0

          ? 0

          : Math.round(

              results.reduce(

                (sum, a) => sum + a.risk,

                0

              ) / results.length

            ),

      agents: results

    };

  }

}