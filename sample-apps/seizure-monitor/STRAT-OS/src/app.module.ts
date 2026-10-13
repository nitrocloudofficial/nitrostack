<<<<<<< Updated upstream
import {
  McpApp,
  Module,
  ConfigModule
} from "@nitrostack/core";

import { StrategyModule } from "./modules/strategy/strategy.module.js";
import { SystemHealthCheck } from "./health/system.health.js";

@McpApp({
  module: AppModule,
  server: {
    name: "strat-os",
    version: "1.0.0"
  },
  logging: {
    level: "info"
  }
})
@Module({
  name: "app",
  description: "Root application module",
  imports: [
    ConfigModule.forRoot(),
    StrategyModule
  ],
  providers: [
    SystemHealthCheck
=======
import { Module } from "@nestjs/common";
import { StrategyModule } from "./modules/strategy/strategy.module";

@Module({
  imports: [
    StrategyModule
>>>>>>> Stashed changes
  ]
})
export class AppModule {}