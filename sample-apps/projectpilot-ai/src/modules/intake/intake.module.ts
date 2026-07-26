import { Module } from '@nitrostack/core';
import { IntakeTools } from './intake.tools.js';
import { IntakeResources } from './intake.resources.js';
import { IntakePrompts } from './intake.prompts.js';
import { IntakeService } from './intake.service.js';

@Module({
  name: 'intake',
  description: 'Accepts SRD and team data',

  controllers: [
    IntakeTools,
    IntakeResources,
    IntakePrompts,
  ],

  providers: [
    IntakeTools,
    IntakeResources,
    IntakePrompts,
    IntakeService,
  ],

  exports: [
    IntakeService,
  ],
})
export class IntakeModule {}
