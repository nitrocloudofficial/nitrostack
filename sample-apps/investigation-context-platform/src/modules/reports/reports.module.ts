import { Module } from "@nitrostack/core";

import { ReportsTools } from "./reports.tools.js";
import { ReportsResources } from "./reports.resources.js";
import { ReportsPrompts } from "./reports.prompts.js";

@Module({
  name: "reports",
  description: "Investigation Reports Module",
  controllers: [
    ReportsTools,
    ReportsResources,
    ReportsPrompts,
  ],
})
export class ReportsModule {}