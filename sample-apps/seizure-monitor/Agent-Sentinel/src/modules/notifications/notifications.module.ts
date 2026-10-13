import { Module } from "@nitrostack/core";

import { NotificationsEngine } from "./notifications.engine.js";
import { NotificationsTools } from "./notifications.tool.js";
import { NotificationsResources } from "./notifications.resources.js";
import { NotificationsPrompts } from "./notifications.prompts.js";

@Module({
  name: "notifications",
  description: "Enterprise notification centre for AgentSentinel.",
  controllers: [
    NotificationsTools,
    NotificationsResources,
    NotificationsPrompts,
  ],
  providers: [
    NotificationsEngine,
  ],
})
export class NotificationsModule {}