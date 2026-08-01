import { Module } from '@nitrostack/core';
import { SettlementTools } from './settlement.tools.js';

@Module({
  name: 'settlement',
  description: 'Settlement window lookups for reconciliation investigation',
  controllers: [SettlementTools],
})
export class SettlementModule {}