import { Module } from '@nitrostack/core';
import { LenderDataService } from './lender.data.service.js';
import { LenderTools } from './lender.tools.js';

@Module({
  name: 'lender',
  description: 'Lender Agent — loan offers with transparent true-cost comparison',
  controllers: [LenderTools],
  providers: [LenderDataService],
  exports: [LenderDataService]
})
export class LenderModule {}
