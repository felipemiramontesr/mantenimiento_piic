/* eslint-disable no-underscore-dangle */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable no-underscore-dangle */

/**
 * Resuelve la versión del sistema en build-time — nunca hardcodeada.
 * Cadena de resolución: env ARCHON_VERSION → último commit (V.x.y.z_Desc) → package.json raíz.
 */
function resolveArchonVersion(): string {
  if (process.env.ARCHON_VERSION) return process.env.ARCHON_VERSION;
  try {
    const subject = execSync('git log -1 --pretty=%s', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const match = subject.match(/^V\.(\d+\.\d+\.\d+)/);
    if (match) return match[1];
  } catch {
    // sin repositorio git en el entorno de build — usar fallback
  }
  const rootPkg = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
  ) as { version: string };
  return rootPkg.version;
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __ARCHON_VERSION__: JSON.stringify(resolveArchonVersion()),
  },
  plugins: [
    react(),
    ...(process.env.ANALYZE
      ? [visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true })]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/v1\/catalogs\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'archon-catalogs-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 semana
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Archon ERP',
        short_name: 'Archon',
        description: 'Archon ERP Progressive Web App',
        theme_color: '#0F2A44',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    vmMemoryLimit: '3GB',
    testTimeout: 15000,
    clearMocks: true,
    mockReset: true,
    teardownTimeout: 1000,
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions', 'junit'] : ['default'],
    outputFile: process.env.GITHUB_ACTIONS ? { junit: './test-results.xml' } : undefined,
    setupFiles: './src/test/setup.ts',
    globalTeardown: './src/test/globalTeardown.ts',
    pool: 'threads',
    // Vitest 4: poolOptions.threads.{min,max}Threads fue reemplazado por
    // maxWorkers a nivel raíz — minThreads ya no tiene efecto en la ejecución.
    maxWorkers: process.env.GITHUB_ACTIONS ? 1 : 2,
    logHeapUsage: true,
    coverage: {
      provider: 'v8',
      // Vitest 4: `coverage.all` fue removido — `include` reemplaza su función de
      // escanear todo el árbol; `exclude` abajo sigue aplicando exactamente igual.
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/main.tsx' /* Bootstrap y anclaje al DOM */,
        'src/vite-env.d.ts' /* Tipado estandar de Vite */,
        'src/types/**' /* Declaraciones de tipado */,
        'src/App.tsx' /* Router manager (test via E2E) */,
        '*.config.js' /* Archivos de configuracion como Tailwind */,
        'dist/**' /* Build artifacts compilados */,
        'vite.config.ts' /* Configuracion de build */,
        /* === Contextos y Proveedores (lifecycle + localStorage + window = E2E) === */
        /* AuthContext.tsx removido del exclude (FC 070 v1.2): tiene suite unitaria
           propia al 100% en las 4 metricas desde el fix de la race condition. */
        'src/context/FleetContext.tsx' /* Orquestador de estado con API (test via E2E) */,
        'src/context/UserContext.tsx' /* Proveedor de identidad (test via E2E) */,
        'src/api/client.ts' /* Interceptores Axios con window.location (test via E2E) */,
        /* === Paginas y Layouts === */
        'src/pages/Dashboard/Layout.tsx' /* Shell de navegacion (test via E2E) */,
        'src/pages/Auth/Login.tsx' /* Flujo de autenticacion (test via E2E) */,
        'src/pages/Dashboard/FleetModule.tsx' /* Orquestador de flota (test via E2E) */,
        'src/pages/Dashboard/RoutesModule.tsx' /* Orquestador de rutas (test via E2E) */,
        'src/pages/Dashboard/ArchonCenter.tsx' /* Dashboard KPI central (test via E2E) */,
        'src/pages/Dashboard/FinancialHealthModule.tsx' /* Modulo financiero (test via E2E) */,
        'src/pages/Dashboard/UsersModule.tsx' /* Modulo de usuarios (test via E2E) */,
        /* === Componentes de Navegacion === */
        'src/components/Navigation/ArchonTopBar.tsx' /* Barra de identidad (test via E2E) */,
        /* === Componentes Complejos (500+ lineas, UI pura) === */
        /* FC162 F1-T2 (Cond.R-162-F1): 'Identity/**' era un glob de directorio
           completo — auditado archivo por archivo (162_evidence/f1/inventory.md).
           4 de los 5 archivos ya tenían test real (AlertsPanel/ArchonProfilePanel/
           AreasPanel/OwnerProfilePanel), atrapado por el exclude. Reducido a lista
           explícita del único archivo sin test real. */
        'src/components/Identity/AccessControlSlideOver.tsx' /* Sin test dedicado — gap genuino, Fase 2 */,
        'src/components/Fleet/FleetKpiMatrix.tsx' /* Dashboard KPI (test via E2E) */,
        'src/components/Fleet/FleetRegistrationForm.tsx' /* Formulario complejo (test via E2E) */,
        'src/components/ArchonDatePicker.tsx' /* Calendario visual (test via E2E) */,
        /* FC162 F1-T2: 'RouteAssignment/**' era un glob de directorio completo —
           auditado archivo por archivo. 4 de 7 archivos ya tenían test real
           (RouteClosurePanel/RouteTelemetryPanel/useRouteAssignmentControl +
           hydrationCertification); types.ts es solo tipos, sin lógica ejecutable.
           Reducido a lista explícita de los 3 sin test real. RouteManagementCards.tsx
           (exclude previo) ya no existe en el árbol — entrada muerta, eliminada. */
        'src/components/Routes/RouteAssignment/ArchonGeoSelector.tsx' /* Sin test dedicado — gap genuino, Fase 2 */,
        'src/components/Routes/RouteAssignment/RouteIdentityPanel.tsx' /* Sin test dedicado — gap genuino, Fase 2 */,
        'src/components/Routes/RouteAssignment/RouteMissionPanel.tsx' /* Sin test dedicado — gap genuino, Fase 2 */,
        /* === Formularios complejos (wizard state + 400+ lines, test via E2E) === */
        'src/components/Maintenance/MaintenanceRegistrationForm.tsx' /* Formulario 655 líneas (test via E2E) */,
        'src/components/Maintenance/MaintenanceCompletionPanel.tsx' /* Panel de cierre complejo (test via E2E) */,
        /* === Componentes UI con variantes complejas === */
        'src/components/UI/ArchonManagementCard.tsx' /* Card con 7 variantes cromáticas (test via E2E) */,
        /* === Vistas de grilla y pronóstico de mantenimiento (mismo patrón que FleetKpiMatrix) === */
        'src/components/Maintenance/MaintenanceForecastView.tsx' /* Vista de pronósticos 372 líneas (test via E2E) */,
        /* === Build artifacts y directorios de trabajo === */
        '**/*.cjs' /* Archivos CommonJS generados por herramientas de build */,
        '**/scratch/**' /* Directorio de trabajo temporal */,
        /* === Test infrastructure === */
        'src/test/handlers.ts' /* MSW handlers (infraestructura de test) */,
        'src/test/globalTeardown.ts' /* Limpieza global de test (infraestructura) */,
        'src/test/polyfills.ts' /* Polyfills de browser (infraestructura) */,
        'src/scripts/**' /* Scripts de utilidad (no forman parte del runtime) */,
        /* === Herramientas de diagnóstico y admin === */
        'src/ArchonDoctor.tsx' /* Tool de diagnóstico de admin (test via E2E) */,
        'src/api/navigation.ts' /* Redirección via window.location (E2E por naturaleza) */,
        'src/components/Common/AuditJustificationModal.tsx' /* Modal de auditoría (test via E2E) */,
        /* === Módulo financiero (módulo padre ya excluido) === */
        /* FC162 F1-T2: 'Finance/**' era un glob de directorio completo — auditado
           archivo por archivo. 2 de 4 archivos ya tenían test real (EgressTable/
           PeriodRangePicker), atrapado por el exclude. Reducido a lista explícita
           de los 2 sin test real. */
        'src/components/Finance/EgressRegistrationModal.tsx' /* Sin test dedicado — gap genuino, Fase 2 */,
        'src/components/Finance/FinancialDashboard.tsx' /* Sin test dedicado — gap genuino, Fase 2 */,
        /* === Branding y logos (JSX estático sin lógica) === */
        'src/components/Logo/**' /* Componentes SVG de identidad visual */,
        /* === Shells de navegación adicionales === */
        'src/components/Navigation/SovereignSubheader.tsx' /* Sub-header de layout (test via E2E) */,
        'src/components/Navigation/SovereignFooter.tsx' /* Footer de layout (test via E2E) */,
        /* === Utilidades con APIs de browser no disponibles en jsdom === */
        'src/utils/imageUtils.ts' /* Canvas 2D API — jsdom no soporta contexto real */,
        /* === Componentes de analytics (visual-only) === */
        'src/components/Dashboard/CategoryAnalyticsCard.tsx' /* KPI analytics (test via E2E) */,
      ],
      // FC162 F1-T2 (Cond.R-162-F1, dictamen Alfa 194_AN / Bravo 195_AN):
      // recalibrado tras remover 3 globs de directorio completo del exclude
      // (Finance/**, Identity/**, RouteAssignment/**) — 8 de los archivos que
      // quedaron destapados YA tienen test real pero cobertura parcial
      // (FleetGridView ~60%, RouteLogTable ~62%, ForensicJournalTable ~58%,
      // useRouteAssignmentControl ~49%, CommentThread ~48%, ReviewsPanel ~48%,
      // ProfileView ~38%, entre otros) — no es una regresión de código, es una
      // expansión honesta de la superficie medida (antes invisible para Vitest
      // Y para Sonar). Piso recalibrado al valor real medido −2pp (mismo
      // patrón que la nota de FC083 H5 arriba). Fase 2 de FC162 cierra estos
      // gaps con tests nuevos — el piso solo puede subir desde aquí, nunca
      // bajar más. Medido post-F1-T2: Statements 74.02% / Branches 66.44% /
      // Functions 68.5% / Lines 75.59%.
      thresholds: {
        lines: 73,
        functions: 66,
        branches: 64,
        statements: 72,
      },
    },
  },
});
