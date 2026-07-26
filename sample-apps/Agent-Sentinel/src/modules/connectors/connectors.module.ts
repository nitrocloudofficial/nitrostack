import { Module } from "@nitrostack/core";
import { ConnectorsTools } from "./connectors.tools.js";
import { ConnectorsResources } from "./connectors.resources.js";
import { ConnectorsPrompts } from "./connectors.prompts.js";

@Module({
  name: "connectors",
  description: "Enterprise connector integrations for AgentSentinel.",
  controllers: [
    ConnectorsTools,
    ConnectorsResources,
    ConnectorsPrompts,
  ],
})
export class ConnectorsModule {}