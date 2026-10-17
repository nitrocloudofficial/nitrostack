import { readFile } from 'node:fs/promises';
import { assetPath } from '../shared/assets.js';
let cached: Promise<string[]> | undefined;

/** The bundled list of popular npm names used for look-alike checks (read once). */
export function loadPopularPackages(): Promise<string[]> {
  cached ??= readFile(assetPath('modules/analysis/data/popular-packages.json'), 'utf8')
    .then((text) => JSON.parse(text) as string[])
    .catch((err) => {
      cached = undefined;
      throw err;
    });
  return cached;
}
