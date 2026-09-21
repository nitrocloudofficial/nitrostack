import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { OverleafModule } from '../../core/services/overleaf.module.js';
import { OverleafTools } from './overleaf.tools.js';

/**
 * Phase 13: Overleaf Integration Module (Mode 2)
 *
 * Paper drafting via Overleaf Git integration.
 * Creates projects from IEEE template, pushes sections, auto-generates limitations.
 */
@Module({
  name: 'phase13-overleaf',
  description: 'Overleaf paper drafting via Git integration',
  imports: [MemoryModule, OverleafModule],
  providers: [OverleafTools],
  controllers: [OverleafTools],
})
export class Phase13OverleafModule {}