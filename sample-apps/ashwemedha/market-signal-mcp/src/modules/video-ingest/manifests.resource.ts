/**
 * manifests.resource.ts — Persistence + MCP Resource for VideoManifest.
 *
 * Blackboard resource URI: video://manifests
 *
 * Storage: src/data/runtime/video-manifests.json
 * (same pattern as findings-board.json, signal-log-store.json, etc.)
 *
 * Only Person 1 (video-ingest) WRITES here.
 * Persons 2, 3, 4 READ here.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs   from 'fs';
import * as path from 'path';
import type { VideoManifest } from './video.types.js';

// ─── Persistence ──────────────────────────────────────────────────────────────
const DATA_DIR      = path.join(process.cwd(), 'src', 'data', 'runtime');
const MANIFESTS_FILE = path.join(DATA_DIR, 'video-manifests.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStore(): Record<string, VideoManifest> {
  ensureDataDir();
  if (!fs.existsSync(MANIFESTS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFESTS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, VideoManifest>): void {
  ensureDataDir();
  fs.writeFileSync(MANIFESTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// ─── Exported helpers (used by video-ingest.tools.ts to write) ───────────────
export function writeManifest(manifest: VideoManifest): void {
  const store = readStore();
  store[manifest.video_id] = manifest;
  writeStore(store);
}

export function readManifest(videoId: string): VideoManifest | null {
  const store = readStore();
  return store[videoId] ?? null;
}

export function readAllManifests(limit = 50): VideoManifest[] {
  const store = readStore();
  return Object.values(store)
    .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at))
    .slice(0, limit);
}

// ─── MCP Resource ─────────────────────────────────────────────────────────────
export class VideoManifestResources {
  /**
   * video://manifests/{video_id}
   * Returns the VideoManifest for a specific video_id.
   * Used by extract_stock_claim and by Person 3's predictor credibility agent.
   */
  @Resource({
    uri:         'video://manifests/{video_id}',
    name:        'Video Manifest — Single',
    description:
      'Returns the VideoManifest for a given video_id. ' +
      'Shape: VideoManifest (video_id, source_url, platform, title, channel_name, ' +
      'channel_handle, posted_at, duration_sec, transcript, transcript_segments[], fetched_at). ' +
      'video_id is a 16-char SHA-256 hex hash of the source URL.',
    mimeType: 'application/json',
  })
  async getManifest(uri: string, ctx: ExecutionContext) {
    const videoId = uri.replace('video://manifests/', '');
    ctx.logger.info('video://manifests: read single', { videoId });

    const manifest = readManifest(videoId);
    if (!manifest) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: `No manifest found for video_id "${videoId}". Run ingest_video first.`,
          }, null, 2),
        }],
      };
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(manifest, null, 2),
      }],
    };
  }

  /**
   * video://manifests
   * Returns all ingested VideoManifests, newest first.
   * Used by the widget dashboard and by the pipeline orchestrator.
   */
  @Resource({
    uri:         'video://manifests',
    name:        'Video Manifests — All',
    description:
      'Returns all ingested VideoManifest records (newest first, up to 50). ' +
      'Call ingest_video to add entries. Shape: { manifests: VideoManifest[], count: number }.',
    mimeType: 'application/json',
  })
  async getAllManifests(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('video://manifests: read all', { uri });
    const manifests = readAllManifests(50);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ manifests, count: manifests.length }, null, 2),
      }],
    };
  }
}
