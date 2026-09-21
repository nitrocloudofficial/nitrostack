import { Module } from "@nitrostack/core";

import { SecurityTools } from "./security.tools.js";
import { SecurityResources } from "./security.resources.js";
import { SecurityPrompts } from "./security.prompts.js";

@Module({
  name: "security",

  description:
    "Enterprise AI Security Operations Module for AgentSentinel.",

  controllers: [
    SecurityTools,
    SecurityResources,
    SecurityPrompts
  ]
})
export class SecurityModule {}