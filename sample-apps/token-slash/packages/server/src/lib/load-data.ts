import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves data file paths for both dev (tsx/src) and production (dist) runs.
 * JSON lives in src/data/ and is copied to dist/data/ on build.
 */
export function resolveDataPath(filename: string): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(moduleDir, '../data', filename),
    join(moduleDir, '../../src/data', filename),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Data file "${filename}" not found. Checked:\n${candidates.join('\n')}`,
  );
}

export function loadJsonData<T>(filename: string): T {
  const path = resolveDataPath(filename);
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}
