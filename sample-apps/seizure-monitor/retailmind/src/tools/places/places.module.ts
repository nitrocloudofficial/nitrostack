import { Module } from '@nitrostack/core';
import { PlacesService } from './places.service.js';

@Module({
  name: 'places',
  description: 'Places tool - finds competitors and anchor points near a zone',
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
