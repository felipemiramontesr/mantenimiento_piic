import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // FC 082 F0c — @mantenimiento/contracts salió de dependencies (el npm de
      // Hostinger no soporta workspace:*); esbuild lo inlinea vía --alias y
      // aquí vitest lo resuelve directo a la fuente del workspace.
      '@mantenimiento/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    hookTimeout: 15000,
    testTimeout: 15000,
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
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js',
        'node_modules/**',
        'dist/**',
        'coverage/**',
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
