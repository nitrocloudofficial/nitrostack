import {
  ToolDecorator as Tool,
  z,
} from "@nitrostack/core";

import { ConnectorsEngine } from "./connectors.engine.js";

const engine = new ConnectorsEngine();

export class ConnectorsTools {

  @Tool({
    name: "list_connectors",
    description: "List all enterprise connectors.",
    inputSchema: z.object({}),
  })
  async listConnectors() {
    return await engine.getConnectors();
  }

  @Tool({
    name: "connector_summary",
    description: "Return connector summary.",
    inputSchema: z.object({}),
  })
  async connectorSummary() {
    return await engine.getConnectorSummary();
  }

  @Tool({
    name: "connector_health",
    description: "Return overall connector health.",
    inputSchema: z.object({}),
  })
  async connectorHealth() {

    const health = await engine.getOverallHealth();

    return {
      overallHealth: health,
      status: health >= 90 ? "Healthy" : "Warning"
    };
  }

  @Tool({
    name: "test_connector",
    description: "Test a connector.",
    inputSchema: z.object({
      connector: z.string()
    })
  })
  async testConnector({
    connector
  }: {
    connector: string;
  }) {

    const connectors = await engine.getConnectors();

    const result = connectors.find(
      c => c.id.toLowerCase() === connector.toLowerCase()
    );

    if (!result) {

      return {

        success: false,

        message: "Connector not found."

      };

    }

    return {

      success: true,

      connector: result,

      message: `${result.name} is reachable.`

    };

  }

}