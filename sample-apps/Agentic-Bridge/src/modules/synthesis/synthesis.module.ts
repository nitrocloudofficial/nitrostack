import { Module } from '@nitrostack/core';
import { SynthesisTools } from './synthesis.tools.js';
import { ManifestService } from './manifest.service.js';

@Module({
  name: 'synthesis',
  description: 'CLAUDE.md synthesis and manual context ingestion',
  controllers: [SynthesisTools],
  providers: [ManifestService],
  exports: [ManifestService],
})
export class SynthesisModule {}
