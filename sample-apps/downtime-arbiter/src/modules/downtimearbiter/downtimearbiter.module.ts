import { Module } from '@nitrostack/core';
import { DowntimeArbiterTools } from './downtimearbiter.tools.js';
import { DowntimeArbiterResources } from './downtimearbiter.resources.js';
import { DowntimeArbiterPrompts } from './downtimearbiter.prompts.js';
import { NegotiationDashboardTool } from './negotiation-dashboard.tool.js';

@Module({
  name: 'downtimearbiter',
  description: 'Multi-agent negotiation system for machine downtime scheduling with context isolation and rule-based arbiter',
  controllers: [DowntimeArbiterTools, DowntimeArbiterResources, DowntimeArbiterPrompts, NegotiationDashboardTool],
})
export class DowntimeArbiterModule {}
