import { Module } from '@nitrostack/core';
import { DatabaseModule } from '../database/database.module.js';
import { DatabaseService } from '../database/database.service.js';
import { DiscoveryService } from './discovery.service.js';
import { DiscoveryTools } from './discovery.tools.js';

/**
 * Doctor discovery: directory search and side-by-side slot comparison.
 */
@Module({
  name: 'discovery',
  description: 'Search the doctor directory and compare open consultation slots',
  imports: [DatabaseModule],
  providers: [DatabaseService, DiscoveryService],
  controllers: [DiscoveryTools],
})
export class DiscoveryModule {}
