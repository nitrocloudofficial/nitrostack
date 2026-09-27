/**
 * claims.resource.ts — Persistence + MCP Resource for StockClaim.
 *
 * Blackboard resource URI: video://claims
 *
 * Storage: src/data/runtime/video-claims.json
 *
 * Only Person 1 (video-ingest) WRITES here.
 * Persons 2, 3, 4 READ here — it is the primary handoff point to Signal
 * Validation and Predictor Credibility agents.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs   from 'fs';
import * as path from 'path';
import type { StockClaim, RejectedClaim } from './video.types.js';

// ─── Persistence ──────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(process.cwd(), 'src', 'data', 'runtime');
const CLAIMS_FILE = path.join(DATA_DIR, 'video-claims.json');

interface ClaimsStore {
  claims:   Record<string, StockClaim>;
  rejected: Record<string, RejectedClaim>;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStore(): ClaimsStore {
  ensureDataDir();
  if (!fs.existsSync(CLAIMS_FILE)) return { claims: {}, rejected: {} };
  try {
    return JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf-8'));
  } catch {
    return { claims: {}, rejected: {} };
  }
}

function writeStore(store: ClaimsStore): void {
  ensureDataDir();
  fs.writeFileSync(CLAIMS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// ─── Exported helpers ─────────────────────────────────────────────────────────
export function writeClaim(claim: StockClaim): void {
  const store = readStore();
  store.claims[claim.video_id] = claim;
  writeStore(store);
}

export function writeRejectedClaim(rejected: RejectedClaim): void {
  const store = readStore();
  store.rejected[rejected.video_id] = rejected;
  writeStore(store);
}

export function readClaim(videoId: string): StockClaim | null {
  return readStore().claims[videoId] ?? null;
}

export function readAllClaims(tickerFilter?: string): StockClaim[] {
  const store = readStore();
  const all   = Object.values(store.claims);
  if (!tickerFilter) return all;
  const upper = tickerFilter.toUpperCase();
  return all.filter((c) => c.ticker.toUpperCase() === upper);
}

// ─── MCP Resource ─────────────────────────────────────────────────────────────
export class VideoClaimsResources {
  /**
   * video://claims/{video_id}
   * Returns the StockClaim extracted from a specific video.
   * Primary read point for Person 2 (Signal Validation) and Person 3 (Predictor).
   */
  @Resource({
    uri:         'video://claims/{video_id}',
    name:        'Video Claim — Single',
    description:
      'Returns the StockClaim extracted from a given video_id. ' +
      'Shape: StockClaim (video_id, ticker, company_name, direction, timeframe_iso, ' +
      'timeframe_hint_raw, reason_given, predictor_name, predictor_handle, platform, ' +
      'extraction_confidence, transcript_evidence). ' +
      'Returns an error object if the claim was rejected or not yet extracted.',
    mimeType: 'application/json',
  })
  async getClaim(uri: string, ctx: ExecutionContext) {
    const videoId = uri.replace('video://claims/', '');
    ctx.logger.info('video://claims: read single', { videoId });

    const store = readStore();

    if (store.rejected[videoId]) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            status:          'rejected',
            rejected_reason: store.rejected[videoId].rejected_reason,
          }, null, 2),
        }],
      };
    }

    const claim = store.claims[videoId];
    if (!claim) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: `No claim found for video_id "${videoId}". Run extract_stock_claim first.`,
          }, null, 2),
        }],
      };
    }

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(claim, null, 2),
      }],
    };
  }

  /**
   * video://claims
   * Returns all extracted StockClaims, with optional ticker filter.
   * Used by the widget to show the full video prediction history.
   */
  @Resource({
    uri:         'video://claims',
    name:        'Video Claims — All',
    description:
      'Returns all successfully extracted StockClaims. ' +
      'Shape: { claims: StockClaim[], count: number }. ' +
      'Filter by ticker using the query portion of the URI if needed.',
    mimeType: 'application/json',
  })
  async getAllClaims(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('video://claims: read all', { uri });
    const claims = readAllClaims();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ claims, count: claims.length }, null, 2),
      }],
    };
  }
}
