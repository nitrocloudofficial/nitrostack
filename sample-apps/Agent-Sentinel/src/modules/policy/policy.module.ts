import { Module } from "@nitrostack/core";

import { PolicyTools } from "./policy.tools.js";
import { PolicyResources } from "./policy.resources.js";
import { PolicyPrompts } from "./policy.prompts.js";

@Module({
  name: "policy",
  description: "Enterprise Policy Decision Point (PDP) for AgentSentinel.",
  controllers: [
    PolicyTools,
    PolicyResources,
    PolicyPrompts,
  ],
})
export class PolicyModule {}