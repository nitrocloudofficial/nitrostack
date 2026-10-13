import { Module } from "@nitrostack/core";

import { StudentsModule } from "../students/students.module.js";

import { MatchingService } from "./matching.service.js";
import { MatchingTools } from "./matching.tools.js";
import { MatchingResources } from "./matching.resources.js";
import { MatchingPrompts } from "./matching.prompts.js";

@Module({
  name: "matching",
  imports: [
    StudentsModule,
  ],
  providers: [
    MatchingService,
  ],
  controllers: [
    MatchingTools,
    MatchingResources,
    MatchingPrompts,
  ],
})
export class MatchingModule {}