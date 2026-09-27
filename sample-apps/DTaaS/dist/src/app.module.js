var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
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
    }),
    McpApp({
        module: AppModule,
        server: {
            name: "dtaas-server",
            version: "1.0.0"
        },
        logging: {
            level: "info"
        }
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map