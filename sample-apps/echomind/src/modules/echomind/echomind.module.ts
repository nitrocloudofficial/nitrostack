import { Module } from '@nitrostack/core';
import { EchoMindTools } from './echomind.tools.js';
import { EchoMindResources } from './echomind.resources.js';
import { EchoMindPrompts } from './echomind.prompts.js';

@Module({
  name: 'echomind',
  description: 'AI Investigation Engine',
  controllers: [
    EchoMindTools,
    EchoMindResources,
    EchoMindPrompts
  ]
})
export class EchoMindModule {}