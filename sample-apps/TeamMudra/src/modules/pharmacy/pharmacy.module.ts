import { Module } from '@nitrostack/core';
import { PharmacyTools } from './pharmacy.tools.js';

@Module({
  name: 'pharmacy',
  description: 'Pharmacy inventory monitoring and recommendations',
  controllers: [PharmacyTools]
})
export class PharmacyModule {}