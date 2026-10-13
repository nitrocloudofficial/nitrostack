<<<<<<< Updated upstream
import { Module } from "@nitrostack/core";

import { StrategyTools } from "./strategy.tools.js";
import { StrategyPrompts } from "./strategy.prompts.js";

@Module({
  name: "strategy",
  description: "Enterprise Strategy AI Agent",
  controllers: [
    StrategyTools,
    StrategyPrompts
=======
import { Module } from "@nestjs/common";

import { StrategyService } from "./strategy.service";
import { StrategyTools } from "./strategy.tools";

@Module({
  providers: [
    StrategyService,
    StrategyTools
>>>>>>> Stashed changes
  ]
})
export class StrategyModule {}