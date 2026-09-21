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
@Module({
  name: 'maintenance',
  description: 'Predictive maintenance tools and resources',
  controllers: [MaintenanceTools]
})
export class MaintenanceModule {}
