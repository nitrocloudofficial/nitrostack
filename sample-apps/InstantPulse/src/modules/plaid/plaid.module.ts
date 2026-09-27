import { Module } from '@nitrostack/core';
import { CommonModule } from '../../common/common.module.js';
import { PlaidHealthCheck } from '../../health/plaid.health.js';
import { PlaidService } from './plaid.service.js';
import { PlaidTools } from './plaid.tools.js';

@Module({
  name: 'plaid',
  description: 'Bank connection and transaction retrieval via Plaid Sandbox',
  imports: [CommonModule],
  providers: [PlaidService, PlaidHealthCheck],
  controllers: [PlaidTools],
  exports: [PlaidService],
})
export class PlaidModule {}
