import { Module } from '@nitrostack/core';
import { ExtractionTools } from './extraction.tools.js';

@Module({
  name: 'extraction',
  description: 'Extract key thresholds and variables from text',
  controllers: [ExtractionTools],
  exports: [ExtractionTools],
})
export class ExtractionModule {}
