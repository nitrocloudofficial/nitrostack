/**
 * Safe JSON Data Loader — Resolves embedded JSON dataset files across dev/test/dist execution environments.
 * ESM compatible (using import.meta.url instead of __dirname).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadDataJson<T = any>(filename: string): T {
  const possiblePaths = [
    path.join(process.cwd(), 'dist', 'data', filename),
    path.join(process.cwd(), 'src', 'data', filename),
    path.join(process.cwd(), 'data', filename),
    path.resolve(__dirname, '..', 'data', filename),
    path.resolve(__dirname, '..', '..', 'data', filename),
    path.resolve(__dirname, '..', '..', 'src', 'data', filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) as T;
      } catch {
        // Try next path
      }
    }
  }

  throw new Error(`[loadDataJson] Fatal: Data file "${filename}" could not be located in any standard search path.`);
}
