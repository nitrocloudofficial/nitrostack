import { Module } from '@nitrostack/core';
import { SupervisorTools } from './supervisor.tools.js';
import { SupervisorResources } from './supervisor.resources.js';
import { SupervisorPrompts } from './supervisor.prompts.js';
import { DbService } from '../../services/db.service.js';

@Module({
  name: 'supervisor',
  description: 'FactoryOS Orchestrator & Supervisor Agent Module',
  controllers: [SupervisorTools, SupervisorResources, SupervisorPrompts],
  providers: [DbService]
})
export class SupervisorModule {}
