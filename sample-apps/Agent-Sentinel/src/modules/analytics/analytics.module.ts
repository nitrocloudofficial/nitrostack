import { Module } from "@nitrostack/core";

import { AnalyticsTools } from "./analytics.tool.js";
import { AnalyticsResources } from "./analytics.resource.js";
import { AnalyticsPrompts } from "./analytics.prompt.js";

@Module({
  name: "analytics",

  description:
    "Enterprise analytics engine for AgentSentinel.",

  controllers: [

    AnalyticsTools,

    AnalyticsResources,

    AnalyticsPrompts,

  ],
})
export class AnalyticsModule {}