import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Runtime source uses `.js` import specifiers (required for emitted Node ESM).
 * This plugin maps `./foo.js` → `./foo.ts` so Vitest can resolve TS sources.
 */
export default defineConfig({
  plugins: [
    {
      name: 'resolve-js-to-ts',
      enforce: 'pre',
      resolveId(source: string, importer?: string) {
        if (importer && source.endsWith('.js') && (source.startsWith('./') || source.startsWith('../'))) {
          const tsPath = resolve(dirname(importer), source.replace(/\.js$/, '.ts'));
          if (existsSync(tsPath)) return tsPath;
        }
        return null;
      },
    },
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
