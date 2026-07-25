import { Module } from '@nitrostack/core';
import { SupervisorTools } from './supervisor.tools.js';
import { SupervisorResources } from './supervisor.resources.js';
import { SupervisorPrompts } from './supervisor.prompts.js';

@Module({
  name: 'supervisor',
  description: 'Pediatric Orchestration Supervisor Agent Module',
  controllers: [
    SupervisorTools,
    SupervisorResources,
    SupervisorPrompts,
  ],
  providers: [
    SupervisorTools,
    SupervisorResources,
    SupervisorPrompts,
  ],
  exports: [
    SupervisorTools,
    SupervisorResources,
    SupervisorPrompts,
  ],
})
export class SupervisorModule {}
