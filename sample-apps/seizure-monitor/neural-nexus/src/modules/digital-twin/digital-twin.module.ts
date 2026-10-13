import { Module } from '@nitrostack/core';
import { DigitalTwinTools } from './digital-twin.tools.js';
import { DigitalTwinService } from './digital-twin.service.js';
import { DigitalTwinPrompts } from './digital-twin.prompts.js';

/**
 * DigitalTwinModule — the AI Workplace Digital Twin.
 *
 * Multi-agent enterprise operations control center: monitoring, root-cause
 * analysis, business impact prediction, prioritized recommendations, approved
 * action execution through MCP servers, and an executive copilot.
 */
@Module({
  name: 'digital-twin',
  description: 'AI Workplace Digital Twin — multi-agent enterprise operations control center',
  controllers: [DigitalTwinTools, DigitalTwinPrompts],
  providers: [DigitalTwinService],
})
export class DigitalTwinModule {}
