import { Module } from '@nitrostack/core';
import { ProductTools } from './product.tools.js';
import { ProductResources } from './product.resources.js';
import { ProductPrompts } from './product.prompts.js';

@Module({
  name: 'product',
  description: 'Product review agent for business proposals',
  controllers: [ProductTools, ProductResources, ProductPrompts]
})
export class ProductModule {}
