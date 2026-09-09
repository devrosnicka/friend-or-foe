import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/engine/src/**'],
      reporter: ['text', 'html'],
      // Engine je čistá logika bez závislostí — na plné pokrytí má nárok.
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
