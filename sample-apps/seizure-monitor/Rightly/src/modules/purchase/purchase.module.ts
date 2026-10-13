import { Module } from '@nitrostack/core';
import { PurchaseTools } from './purchase.tools.js';
import { PurchaseResources } from './purchase.resources.js';
import { PurchasePrompts } from './purchase.prompts.js';

@Module({
  name: 'purchase',
  description: 'TODO: Add description',
  controllers: [PurchaseTools, PurchaseResources, PurchasePrompts],
})
export class PurchaseModule {}
