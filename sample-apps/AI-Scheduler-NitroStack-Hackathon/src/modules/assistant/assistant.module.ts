import { Module } from '@nitrostack/core';
import { AssistantTools } from './assistant.tools.js';
import { AssistantResources } from './assistant.resources.js';
import { AssistantPrompts } from './assistant.prompts.js';

@Module({
  name: 'assistant',
  description: 'AI personal assistant MCP module with scheduling, analytics, and summary capabilities',
  controllers: [AssistantTools, AssistantResources, AssistantPrompts]
})
export class AssistantModule {}
