import { Module } from '@nitrostack/core';
import { AnalysisTools } from './analysis.tools.js';

@Module({
  name: 'analysis',
  description: 'One-shot full pipeline analysis — runs all 8 steps from sampleSet to final report',
  controllers: [AnalysisTools],
})
export class AnalysisModule {}
