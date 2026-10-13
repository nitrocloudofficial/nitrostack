import { Module } from '@nitrostack/core';
import { InboundService } from './services/inbound.service.js';
import { SupplierService } from './services/supplier.service.js';
import { SupplyChainInboundTools } from './supply-chain-inbound.tools.js';
import { SupplyChainOutboundTools } from './supply-chain-outbound.tools.js';

/**
 * Supply Chain Module
 *
 * Owns the Supply Chain Agent's Stage 1 tools:
 *   - UC1: Damaged Freight Dispute & Emergency Sourcing
 *   - UC4: QC Failure & Supplier Penalization
 *
 * Exported services can be consumed by other modules if needed.
 */
@Module({
  name: 'supply-chain',
  description: 'Supply Chain Agent — manages inbound freight, stock levels, and supplier communication',
  providers: [InboundService, SupplierService],
  controllers: [SupplyChainInboundTools, SupplyChainOutboundTools],
  exports: [InboundService, SupplierService],
})
export class SupplyChainModule {}
