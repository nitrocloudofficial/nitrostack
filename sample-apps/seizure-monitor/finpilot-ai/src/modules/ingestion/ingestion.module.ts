import { Module } from '@nitrostack/core';
import { IngestionTools } from './ingestion.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'ingestion',
  description: 'Data ingestion and transaction management',
  controllers: [IngestionTools],
  providers: [FinanceStore],
})
export class IngestionModule {}
