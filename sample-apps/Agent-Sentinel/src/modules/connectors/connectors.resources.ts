import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

import { ConnectorsEngine } from "./connectors.engine.js";

const engine = new ConnectorsEngine();

/**
 * Enterprise Connectors Resources
 */
export class ConnectorsResources {

  @Resource({
    uri: "connectors://summary",
    name: "Connector Summary",
    description: "Returns enterprise connector summary.",
    mimeType: "application/json",
  })
  async connectorSummary(context: ExecutionContext) {

    const summary = await engine.getConnectorSummary();

    return {
      type: "text" as const,
      text: JSON.stringify(summary, null, 2),
    };

  }

  @Resource({
    uri: "connectors://list",
    name: "Connector List",
    description: "Returns all configured enterprise connectors.",
    mimeType: "application/json",
  })
  async connectorList(context: ExecutionContext) {

    const connectors = await engine.getConnectors();

    return {
      type: "text" as const,
      text: JSON.stringify(connectors, null, 2),
    };

  }

  @Resource({
    uri: "connectors://health",
    name: "Connector Health",
    description: "Returns overall connector health.",
    mimeType: "application/json",
  })
  async connectorHealth(context: ExecutionContext) {

    const health = await engine.getOverallHealth();

    return {
      type: "text" as const,
      text: JSON.stringify(
        {
          overallHealth: health,
        },
        null,
        2
      ),
    };

  }

}