import { Module } from '@nitrostack/core';
import { PharmacyTools } from './pharmacy.tools.js';

@Module({
  name: 'pharmacy',
  description: 'Manage pharmacy inventory and availability',
  controllers: [PharmacyTools],
})
export class PharmacyModule {}
