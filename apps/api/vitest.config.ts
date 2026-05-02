import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions', 'junit'] : ['default'],
    outputFile: process.env.GITHUB_ACTIONS ? { junit: './test-results.xml' } : undefined,
    env: {
      DB_ENCRYPTION_KEY: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      JWT_SECRET: 'test-secret-pinnacle-archon-2026',
    },
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/index.ts' /* Bootstrap puro, inaccesible unitariamente sin lanzar puerto */,
        'src/scripts/**' /* Scripts de utilidad CLI que se prueban mediante bash */,
        'src/types/**' /* Declaraciones de tipado */,
        '**/*.config.ts',
        '**/*.config.js',
        'node_modules/**',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 98,
        statements: 100,
      },
    },
  },
});
