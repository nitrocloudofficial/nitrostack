import {
  ResourceDecorator as Resource,
  ExecutionContext
} from "@nitrostack/core";

import { agents } from "./agents.data.js";

export class DiscoveryResources {

  @Resource({

    uri: "agents://registry",

    name: "Enterprise Agent Registry",

    description:
      "Provides the registry of all enterprise AI agents managed by AgentSentinel.",

    mimeType: "application/json",

    examples: {

      response: {

        totalAgents: 4,

        activeAgents: 3,

        quarantinedAgents: 1,

        agents: [

          {

            id: 1,

            name: "FinanceBot",

            department: "Finance",

            status: "ACTIVE",

            risk: 18

          }

        ]

      }

    }

  })

  async getAgentRegistry(

    uri: string,

    context: ExecutionContext

  ) {

    context.logger.info(
      "Serving Enterprise Agent Registry"
    );

    const registry = {

      timestamp: new Date().toISOString(),

      totalAgents: agents.length,

      activeAgents:

        agents.filter(

          a => a.status === "ACTIVE"

        ).length,

      quarantinedAgents:

        agents.filter(

          a => a.status === "QUARANTINED"

        ).length,

      averageRisk:

        Math.round(

          agents.reduce(

            (sum, a) => sum + a.risk,

            0

          ) / agents.length

        ),

      agents

    };

    return {

      contents: [

        {

          uri,

          mimeType: "application/json",

          text: JSON.stringify(

            registry,

            null,

            2

          )

        }

      ]

    };

  }

}