/**
 * calendar-checks.resource.ts — Persistence + MCP Resource for CalendarCheckResult.
 * URI: video://calendar-checks/{video_id}
 * Person 2 writes, Person 4 reads.
 */
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs   from 'fs';
import * as path from 'path';
import type { CalendarCheckResult } from '../video-ingest/video.types.js';

const DATA_DIR   = path.join(process.cwd(), 'src', 'data', 'runtime');
const STORE_FILE = path.join(DATA_DIR, 'calendar-checks.json');

function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
function readStore(): Record<string, CalendarCheckResult> {
  ensureDir();
  if (!fs.existsSync(STORE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')); } catch { return {}; }
}
function writeStore(s: Record<string, CalendarCheckResult>) {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2), 'utf-8');
}

export function writeCalendarCheck(r: CalendarCheckResult): void {
  const s = readStore(); s[r.video_id] = r; writeStore(s);
}
export function readCalendarCheck(videoId: string): CalendarCheckResult | null {
  return readStore()[videoId] ?? null;
}

export class CalendarChecksResources {
  @Resource({
    uri: 'video://calendar-checks/{video_id}',
    name: 'Calendar Check — Single',
    description: 'Returns CalendarCheckResult for a video_id: events found near the prediction date, historical correlation, and calendar_alignment_score (0–30). Written by Person 2 Signal Validation Agent.',
    mimeType: 'application/json',
  })
  async getCalendarCheck(uri: string, ctx: ExecutionContext) {
    const videoId = uri.replace('video://calendar-checks/', '');
    ctx.logger.info('video://calendar-checks: read', { videoId });
    const result = readCalendarCheck(videoId);
    return {
      contents: [{
        uri, mimeType: 'application/json',
        text: JSON.stringify(result ?? { error: `No calendar check for video_id "${videoId}". Run validate_claim_against_signal first.` }, null, 2),
      }],
    };
  }
}
