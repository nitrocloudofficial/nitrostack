import { McpApp, Module, ConfigModule } from "@nitrostack/core";

import { ThingsBoardModule } from "./modules/thingsboard/thingsboard.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { RuleChainModule } from "./modules/rule-chain/rule-chain.module.js";
import { DigitalTwinModule } from "./modules/digital-twin/digital-twin.module.js";
import { SyncModule } from "./modules/sync/sync.module.js";
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { VisualizationModule } from "./visualization/visualization.module.js";
import { SimulationModule } from "./modules/simulation/simulation.module.js";
import { SystemHealthCheck } from "./health/system.health.js";

@Module({
    name: "app",
    description: "DTaaS MCP Server",

    imports: [
        ConfigModule.forRoot(),
        ThingsBoardModule,
        DashboardModule,
        RuleChainModule,
        DigitalTwinModule,
        SyncModule,
        AnalyticsModule,
        VisualizationModule,
        SimulationModule
    ],

    providers: [
        SystemHealthCheck
    ]
})

@McpApp({
    module: AppModule,

    server: {
        name: "dtaas-server",
        version: "1.0.0"
    },

    logging: {
        level: "info"
    }
})
export class AppModule { }
