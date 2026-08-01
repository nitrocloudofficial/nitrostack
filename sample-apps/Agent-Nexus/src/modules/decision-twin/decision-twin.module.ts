import { Module } from '@nitrostack/core';
import { DecisionTwinTools } from './decision-twin.tools.js';
import { DecisionTwinResources } from './decision-twin.resources.js';
import { DecisionTwinPrompts } from './decision-twin.prompts.js';
import { DecisionTwinOrchestrator } from './decision-twin.orchestrator.js';

@Module({
  name: 'decision-twin',
  description: 'Multi-Agent Manufacturing Decision Twin Module',
  controllers: [DecisionTwinTools, DecisionTwinResources, DecisionTwinPrompts],
  providers: [DecisionTwinTools, DecisionTwinResources, DecisionTwinPrompts, DecisionTwinOrchestrator]
})
export class DecisionTwinModule {}
