// src/app.module.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { AuditModule } from './modules/audit/audit.module.js';
import { SystemHealthCheck } from './health/system.health.js';
/**
 * Root Application Module — VeriCite
 *
 * Bootstraps the MCP server and composes the feature module graph.
 * The calculator scaffold module has been removed from the surface;
 * AuditModule is the sole feature module.
 *
 * To temporarily restore the calculator reference module, re-add:
 *   import { CalculatorModule } from './modules/calculator/calculator.module.js';
 * and include `CalculatorModule` in the imports array below.
 */
let AppModule = class AppModule {
};
AppModule = __decorate([
    McpApp({
        module: AppModule,
        server: {
            name: 'vericite',
            version: '1.0.0'
        },
        logging: {
            level: 'info'
        }
    }),
    Module({
        name: 'app',
        description: 'VeriCite — autonomous citation integrity auditor',
        imports: [
            ConfigModule.forRoot(),
            AuditModule
        ],
        providers: [
            // Health Checks
            SystemHealthCheck
        ]
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map