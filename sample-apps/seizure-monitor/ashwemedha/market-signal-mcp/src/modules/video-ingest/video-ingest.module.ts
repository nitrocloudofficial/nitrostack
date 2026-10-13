/**
 * video-ingest.module.ts — NitroStack Module registration for Person 1's deliverable.
 *
 * Exposes:
 *   Tools:
 *     - ingest_video          (Step 1: URL → VideoManifest)
 *     - extract_stock_claim   (Step 2: transcript → StockClaim via Claude)
 *     - list_video_manifests  (read video://manifests)
 *     - list_video_claims     (read video://claims)
 *
 *   Resources:
 *     - video://manifests/{video_id}   (Person 2, 3, 4 read manifests here)
 *     - video://manifests              (widget reads all manifests)
 *     - video://claims/{video_id}      (Person 2, 3, 4 read claims here)
 *     - video://claims                 (widget reads all claims)
 *
 * This module is the FIRST dependency for all Phase 2 agents.
 * Persons 2, 3, 4 should confirm this module loads in NitroStudio before building.
 */

import { Module }                from '@nitrostack/core';
import { VideoIngestTools }      from './video-ingest.tools.js';
import { VideoManifestResources } from './manifests.resource.js';
import { VideoClaimsResources }  from './claims.resource.js';

@Module({
  name: 'video-ingest',
  description:
    'Phase 2 — Video Ingestion Agent: Accepts public video URLs, downloads audio, ' +
    'transcribes with OpenAI Whisper, extracts structured stock predictions via Claude, ' +
    'and validates tickers against Alpha Vantage. ' +
    'Owns and writes to video://manifests and video://claims shared Resources.',
  controllers: [
    VideoIngestTools,
    VideoManifestResources,
    VideoClaimsResources,
  ],
})
export class VideoIngestModule {}
