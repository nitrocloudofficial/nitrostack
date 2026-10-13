import { Module } from "@nitrostack/core";
import { InvestigationTools } from "./investigation.tools.js";
import { InvestigationResources } from "./investigation.resources.js";
import { InvestigationPrompts } from "./investigation.prompts.js";
import { InvestigationTraceInterceptor } from "./investigation.interceptor.js";

@Module({
  name: "investigation",
  description: "Auditable investigation trace: note_decision, cti:// resources, investigate_threat prompt.",
  controllers: [InvestigationTools, InvestigationResources, InvestigationPrompts],
  providers: [InvestigationTraceInterceptor],
})
export class InvestigationModule {}
