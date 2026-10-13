import { Module } from '@nitrostack/core';
import { ExplainabilityTools } from './explainability.tools.js';

@Module({
  name: 'explainability',
  description: 'Generate human-readable reasoning for rules',
  controllers: [ExplainabilityTools],
  exports: [ExplainabilityTools],
})
export class ExplainabilityModule {}
