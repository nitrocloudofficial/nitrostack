import { Module } from '@nitrostack/core';
import { MapsService } from './maps.service.js';

@Module({
  name: 'maps',
  description: 'Maps tool - finds candidate zones for a given city and radius',
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
