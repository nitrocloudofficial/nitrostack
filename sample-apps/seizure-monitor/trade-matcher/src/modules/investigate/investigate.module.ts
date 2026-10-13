import { Module } from '@nitrostack/core';
import { InvestigateTools } from './investigate.tools.js';

@Module({
  name: 'investigate',
  description: 'Agentic investigation of trade breaks using LLM tool-calling',
  controllers: [InvestigateTools],
})
export class InvestigateModule {}