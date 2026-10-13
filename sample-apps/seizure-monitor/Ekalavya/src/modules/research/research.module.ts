import { Module } from '@nitrostack/core';
import { ResearchTools } from './research.tools.js';

@Module({
  name: 'research',
  imports: [],
  controllers: [ResearchTools],
})
export class ResearchModule {}
