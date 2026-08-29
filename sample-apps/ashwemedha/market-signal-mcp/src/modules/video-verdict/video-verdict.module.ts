import { Module } from '@nitrostack/core';
import { VideoVerdictTools }     from './video-verdict.tools.js';
import { VideoVerdictResources } from './video-verdict.resource.js';

@Module({
  name: 'video-verdict',
  description:
    'Phase 2 — Confidence Aggregator (Person 4): Combines signal_score, calendar_alignment, ' +
    'predictor_accuracy, and platform_authority into a final VideoVerdict (0–100). ' +
    'Bands: HIGH (80+), MODERATE (60+), WEAK (40+), DISMISS (<40). ' +
    'Generates a Groq-powered reasoning narrative. ' +
    'Owns and writes to video://verdicts Resource.',
  controllers: [VideoVerdictTools, VideoVerdictResources],
})
export class VideoVerdictModule {}
