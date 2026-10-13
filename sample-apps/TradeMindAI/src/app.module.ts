import { Module, McpApp } from "@nitrostack/core";
import { PortfolioTools } from "./modules/portfolio.tools.js";
import { MarketDataTools } from "./modules/market-data.tools.js";
import { RiskEngineTools } from "./modules/risk-engine.tools.js";
import { TradeRecordsTools } from "./modules/trade-records.tools.js";
import { ComplianceDbTools } from "./modules/compliance-db.tools.js";
import { SlackTools } from "./modules/slack.tools.js";

/**
 * Registering a class here auto-extracts every @Tool-decorated method on it
 * (see @nitrostack/core's server.module()) — so all 18 tools across the 6
 * domains are registered as real MCP tools, not just the handful wired up
 * as convenience REST routes in index.ts.
 */
@Module({
  name: "UnifiedTradeMindModule",
  description: "TradeMind AI — all 6 MCP domains (portfolio, market-data, risk-engine, trade-records, compliance-db, slack) in one server",
  controllers: [
    PortfolioTools,
    MarketDataTools,
    RiskEngineTools,
    TradeRecordsTools,
    ComplianceDbTools,
    SlackTools,
  ],
})
export class UnifiedAppModule {}

/**
 * Root application class — this is what McpApplicationFactory.create()
 * actually needs @McpApp on. It just points at UnifiedAppModule via
 * `module`; UnifiedAppModule itself stays @Module as-is.
 */
@McpApp({
  module: UnifiedAppModule,
  server: {
    name: "trademind-unified-mcp",
    version: "0.1.0",
  },
})
export class AppRoot {}
