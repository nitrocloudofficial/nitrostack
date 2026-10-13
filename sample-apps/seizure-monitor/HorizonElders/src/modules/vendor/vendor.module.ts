import { Module } from '@nitrostack/core';
import { VendorTools } from './vendor.tools.js';

@Module({ name: 'vendor', description: 'Vendor discovery tool', controllers: [VendorTools] })
export class VendorModule {}
