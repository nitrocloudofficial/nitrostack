import { Module } from '@nitrostack/core';
import { SurgeGuardPrompts } from './surgeguard.prompts.js';
import { SurgeGuardResources } from './surgeguard.resources.js';
import { SurgeGuardTools } from './surgeguard.tools.js';

@Module({
  name: 'surgeguard',
  description: 'Policy-gated emergency surge planning, evaluation and execution controls.',
  controllers: [
    SurgeGuardTools,
    SurgeGuardResources,
    SurgeGuardPrompts,
  ],
})
export class SurgeGuardModule {}
