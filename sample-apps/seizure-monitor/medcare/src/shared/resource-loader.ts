/**
 * Resource Loader — Family MedCare Ecosystem
 *
 * Shared utility to resolve resource file paths and load JSON data.
 * Replaces the duplicated getResourcePath() helper that was copy-pasted
 * across 5+ files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the absolute path to a file inside the `resources/` directory.
 *
 * Strategy:
 * 1. Try `<cwd>/resources/<filename>` (works in both dev and prod when cwd
 *    is the project root).
 * 2. Fallback: resolve relative to this compiled file's directory
 *    (`dist/shared/` → `../../resources/`).
 */
export function getResourcePath(filename: string): string {
  // cwd-relative (primary)
  const cwdPath = path.join(process.cwd(), 'resources', filename);
  if (fs.existsSync(cwdPath)) return cwdPath;

  // Fallback: relative to compiled output
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..', 'resources', filename);
}

// ---------------------------------------------------------------------------
// JSON Loader
// ---------------------------------------------------------------------------

/**
 * Loads and parses a JSON resource file with strong typing.
 *
 * @param filename — file name inside `resources/` (e.g., `patient_profile.json`)
 * @param label — human-readable label for error messages (e.g., `patient profiles`)
 * @returns Parsed JSON cast to type `T`
 * @throws Error with descriptive message if file cannot be read or parsed
 */
export function loadJSON<T>(filename: string, label: string): T {
  const filePath = getResourcePath(filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(
      `Failed to load ${label}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Writes JSON data back to a resource file.
 *
 * @param filename — file name inside `resources/` (e.g., `patient_profile.json`)
 * @param data — the data to serialize
 * @param label — human-readable label for error messages
 */
export function writeJSON<T>(filename: string, data: T, label: string): void {
  const filePath = getResourcePath(filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to write ${label}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
