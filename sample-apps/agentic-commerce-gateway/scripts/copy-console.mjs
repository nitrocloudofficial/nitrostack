#!/usr/bin/env node
/**
 * Copies the seller console into `dist/` after the TypeScript build.
 *
 * `tsc` only emits compiled modules, so a loose .html asset would never reach
 * `dist/` on its own — the same reason the fixtures are authored as .ts. The
 * console is a single self-contained file, so a copy is enough; it lands beside
 * its compiled route handler, which resolves it relative to `import.meta.url`.
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(ROOT, 'console', 'index.html');
const destDir = path.join(ROOT, 'dist', 'console');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, path.join(destDir, 'index.html'));

console.log('✓ Console copied to dist/console/index.html');
