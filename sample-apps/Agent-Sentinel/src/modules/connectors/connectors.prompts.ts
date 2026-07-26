import {
  PromptDecorator as Prompt,
  ExecutionContext,
} from "@nitrostack/core";

import { ConnectorsEngine } from "./connectors.engine.js";

const engine = new ConnectorsEngine();

/**
 * Enterprise Connectors Prompts
 */
export class ConnectorsPrompts {

  @Prompt({
    name: "connector-summary",
    description: "Generate an enterprise connector summary.",
  })
  async connectorSummaryPrompt(
    args: Record<string, unknown>,
    context: ExecutionContext
  ) {

    const summary = await engine.getConnectorSummary();

    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `
Analyse the following enterprise connector information.

${JSON.stringify(summary, null, 2)}

Generate:

• Connected services
• Connector health
• Security concerns
• Missing integrations
• Executive summary
`,
        },
      },
    ];

  }

  @Prompt({
    name: "connector-health",
    description: "Generate a connector health assessment.",
  })
  async connectorHealthPrompt(
    args: Record<string, unknown>,
    context: ExecutionContext
  ) {

    const connectors = await engine.getConnectors();

    return [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `
Review the following connector status.

${JSON.stringify(connectors, null, 2)}

Provide:

• Overall Health Score
• Weak connectors
• Recommended improvements
• Security observations
`,
        },
      },
    ];

  }

}