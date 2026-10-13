import { Module } from '@nitrostack/core';
import { TriageRouterTools } from './triage-router.tools.js';
import { TriageRouterPrompts } from './triage-router.prompts.js';

@Module({
  name: 'triage-router',
  description: 'Routes submissions to appropriate evaluation paths based on criteria',
  controllers: [TriageRouterTools, TriageRouterPrompts]
})
export class TriageRouterModule {}
