import { Module } from '@nitrostack/core';
import { SocTools } from './calculator.tools.js';
import { SocResources } from './calculator.resources.js';
import { SocPrompts } from './calculator.prompts.js';

@Module({
  name: 'soc',
  description: 'Autonomous SOC Tier-1 Analyst & Incident Triage Agent',
  controllers: [
    SocTools,
    SocResources,
    SocPrompts
  ]
})
export class SocModule {}