import { Module } from '@nitrostack/core';
import { PlatformPrompts } from './platform.prompts.js';

@Module({
  name: 'prompts',
  description: 'Platform MCP Prompts module',
  controllers: [PlatformPrompts],
})
export class PromptsModule {}
