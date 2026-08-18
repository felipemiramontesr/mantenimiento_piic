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
      // Vitest 4: `coverage.all` fue removido — `include` reemplaza su función de
      // escanear todo el árbol; `exclude` abajo sigue aplicando exactamente igual.
      include: ['src/**/*.ts'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        // FC162 F1-T7 (Cond.R-162-F1, dictamen Alfa 194_AN / Bravo 195_AN):
        // 'src/index.ts' salió del exclude completo -- solo tenía bootstrap
        // puro (auto-start listen()/cron) en el tramo ya guardado con
        // `// v8 ignore start/stop` a nivel de código (línea 338+); el resto
        // (registerCorePlugins/registerObservabilityHooks/registerV1Routes/...)
        // es lógica real de seguridad (CORS/CSP/rate-limit/error-handler) que
        // TODO test de ruta existente ya ejecuta indirectamente vía
        // `buildApp()` -- excluirlo entero ocultaba esa cobertura real.
        // FC162 F3 (100% mandatorio, Ω): 'src/scripts/**' removido -- misclasificado,
        // mismo patrón que apps/web F1/F3. seedAData/seedBData/seedCData.ts ya tenían
        // test real (seedingA/B/C.test.ts, 34 tests) nunca conectado al lcov.
        'src/types/**' /* Declaraciones de tipado */,
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js',
        'node_modules/**',
        'dist/**',
        'coverage/**',
      ],
      // FC162 F1-T8 (Cond.R-162-F1): ratchet desde 30/30/20/30 (piso histórico
      // sin relación con la cobertura real) tras F1-T2..T7 (repos de rutas/
      // cosmology testeados, index.ts fuera del exclude ciego). Medido:
      // Statements 98.71% / Branches 96.95% / Functions 99.02% / Lines 99.1%.
      // Piso con margen de seguridad, no clavado al techo medido — solo puede
      // subir desde aquí (Scenario 4, 162_FC).
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
});
