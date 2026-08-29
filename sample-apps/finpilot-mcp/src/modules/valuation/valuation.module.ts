import { Module } from '@nitrostack/core';
import { ValuationTools } from './valuation.tools.js';

@Module({
  name: 'valuation',
  controllers: [ValuationTools],
})
export class ValuationModule {}
