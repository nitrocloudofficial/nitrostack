var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { SystemHealthCheck } from './health/system.health.js';
/**
 * Root Application Module
 *
 * This is the main module that bootstraps the Predictive Maintenance MCP server.
 * It registers all feature modules and health checks.
 *
 * Currently imports:
 * - ConfigModule: Environment and configuration management
 * - MaintenanceModule: Predictive maintenance tools (Phase 1: ping only)
 * - SystemHealthCheck: Basic system health monitoring
 */
let AppModule = class AppModule {
};
AppModule = __decorate([
    McpApp({
        module: AppModule,
        server: {
            name: 'predictive-maintenance-server',
            version: '1.0.0'
        },
        logging: {
            level: 'info'
        }
    }),
    Module({
        name: 'app',
        description: 'Predictive Maintenance root application module',
        imports: [
            ConfigModule.forRoot(),
            MaintenanceModule
        ],
        providers: [
            // Health Checks
            SystemHealthCheck,
        ]
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map