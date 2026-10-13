import { Module } from "@nitrostack/core";

import { DashboardTools } from "./dashboard.tools.js";
import { DashboardResources } from "./dashboard.resources.js";
import { DashboardPrompts } from "./dashboard.prompts.js";

@Module({
  name: "dashboard",
  description: "Enterprise AI Security Operations Center Dashboard",
  controllers: [
    DashboardTools,
    DashboardResources,
    DashboardPrompts,
  ],
})
export class DashboardModule {}