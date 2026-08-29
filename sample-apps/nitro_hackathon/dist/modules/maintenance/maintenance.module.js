var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nitrostack/core';
import { MaintenanceTools } from './maintenance.tools.js';
/**
 * Maintenance Module
 *
 * Placeholder module for the Predictive Maintenance system.
 * In Phase 2, this will be expanded with tools for:
 * - Machine data ingestion
 * - Failure prediction
 * - Diagnostic analysis
 * - Maintenance recommendations
 * - Report generation
 */
let MaintenanceModule = class MaintenanceModule {
};
MaintenanceModule = __decorate([
    Module({
        name: 'maintenance',
        description: 'Predictive maintenance tools and resources',
        controllers: [MaintenanceTools]
    })
], MaintenanceModule);
export { MaintenanceModule };
//# sourceMappingURL=maintenance.module.js.map