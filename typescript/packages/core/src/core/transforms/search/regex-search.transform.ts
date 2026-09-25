import { Worker } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Tool } from '../../tool.js';
import { BaseSearchTransform } from './base-search.transform.js';
import { SearchTransformOptions } from './types.js';

/** Upper bound on an opted-in regex query. */
const MAX_REGEX_PATTERN_LENGTH = 200;
/** A match that is still running after this is treated as catastrophic and abandoned. */
const REGEX_MATCH_TIMEOUT_MS = 50;
/** Concurrent off-thread matches. Further queries fall back to a literal search. */
const MAX_REGEX_WORKERS = 4;
/** Timeouts in a row after which opted-in regex stays literal until the cooldown. */
const REGEX_TIMEOUTS_BEFORE_LITERAL = 3;
/** After this quiet period a disabled transform may use the worker again. */
export const REGEX_TIMEOUT_COOLDOWN_MS = 60_000;

let regexWorkersInflight = 0;
let regexWorkersPeak = 0;

type RegexWorkerFactory = (
  filename: string,
  options: { workerData: { pattern: string; fields: string[] }; resourceLimits: { maxOldGenerationSizeMb: number } }
) => Worker;

let regexWorkerFactory: RegexWorkerFactory = (filename, options) => new Worker(filename, options);

/** Test hook: replace worker construction. Pass undefined to restore the real Worker. */
export function setRegexWorkerFactoryForTests(factory?: RegexWorkerFactory): void {
  regexWorkerFactory = factory ?? ((filename, options) => new Worker(filename, options));
}

/** Test hook: highest concurrent regex workers since the last reset. */
export function regexWorkerPeak(): number {
  return regexWorkersPeak;
}

/** Test hook. */
export function resetRegexWorkerStats(): void {
  regexWorkersPeak = 0;
}

function tryAcquireRegexWorker(): boolean {
  if (regexWorkersInflight >= MAX_REGEX_WORKERS) return false;
  regexWorkersInflight += 1;
  regexWorkersPeak = Math.max(regexWorkersPeak, regexWorkersInflight);
  return true;
}

function releaseRegexWorker(): void {
  regexWorkersInflight = Math.max(0, regexWorkersInflight - 1);
}

/**
 * Runs `new RegExp(pattern, 'i')` against every field off the server event loop.
 * Returns null when the pattern is invalid or the match does not finish in time,
 * so the caller can fall back to a literal substring search.
 */
function regexWorkerScript(): string | undefined {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, 'regex-match.worker.js'),
    path.resolve(process.cwd(), 'dist/core/transforms/search/regex-match.worker.js'),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

type OffThreadMatch =
  | { status: 'hit'; hits: boolean[] }
  | { status: 'timeout' }
  | { status: 'skip' };

function matchRegexOffThread(pattern: string, fields: string[]): Promise<OffThreadMatch> {
  const script = regexWorkerScript();
  if (!script) return Promise.resolve({ status: 'skip' });
  if (!tryAcquireRegexWorker()) return Promise.resolve({ status: 'skip' });

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = regexWorkerFactory(script, {
        workerData: { pattern, fields },
        resourceLimits: { maxOldGenerationSizeMb: 32 },
      });
    } catch {
      releaseRegexWorker();
      resolve({ status: 'skip' });
      return;
    }

    let settled = false;
    let released = false;
    let exitWatch: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      if (released) return;
      released = true;
      if (exitWatch) clearTimeout(exitWatch);
      releaseRegexWorker();
    };

    // The slot stays taken until the thread is gone. Releasing on the timer
    // lets the next query spawn another worker while this one is still matching.
    worker.once('exit', () => release());

    const resolveCaller = (outcome: OffThreadMatch) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };

    const stopWorker = () => {
      void worker.terminate().catch(() => undefined);
      if (released || exitWatch) return;
      exitWatch = setTimeout(() => {
        console.warn(
          'Regex worker did not exit after terminate; its slot stays occupied until exit',
        );
      }, 1000);
    };

    const timer = setTimeout(() => {
      resolveCaller({ status: 'timeout' });
      stopWorker();
    }, REGEX_MATCH_TIMEOUT_MS);
    worker.once('message', (msg: { ok?: boolean; hits?: boolean[] }) => {
      resolveCaller(
        msg?.ok && Array.isArray(msg.hits)
          ? { status: 'hit', hits: msg.hits }
          : { status: 'skip' },
      );
      stopWorker();
    });
    worker.once('error', () => {
      resolveCaller({ status: 'skip' });
      stopWorker();
    });
  });
}

interface ToolSearchMetadata {
  name: string;
  title: string;
  description: string;
  paramKeywords: string;
}

export class RegexSearchTransform extends BaseSearchTransform {
  readonly name = 'RegexSearchTransform';
  private toolsList: Tool[] = [];
  private toolMetadata: Map<string, ToolSearchMetadata> = new Map();
  private consecutiveRegexTimeouts = 0;
  private regexDisabledUntil = 0;

  constructor(options: SearchTransformOptions = {}) {
    super(options);
  }

  protected updateIndex(tools: Tool[], _hash: string): void {
    const toolMetadata = new Map<string, ToolSearchMetadata>();

    for (const tool of tools) {
      let paramKeywords = '';
      const schema = tool.inputSchema as any;
      if (schema) {
        if (schema.properties && typeof schema.properties === 'object') {
          for (const [key, prop] of Object.entries(schema.properties)) {
            paramKeywords += ` ${key}`;
            if (prop && typeof prop === 'object' && (prop as any).description) {
              paramKeywords += ` ${(prop as any).description}`;
            }
          }
        } else {
          // Extract Zod schema shape properties if available
          const shape =
            typeof schema._def?.shape === 'function'
              ? schema._def.shape()
              : schema.shape || schema._def?.shape;
          if (shape && typeof shape === 'object') {
            for (const [key, prop] of Object.entries(shape)) {
              paramKeywords += ` ${key}`;
              if (prop && typeof prop === 'object' && (prop as any).description) {
                paramKeywords += ` ${(prop as any).description}`;
              }
            }
          }
        }
      }

      toolMetadata.set(tool.name, {
        name: tool.name,
        title: (tool as any).title || '',
        description: tool.description || '',
        paramKeywords,
      });
    }

    this.toolsList = tools;
    this.toolMetadata = toolMetadata;
  }

  protected async search(query: string, limit: number): Promise<Tool[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const rows: ToolSearchMetadata[] = [];
    const fields: string[] = [];
    for (const tool of this.toolsList) {
      const meta = this.toolMetadata.get(tool.name);
      if (!meta) continue;
      rows.push(meta);
      fields.push(meta.name, meta.title, meta.description, meta.paramKeywords);
    }

    const hits = await this.matchFields(query, fields);

    const matches: Tool[] = [];
    for (let i = 0; i < rows.length; i++) {
      const meta = rows[i];
      const base = i * 4;
      const hit =
        hits[base] ||
        (meta.title ? hits[base + 1] : false) ||
        hits[base + 2] ||
        hits[base + 3];

      if (hit) {
        const tool = this.toolsList.find((candidate) => candidate.name === meta.name);
        if (!tool) continue;
        matches.push(tool);
        if (matches.length >= limit) break;
      }
    }

    return matches;
  }

  private regexMatchingDisabled(): boolean {
    if (this.consecutiveRegexTimeouts < REGEX_TIMEOUTS_BEFORE_LITERAL) return false;
    if (Date.now() >= this.regexDisabledUntil) {
      this.consecutiveRegexTimeouts = 0;
      this.regexDisabledUntil = 0;
      return false;
    }
    return true;
  }

  /**
   * The query reaches us straight from the MCP client. Compiling it on the server
   * thread hands the caller an event-loop stall via catastrophic backtracking.
   * Literal substring matching is the default. Opt-in regex runs in a worker and
   * falls back to a literal match when the pattern is invalid or does not finish.
   */
  private async matchFields(query: string, fields: string[]): Promise<boolean[]> {
    if (
      this.options.allowRegex &&
      !this.regexMatchingDisabled() &&
      query.length > 0 &&
      query.length <= MAX_REGEX_PATTERN_LENGTH
    ) {
      const timed = await matchRegexOffThread(query, fields);
      if (timed.status === 'hit' && timed.hits.length === fields.length) {
        this.consecutiveRegexTimeouts = 0;
        this.regexDisabledUntil = 0;
        return timed.hits;
      }
      if (timed.status === 'timeout') {
        this.consecutiveRegexTimeouts += 1;
        if (this.consecutiveRegexTimeouts >= REGEX_TIMEOUTS_BEFORE_LITERAL) {
          this.regexDisabledUntil = Date.now() + REGEX_TIMEOUT_COOLDOWN_MS;
        }
      }
    }

    const needle = query.toLowerCase();
    return fields.map((field) => field.toLowerCase().includes(needle));
  }
}
