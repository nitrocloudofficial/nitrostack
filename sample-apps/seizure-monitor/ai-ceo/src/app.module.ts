import { McpApp, Module } from "@nitrostack/core";

import { GitIntelligenceTool } from "./tools/git_intelligence.tool.js";
import { MeetingIntelligenceTool } from "./tools/meeting_intelligence.tool.js";
import { FusionEngineTool } from "./tools/fusion_engine.tool.js";

import { TeamIntelligenceTool } from "./tools/team_intelligence.tool.js";
import { AiCeoPrompt } from "./tools/ai_ceo.prompt.js";

@Module({
  name: "ai_ceo_module",
  controllers: [
    GitIntelligenceTool,
    MeetingIntelligenceTool,
    FusionEngineTool,
    TeamIntelligenceTool,
    AiCeoPrompt
  ],
})
export class AiCeoModule {}

@McpApp({
  module: AiCeoModule,
  server: {
    name: "ai-ceo",
    version: "1.0.0",
  },
})
export class AppModule {}