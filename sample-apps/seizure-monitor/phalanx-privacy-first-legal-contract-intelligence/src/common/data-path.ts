import { defaultLogger } from '@nitrostack/core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a file under the project's `data/` directory.
 *
 * The same source tree runs from two places — `src/` under `nitrostack dev` and
 * `dist/` after `npm run build` — and the data files live in `src/data/`. Rather
 * than assume one layout, walk the candidates and return the first that exists.
 * Returns null when the file is genuinely absent so callers can decide whether
 * that is fatal or just degrades a feature.
 */
export function resolveDataFile(filename: string): string | null {
  const candidates = [
    // running from src/common/ (dev)
    path.resolve(__dirname, '..', 'data', filename),
    // built output / nitrostack bundle
    path.resolve(__dirname, '..', 'src', 'data', filename),
    path.resolve(__dirname, '..', '..', 'src', 'data', filename),
    path.resolve(process.cwd(), 'src', 'data', filename),
    
    // fallbacks to root data
    path.resolve(__dirname, '..', '..', 'data', filename),
    path.resolve(process.cwd(), 'data', filename)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Read and parse a JSON file from `data/`, or return `fallback` if absent/invalid. */
export function loadDataJson<T>(filename: string, fallback: T): T {
  const resolved = resolveDataFile(filename);
  if (!resolved) {
    defaultLogger.warn(`[data] ${filename} not found in any known data directory — using fallback.`);
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8')) as T;
  } catch (err) {
    defaultLogger.warn(`[data] ${filename} failed to parse (${(err as Error).message}) — using fallback.`);
    return fallback;
  }
}
