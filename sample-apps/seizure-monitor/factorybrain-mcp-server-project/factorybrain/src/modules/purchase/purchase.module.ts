import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { PurchaseAgent } from './purchase.agent.js';
import { PurchaseRequestService } from './purchase-request.service.js';
import { PurchaseTools } from './purchase.tools.js';
import { ScoringService } from './scoring.service.js';
import { SupplierService } from './supplier.service.js';

@Module({
  name: 'purchase',
  description: 'Supplier selection, purchase requests, and manager handoff',
  imports: [ServicesModule],
  providers: [SupplierService, ScoringService, PurchaseRequestService, PurchaseAgent],
  controllers: [PurchaseTools],
  exports: [SupplierService, ScoringService, PurchaseRequestService, PurchaseAgent],
})
export class PurchaseModule {}
