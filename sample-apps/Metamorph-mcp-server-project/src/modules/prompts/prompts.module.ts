import { Module } from '@nitrostack/core';
import { MetamorphPrompts } from './prompts.js';

@Module({
  name: 'prompts',
  description: 'Guided workflows that tell the client model which Metamorph tools to call, in order',
  controllers: [MetamorphPrompts]
})
export class PromptsModule {}
