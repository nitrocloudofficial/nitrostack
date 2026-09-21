import { Module } from '@nitrostack/core';
import { OverleafService } from './overleaf.service.js';
import { ConfigModule } from '../config/config.module.js';
import { MemoryModule } from '../memory/memory.module.js';

/**
 * Overleaf Module
 *
 * Provides Overleaf Git integration for paper drafting (Mode 2).
 */
@Module({
  name: 'overleaf',
  description: 'Overleaf Git integration for paper drafting',
  imports: [ConfigModule, MemoryModule],
  providers: [OverleafService],
  exports: [OverleafService],
})
export class OverleafModule {}