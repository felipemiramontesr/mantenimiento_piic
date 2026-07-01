/* eslint-disable no-underscore-dangle */
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable no-underscore-dangle */

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    hookTimeout: 15000,
    testTimeout: 15000,
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', 'github-actions', 'junit']
      : ['default', path.resolve(__dirname, '../../scripts/vitestHandoffReporter.ts')],
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
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        'scratch/**',
      ],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30,
      },
    },
  },
});
