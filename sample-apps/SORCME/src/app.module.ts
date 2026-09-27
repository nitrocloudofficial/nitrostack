import { McpApp, Module, ConfigModule } from "@nitrostack/core";
import { QuantExecutionTools } from "./tools/execution.tools.js";
import { CoinGeckoPrompts } from "./prompts/coingecko.prompt.js";
import { ExchangeResources } from "./resources/exchange.resource.js";
import { SmartOrderRouterService } from "./services/sor.service.js";
import { CoinGeckoService } from "./services/coingecko.service.js";
import { SystemHealthCheck } from "./health/system.health.js";

@McpApp({
  module: AppModule,
  server: {
    name: "quant-execution-server",
    version: "1.0.0",
  },
  logging: {
    level: "info",
  },
})
@Module({
  name: "app",
  description: "Quant Order Routing and Execution MCP Module",
  imports: [ConfigModule.forRoot()],
  controllers: [QuantExecutionTools, CoinGeckoPrompts, ExchangeResources],
  providers: [SmartOrderRouterService, CoinGeckoService, SystemHealthCheck],
})
export class AppModule {}
