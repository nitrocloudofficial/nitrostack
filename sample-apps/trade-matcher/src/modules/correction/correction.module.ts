import { Module } from '@nitrostack/core';
import { CorrectionTools } from './correction.tools.js';

@Module({
  name: 'correction',
  description: 'Proposes corrections for unexplained trade breaks, always requiring human approval',
  controllers: [CorrectionTools],
})
export class CorrectionModule {}