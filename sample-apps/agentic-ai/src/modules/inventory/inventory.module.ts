import { Module } from '@nitrostack/core';
import { ServicesModule } from '../../services/services.module.js';
import { InventoryAgent } from './inventory.agent.js';
import { InventoryCsvService } from './inventory-csv.service.js';
import { InventoryTools } from './inventory.tools.js';

@Module({
  name: 'inventory',
  description: 'Inventory lookup, reservation, and purchase handoff',
  imports: [ServicesModule],
  providers: [InventoryCsvService, InventoryAgent],
  controllers: [InventoryTools],
  exports: [InventoryCsvService, InventoryAgent],
})
export class InventoryModule {}
