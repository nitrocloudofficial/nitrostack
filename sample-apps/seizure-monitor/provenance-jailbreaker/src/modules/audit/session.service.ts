import { Injectable } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface Session {
  sessionId: string;
  declaredScope: string;
  createdAt: string;
  updatedAt: string;
}

function getLogPath(): string {
  return process.env['SESSION_LOG_PATH'] ?? path.join(process.cwd(), 'data', 'sessions.jsonl');
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readAll(filePath: string): Session[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l) as Session);
}

function writeAll(filePath: string, sessions: Session[]): void {
  ensureDir(filePath);
  fs.writeFileSync(filePath, sessions.map((s) => JSON.stringify(s)).join('\n') + '\n', 'utf-8');
}

/**
 * SessionService — disk-backed JSONL session store.
 *
 * Each session records:
 *   - sessionId  : UUID v4 generated on create
 *   - declaredScope : the red-team scope string locked at session start
 *   - createdAt  : ISO timestamp
 *   - updatedAt  : ISO timestamp (updated when scope is changed)
 *
 * The file path defaults to ./data/sessions.jsonl and can be overridden
 * via SESSION_LOG_PATH env var.
 */
@Injectable()
export class SessionService {
  /**
   * Create a new session with the given declared scope.
   * Returns the full Session object including the generated sessionId.
   */
  create(declaredScope: string): Session {
    const logPath = getLogPath();
    const sessions = readAll(logPath);

    const session: Session = {
      sessionId: crypto.randomUUID(),
      declaredScope,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    sessions.push(session);
    writeAll(logPath, sessions);
    return session;
  }

  /**
   * Retrieve a session by its sessionId.
   * Returns null if not found.
   */
  get(sessionId: string): Session | null {
    const sessions = readAll(getLogPath());
    return sessions.find((s) => s.sessionId === sessionId) ?? null;
  }

  /**
   * List all sessions, most-recent first.
   */
  list(): Session[] {
    const sessions = readAll(getLogPath());
    return sessions.slice().reverse();
  }

  /**
   * Update a session's declaredScope in-place.
   * Returns the updated session or null if not found.
   */
  updateScope(sessionId: string, declaredScope: string): Session | null {
    const logPath = getLogPath();
    const sessions = readAll(logPath);
    const idx = sessions.findIndex((s) => s.sessionId === sessionId);
    if (idx === -1) return null;

    sessions[idx] = {
      ...sessions[idx],
      declaredScope,
      updatedAt: new Date().toISOString()
    };

    writeAll(logPath, sessions);
    return sessions[idx];
  }
}
