/**
 * Chief Module — ChiefOS Orchestration Engine
 * 
 * Registers all services for the ChiefOS orchestration layer:
 * - ClassifierService: AI classification layer
 * - AuditService: Audit trail generation
 * - OrchestratorService: Central orchestration engine
 * - ChiefService: Public entry point
 */

import { Module } from '@nitrostack/core';
import { ChiefService } from './chief.service.js';
import { ChiefController } from './chief.controller.js';
import { ClassifierService } from './classifier.service.js';
import { AuditService } from './audit.service.js';
import { OrchestratorService } from './orchestrator.service.js';

/**
 * Chief Module
 * 
 * Exports ChiefService as the public API for orchestration.
 */
@Module({
  name: 'chief',
  description: 'ChiefOS core orchestration module',
  controllers: [ChiefController],
  providers: [ClassifierService, AuditService, OrchestratorService, ChiefService],
})
export class ChiefModule {}
