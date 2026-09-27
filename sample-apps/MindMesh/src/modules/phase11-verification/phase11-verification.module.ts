import { Module } from '@nitrostack/core';
import { MemoryModule } from '../../core/memory/memory.module.js';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { VerificationTools } from './verification.tools.js';

/**
 * Phase 11: Research Verification Module
 */
@Module({
  name: 'phase11-verification',
  description: 'Research verification: claim support, citation accuracy, methodology consistency',
  imports: [MemoryModule],
  providers: [VerificationTools, MemoryStore],
  controllers: [VerificationTools],
})
export class Phase11VerificationModule {}