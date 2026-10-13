import { Module } from '@nitrostack/core';
import { OperationsTools } from './operations.tools.js';
import { OperationsResources } from './operations.resources.js';
import { OperationsPrompts } from './operations.prompts.js';
import { FactoryStateService } from '../diagnostics/factory-state.service.js';

@Module({
  name: 'operations',
  description: 'Factory operations module for coordinating incident response, batch reassignment, maintenance, and notifications',
  controllers: [OperationsTools, OperationsResources, OperationsPrompts],
  providers: [FactoryStateService],
})
export class OperationsModule {}
