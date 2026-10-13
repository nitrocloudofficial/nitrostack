import { Module } from '@nitrostack/core';
import { AgentsTools } from './agents.tools.js';
import { AgentsResources } from './agents.resources.js';

@Module({
  name: 'agents',
  description: 'Dynamic AI Agent Factory - create and manage specialist enterprise agents',
  controllers: [AgentsTools, AgentsResources],
})
export class AgentsModule {}
