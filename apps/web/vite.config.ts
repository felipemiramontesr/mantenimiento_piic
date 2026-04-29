import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions', 'junit'] : ['default'],
    outputFile: process.env.GITHUB_ACTIONS ? { junit: './test-results.xml' } : undefined,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/main.tsx' /* Bootstrap y anclaje al DOM */,
        'src/vite-env.d.ts' /* Tipado estandar de Vite */,
        'src/types/**' /* Declaraciones de tipado */,
        'src/App.tsx' /* Router manager (test via E2E) */,
        '*.config.js' /* Archivos de configuracion como Tailwind */,
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
