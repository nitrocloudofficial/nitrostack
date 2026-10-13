/**
 * predictor-profiles.resource.ts — Persistence + MCP Resource for PredictorProfile.
 * URI: video://predictor-profiles/{handle}:{platform}
 * Person 3 writes, Person 4 reads.
 */
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs   from 'fs';
import * as path from 'path';
import type { PredictorProfile } from '../video-ingest/video.types.js';

const DATA_DIR   = path.join(process.cwd(), 'src', 'data', 'runtime');
const STORE_FILE = path.join(DATA_DIR, 'predictor-profiles.json');

function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
function readStore(): Record<string, PredictorProfile> {
  ensureDir();
  if (!fs.existsSync(STORE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')); } catch { return {}; }
}
function writeStore(s: Record<string, PredictorProfile>) {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2), 'utf-8');
}

function profileKey(handle: string, platform: string): string {
  return `${handle.replace('@', '')}:${platform}`.toLowerCase();
}

export function writePredictorProfile(p: PredictorProfile): void {
  const s = readStore(); s[profileKey(p.handle, p.platform)] = p; writeStore(s);
}
export function readPredictorProfile(handle: string, platform: string): PredictorProfile | null {
  return readStore()[profileKey(handle, platform)] ?? null;
}

export class PredictorProfilesResources {
  @Resource({
    uri:      'video://predictor-profiles/{key}',
    name:     'Predictor Profile — Single',
    description: 'Returns PredictorProfile for a handle:platform key (e.g. chartguy:twitter). ' +
      'Contains follower_count, account_age_years, past_predictions_sampled[], accuracy_rate, predictor_score (0–25), platform_score (0–10). ' +
      'Written by Person 3 Predictor Credibility Agent.',
    mimeType: 'application/json',
  })
  async getProfile(uri: string, ctx: ExecutionContext) {
    const key  = uri.replace('video://predictor-profiles/', '');
    ctx.logger.info('video://predictor-profiles: read', { key });
    const store = readStore();
    return {
      contents: [{
        uri, mimeType: 'application/json',
        text: JSON.stringify(store[key] ?? { error: `No profile for key "${key}". Run score_predictor_accuracy first.` }, null, 2),
      }],
    };
  }
}
