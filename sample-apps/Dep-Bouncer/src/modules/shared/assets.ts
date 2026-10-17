import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Root of the running code: `src/` under tsx, `dist/` after a build. */
const codeRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Absolute path of a bundled data file, given its path relative to `src/`. Looks next to the
 * running code first (the postbuild step copies data into dist/), then in `src/`, which is
 * always deployed, so the server finds its data however the host built it.
 */
export function assetPath(srcRelative: string): string {
  const candidates = [join(codeRoot, srcRelative), join(process.cwd(), 'src', srcRelative)];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}
