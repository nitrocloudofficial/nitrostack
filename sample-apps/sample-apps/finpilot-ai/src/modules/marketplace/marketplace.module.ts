import { Module } from '@nitrostack/core';
import { MarketplaceTools } from './marketplace.tools.js';
import { FinanceStore } from '../../services/finance-store.service.js';

@Module({
  name: 'marketplace',
  description: 'FinPilot Marketplace Intelligence — Student discounts, cashback, and optimal deal recommendations',
  controllers: [MarketplaceTools],
  providers: [FinanceStore],
})
export class MarketplaceModule {}
