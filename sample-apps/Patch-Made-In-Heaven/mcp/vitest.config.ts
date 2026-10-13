import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'src/widgets'],
    // Integration tests exercise real, shared host state (the container runtime's
    // process/name namespace, the OS temp directory) — running test files in
    // parallel lets one file's containers/tempdirs be picked up by another
    // file's global-state assertions. Unit tests are cheap enough that running
    // them file-serial too costs nothing measurable.
    fileParallelism: false,
  },
});
