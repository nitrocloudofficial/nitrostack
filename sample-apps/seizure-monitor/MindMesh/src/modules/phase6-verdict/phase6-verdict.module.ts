import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { VerdictTools } from './verdict.tools.js';

/**
 * Phase 6: Verdict & Resilience Score Module
 */
@Module({
  name: 'phase6-verdict',
  description: 'Resilience score computation and PASS/CONDITIONAL/REJECT verdict',
  imports: [MemoryModule],
  providers: [VerdictTools],
  controllers: [VerdictTools],
})
export class Phase6VerdictModule {}