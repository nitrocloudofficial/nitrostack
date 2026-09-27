import { Module } from '@nitrostack/core';
import { DigitalEvidenceTools } from './digital-evidence.tools.js';
import { DigitalEvidenceResources } from './digital-evidence.resources.js';
import { DigitalEvidencePrompts } from './digital-evidence.prompts.js';

/**
 * Digital Evidence Integrity Module for Sentinel AI Platform
 * 
 * Exposes core tools, resources, and prompts for verifying evidence integrity,
 * extracting metadata, detecting manipulation, calculating trust scores,
 * generating forensic reports, and comparing evidence items.
 */
@Module({
  name: 'digital-evidence',
  description: 'Sentinel AI Digital Evidence Integrity Platform Module',
  controllers: [
    DigitalEvidenceTools,
    DigitalEvidenceResources,
    DigitalEvidencePrompts
  ],
  providers: [
    DigitalEvidenceTools,
    DigitalEvidenceResources,
    DigitalEvidencePrompts
  ],
  exports: [
    DigitalEvidenceTools,
    DigitalEvidenceResources,
    DigitalEvidencePrompts
  ]
})
export class DigitalEvidenceModule {}
