import { Module } from "@nitrostack/core";

import { DiscoveryTools } from "./discovery.tools.js";
import { DiscoveryResources } from "./discovery.resources.js";
import { DiscoveryPrompts } from "./discovery.prompts.js";

@Module({
  name: "discovery",
  description: "Enterprise AI Agent Discovery Module",
  controllers: [
    DiscoveryTools,
    DiscoveryResources,
    DiscoveryPrompts
  ]
})
export class DiscoveryModule {}