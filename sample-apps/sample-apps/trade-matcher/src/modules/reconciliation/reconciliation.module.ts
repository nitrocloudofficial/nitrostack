import { Module } from '@nitrostack/core';
import { ReconciliationTools } from './reconciliation.tools.js';

@Module({
  name: 'reconciliation',
  description: 'Orchestrates the full reconciliation pipeline as a single agentic tool call',
  controllers: [ReconciliationTools],
})
export class ReconciliationModule {}