import { Module } from '@nitrostack/core';
import { SentinelService } from './sentinel.service.js';
import { SentinelTools } from './sentinel.tools.js';
import { SharedModule } from '../../shared/shared.module.js';

/**
 * Sentinel Module
 * Environmental & Risk Sentinel Agent
 *
 * Continuously monitors live data streams (news feeds, weather alerts, port authority
 * strike notices, maritime traffic congestion data) to identify emerging threats to
 * active shipments.
 */
@Module({
  name: 'sentinel',
  description: 'Environmental & Risk Sentinel Agent - threat detection and monitoring',
  imports: [SharedModule],
  providers: [SentinelService],
  controllers: [SentinelTools],
})
export class SentinelModule {}
