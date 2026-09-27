/**
 * video-verdict.resource.ts — Persistence + MCP Resources for VideoVerdict.
 * URI: video://verdicts/{video_id}  +  video://verdicts  (list all)
 * Person 4 writes, widget reads.
 */
import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs   from 'fs';
import * as path from 'path';
import type { VideoVerdict } from '../video-ingest/video.types.js';

const DATA_DIR   = path.join(process.cwd(), 'src', 'data', 'runtime');
const STORE_FILE = path.join(DATA_DIR, 'video-verdicts.json');

function ensureDir() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
function readStore(): Record<string, VideoVerdict> {
  ensureDir();
  if (!fs.existsSync(STORE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')); } catch { return {}; }
}
function writeStore(s: Record<string, VideoVerdict>) {
  ensureDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2), 'utf-8');
}

export function writeVerdict(v: VideoVerdict): void {
  const s = readStore(); s[v.video_id] = v; writeStore(s);
}
export function readVerdict(videoId: string): VideoVerdict | null {
  return readStore()[videoId] ?? null;
}
export function readAllVerdicts(): VideoVerdict[] {
  return Object.values(readStore());
}

export class VideoVerdictResources {
  @Resource({
    uri:      'video://verdicts/{video_id}',
    name:     'Video Verdict — Single',
    description:
      'Returns VideoVerdict for a video_id. Contains final_score (0–100), band (HIGH/MODERATE/WEAK/DISMISS), ' +
      'full score breakdown, evidence from all 3 agents, reasoning narrative, and contrarian/consensus label. ' +
      'Written by Person 4 Confidence Aggregator.',
    mimeType: 'application/json',
  })
  async getVerdict(uri: string, ctx: ExecutionContext) {
    const videoId = uri.replace('video://verdicts/', '');
    ctx.logger.info('video://verdicts: read single', { videoId });
    const verdict = readVerdict(videoId);
    return {
      contents: [{
        uri, mimeType: 'application/json',
        text: JSON.stringify(
          verdict ?? { error: `No verdict for video_id "${videoId}". Run aggregate_video_confidence first.` },
          null, 2
        ),
      }],
    };
  }

  @Resource({
    uri:      'video://verdicts',
    name:     'Video Verdicts — All',
    description:
      'Returns all VideoVerdict objects, sorted by final_score descending. ' +
      'Each entry is the aggregated confidence output for one submitted video URL. ' +
      'Used by the widget to display the ranked list of stock prediction signals.',
    mimeType: 'application/json',
  })
  async getAllVerdicts(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('video://verdicts: read all');
    const verdicts = readAllVerdicts().sort((a, b) => b.final_score - a.final_score);
    return {
      contents: [{
        uri, mimeType: 'application/json',
        text: JSON.stringify({ count: verdicts.length, verdicts }, null, 2),
      }],
    };
  }
}
