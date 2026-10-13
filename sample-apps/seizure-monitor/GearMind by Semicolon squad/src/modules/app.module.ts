import { Module } from '@nitrostack/core';
import { AppController } from './app.controller.js';
import { InventoryController } from './inventory.controller.js';
import { ProcurementController } from './procurement.controller.js';
import { PolicyController } from './policy.controller.js';
import { OrchestratorController } from './orchestrator.controller.js';
import { MaintenanceController } from './maintenance.controller.js';
import { SafetyController } from './safety.controller.js';

@Module({
  name: 'AppModule',
  description: 'FactoryMind Root Module combining Inventory, Procurement, Policy, Maintenance, Safety, and System tools',
  controllers: [
    AppController,
    InventoryController,
    ProcurementController,
    PolicyController,
    OrchestratorController,
    MaintenanceController,
    SafetyController,
  ],
})
export class AppModule {}
