import { Module } from '@nitrostack/core';
import { ServicesModule } from '../services/services.module.js';
import { OrchestratorService } from './orchestrator.service.js';
import { ManagerModule } from '../modules/manager/manager.module.js';
import { OrchestratorProcessor } from './orchestrator.processor.js';
import { WorkflowStateService } from './workflow-state.service.js';
import { OrchestratorTools } from './orchestrator.tools.js';

@Module({
  name: 'orchestrator',
  description: 'Observe, reason, collaborate, execute, monitor, and report coordination loop',
  imports: [ServicesModule, ManagerModule],
  providers: [WorkflowStateService, OrchestratorProcessor, OrchestratorService],
  controllers: [OrchestratorTools],
  exports: [WorkflowStateService, OrchestratorService],
})
export class OrchestratorModule {}
