import { Module } from '@nitrostack/core';
import { PromptsTools } from './prompts.tools.js';

@Module({
  name: 'prompts',
  description: 'MCP System Prompts Module — Exposes agentic directives for NitroStudio AI Chat',
  controllers: [PromptsTools],
  providers: [],
})
export class PromptsModule {}
