import { Module } from "@nitrostack/core";

import { ReportingTools } from "./reporting.tools.js";
import { ReportingResources } from "./reporting.resources.js";
import { ReportingPrompts } from "./reporting.prompts.js";

@Module({
  name: "reporting",
  description: "Enterprise AI Security Reporting Module",
  controllers: [
    ReportingTools,
    ReportingResources,
    ReportingPrompts,
  ],
})
export class ReportingModule {}