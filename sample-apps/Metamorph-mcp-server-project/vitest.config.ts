import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // local helper worktrees live under .claude/; never test them from the main checkout
    exclude: ['**/node_modules/**', '.claude/**', 'src/widgets/**']
  }
});
