import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { ProductionAgent } from './production.agent.js';
import { ProductionDataService } from './production-data.service.js';
import { ProductionTools } from './production.tools.js';

@Module({
  name: 'production',
  description: 'Priority-aware production disruption planning and Manager approval handoff',
  imports: [ServicesModule],
  providers: [ProductionDataService, ProductionAgent],
  controllers: [ProductionTools],
  exports: [ProductionDataService, ProductionAgent],
})
export class ProductionModule {}
