import { Injectable } from '@nitrostack/core';
import { appendFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ActivityEventSchema, type ActivityEvent } from '../contracts/activity.contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/observability/ -> repo root -> .forge/activity.log
const FORGE_DIR = join(__dirname, '..', '..', '.forge');
const LOG_PATH = join(FORGE_DIR, 'activity.log');

/**
 * Append-only JSONL writer. Fire-and-forget by design — a logging failure
 * must never propagate into a tool/resource/prompt handler. The console
 * (a separate process) tails this file directly; it never talks to this
 * service.
 */
@Injectable()
export class ActivityService {
  private dirReady = false;

  private async ensureDir(): Promise<void> {
    if (this.dirReady) return;
    await mkdir(FORGE_DIR, { recursive: true }).catch(() => {});
    this.dirReady = true;
  }

  async record(event: ActivityEvent): Promise<void> {
    try {
      const parsed = ActivityEventSchema.parse(event);
      await this.ensureDir();
      await appendFile(LOG_PATH, JSON.stringify(parsed) + '\n', 'utf-8');
    } catch {
      // Never let logging failure propagate into a handler.
    }
  }
}
