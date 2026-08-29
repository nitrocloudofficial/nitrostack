import { Module } from '@nitrostack/core';
import { IndustryTools } from './industry.tools.js';
import { IndustryPrompts } from './industry.prompts.js';

@Module({
  name: 'industry',
  controllers: [IndustryTools, IndustryPrompts],
})
export class IndustryModule {}