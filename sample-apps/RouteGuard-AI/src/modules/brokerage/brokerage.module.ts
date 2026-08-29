import { Module } from '@nitrostack/core';
import { BrokerageService } from './brokerage.service.js';
import { BrokerageTools } from './brokerage.tools.js';
import { ImpactModule } from '../impact/impact.module.js';
import { SharedModule } from '../../shared/shared.module.js';

/**
 * Brokerage Module
 * Logistics Broker & Negotiation Agent
 *
 * Searches global freight networks and alternative transport modes (e.g., switching
 * from sea freight to air cargo or alternative trucking routes). Automatically queries
 * carrier APIs for spot rates, available capacity, and transit times. Compiles an
 * optimal contingency plan and presents it to human operators or executes automated
 * booking parameters if pre-approved.
 */
@Module({
  name: 'brokerage',
  description: 'Logistics Broker & Negotiation Agent - contingency planning and booking',
  imports: [SharedModule, ImpactModule],
  providers: [BrokerageService],
  controllers: [BrokerageTools],
})
export class BrokerageModule {}
