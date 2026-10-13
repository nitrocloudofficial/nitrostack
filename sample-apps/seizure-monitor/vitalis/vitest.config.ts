import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/widgets/**',
        // Controllers are thin NitroStack adapters; business logic and the
        // runtime gateway are covered directly and through MCP integration.
        'src/modules/**/*.tools.ts',
        'src/modules/core/core.prompts.ts',
        'src/modules/drugs/drugs.resources.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 60,
        statements: 70,
        branches: 50,
      },
    },
  },
});
