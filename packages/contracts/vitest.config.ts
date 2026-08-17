import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions', 'junit'] : ['default'],
    outputFile: process.env.GITHUB_ACTIONS ? { junit: './test-results.xml' } : undefined,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js',
        'node_modules/**',
        'dist/**',
        'coverage/**',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
