import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // EmitterService copies the pre-warmed skeleton (node_modules + a built
    // widgets subproject, ~400MB) on every emit — that's a real filesystem
    // operation, not something to mock away, and it can exceed vitest's
    // 30s default depending on disk speed. forge.tools tests run the full
    // emit+verify pipeline (spawns tsc/build/boot as child processes) on
    // top of that.
    testTimeout: 120_000,
  },
});
