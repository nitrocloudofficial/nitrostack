import { Module } from '@nitrostack/core';
import { ProductDocService } from './product.service.js';
import { ProductDocTools } from './product.tools.js';

@Module({
    name: 'product',
    description: 'Product documentation module',
    controllers: [ProductDocTools],
    providers: [ProductDocService],
})
export class ProductDocModule { }
