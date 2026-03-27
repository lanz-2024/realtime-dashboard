import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/lib/data/**', 'src/lib/ws/protocol.ts'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'tests/e2e/**',
        '**/*.config.*',
        '**/types.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 40,
        functions: 50,
        branches: 50,
        statements: 40,
      },
    },
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
