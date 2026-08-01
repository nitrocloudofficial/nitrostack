import { Module } from '@nitrostack/core';
import { TrafficService } from './traffic.service.js';

@Module({
  name: 'traffic',
  description: 'Traffic tool - estimates foot traffic for a zone',
  providers: [TrafficService],
  exports: [TrafficService],
})
export class TrafficModule {}
