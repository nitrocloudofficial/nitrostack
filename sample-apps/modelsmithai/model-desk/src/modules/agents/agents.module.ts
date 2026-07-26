import { Module } from '@nitrostack/core';
import { AgentTools } from './agents.tools.js';
import { AgentResources } from './agents.resources.js';
import { AgentPrompts } from './agents.prompts.js';

@Module({
  name: 'agents',
  description: 'The six-agent model-building pipeline (via Python ML sidecar)',
  controllers: [AgentTools, AgentResources, AgentPrompts]
})
export class AgentsModule {}
