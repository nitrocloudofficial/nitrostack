import { Module } from '@nitrostack/core';
import { InventoryTools } from './inventory.tools.js';

@Module({ name: 'inventory', description: 'Inventory check tool', controllers: [InventoryTools] })
export class InventoryModule {}
