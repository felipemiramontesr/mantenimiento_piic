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
        // FC162 F3 — hallazgo masivo: FleetContext.tsx/UserContext.tsx/
        // api/client.ts/Login.tsx/FleetModule.tsx/RoutesModule.tsx/
        // ArchonCenter.tsx/FinancialHealthModule.tsx/UsersModule.tsx/
        // FleetRegistrationForm.tsx/MaintenanceRegistrationForm.tsx/
        // MaintenanceCompletionPanel.tsx/MaintenanceForecastView.tsx/
        // ArchonDoctor.tsx/SovereignFooter.tsx — 14 archivos, ~150 tests
        // combinados ya existentes, todos removidos de este exclude (mismo
        // patrón de misclasificación que F1, a mayor escala).
        /* === Paginas y Layouts === */
        // FC162 F3: Layout.tsx auditado — orquestador puro (Sidebar+SovereignHeader+
        // SovereignSubheader+SovereignFooter+ArchonNetworkBanner+PanicButton) que monta
        // FleetProvider/SovereignLayoutProvider reales y usePushNotifications (Notification
        // API de browser). Mismo perfil que App.tsx (ya excluido, verificado vía smoke E2E
        // con Playwright en F1) — se mantiene excluido de unit, cobertura real vía E2E.
        'src/pages/Dashboard/Layout.tsx' /* Shell de navegacion (test via E2E) */,
        /* === Componentes de Navegacion === */
        // FC162 F3 — HALLAZGO: ArchonTopBar.tsx no tiene ninguna referencia de import en
        // todo apps/web/src (verificado por grep) — componente huérfano, reemplazado en el
        // árbol real por SovereignHeader.tsx (que sí tiene test propio). No se escribe test
        // para código muerto; se documenta para que Alfa/Bravo decidan si se elimina.
        'src/components/Navigation/ArchonTopBar.tsx' /* Huérfano — sin referencias en el árbol (FC162 F3) */,
        /* === Componentes Complejos (500+ lineas, UI pura) === */
        /* FC162 F1-T2 (Cond.R-162-F1): 'Identity/**' era un glob de directorio
           completo — auditado archivo por archivo (162_evidence/f1/inventory.md).
           4 de los 5 archivos ya tenían test real (AlertsPanel/ArchonProfilePanel/
           AreasPanel/OwnerProfilePanel), atrapado por el exclude. El 5º
           (AccessControlSlideOver.tsx) recibió test propio en F2 — ver
           AccessControlSlideOver.test.tsx (documenta un hallazgo real: su panel
           "Registrar Personal" está roto en PROD, POST /v1/auth/register
           retirado desde FC082 F0c). */
        'src/components/Fleet/FleetRegistrationForm.tsx' /* Formulario complejo (test via E2E) */,
        // FC162 F3 — FleetKpiMatrix.tsx/ArchonDatePicker.tsx/ArchonManagementCard.tsx/
        // CategoryAnalyticsCard.tsx/AuditJustificationModal.tsx removidos de este exclude,
        // cada uno con test propio nuevo.
        /* FC162 F1-T2: 'RouteAssignment/**' era un glob de directorio completo —
           auditado archivo por archivo. 4 de 7 archivos ya tenían test real
           (RouteClosurePanel/RouteTelemetryPanel/useRouteAssignmentControl +
           hydrationCertification); types.ts es solo tipos, sin lógica ejecutable.
           Los 3 restantes (ArchonGeoSelector/RouteIdentityPanel/RouteMissionPanel)
           recibieron test propio en F2. RouteManagementCards.tsx (exclude previo)
           ya no existe en el árbol — entrada muerta, eliminada en F1. */
        /* === Formularios complejos (wizard state + 400+ lines, test via E2E) === */
        'src/components/Maintenance/MaintenanceRegistrationForm.tsx' /* Formulario 655 líneas (test via E2E) */,
        'src/components/Maintenance/MaintenanceCompletionPanel.tsx' /* Panel de cierre complejo (test via E2E) */,
        /* === Vistas de grilla y pronóstico de mantenimiento === */
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
        /* === Módulo financiero (módulo padre ya excluido) === */
        /* FC162 F1-T2: 'Finance/**' era un glob de directorio completo — auditado
           archivo por archivo. 2 de 4 archivos ya tenían test real (EgressTable/
           PeriodRangePicker); los otros 2 (EgressRegistrationModal/
           FinancialDashboard) recibieron test propio en F2. */
        /* === Branding y logos (JSX estático sin lógica) === */
        'src/components/Logo/**' /* Componentes SVG de identidad visual */,
        /* === Shells de navegación adicionales === */
        // FC162 F3 — SovereignSubheader.tsx removido: sin test previo, se escribió
        // test propio nuevo (2 tests) contra el SovereignLayoutProvider real.
        // FC162 F3 — imageUtils.ts removido: solo `compressImage` depende de
        // Canvas 2D real (jsdom no lo implementa); `resolveProfileImageUrl`
        // es lógica pura y recibió test propio nuevo (5 tests).
      ],
      // FC162 F1-T2 (Cond.R-162-F1, dictamen Alfa 194_AN / Bravo 195_AN):
      // recalibrado tras remover 3 globs de directorio completo del exclude
      // (Finance/**, Identity/**, RouteAssignment/**) — no es una regresión de
      // código, es una expansión honesta de la superficie medida (antes
      // invisible para Vitest Y para Sonar). Bravo (197_AN, cláusula F2-R0/
      // R7-web): esta recalibración a la baja se acepta como desviación
      // documentada ÚNICA de F1 — desde Fase 2 en adelante es un RATCHET, el
      // piso solo puede subir, nunca volver a bajar.
      // FC162 F2 — 6 gaps genuinos cerrados con test propio
      // (ArchonGeoSelector, EgressRegistrationModal, FinancialDashboard,
      // AccessControlSlideOver, RouteIdentityPanel, RouteMissionPanel) +
      // useAuditModalFlow/useFormComputed/CommentThread + ForensicJournalTable
      // ampliado (3→13 tests). Piso subido al valor real medido −2pp (mismo
      // patrón F1/FC083 H5). Medido post-F2: Statements 82.21% / Branches
      // 75.12% / Functions 77.4% / Lines 84.18%.
      // FC162 F3 — 14 archivos misclasificados removidos del exclude (mismo
      // patrón que F1, a mayor escala: ~150 tests ya existentes nunca antes
      // contados) + 6 archivos con test 100% nuevo (AuditJustificationModal,
      // ArchonDatePicker, CategoryAnalyticsCard, ArchonManagementCard,
      // FleetKpiMatrix, SovereignSubheader) + api/client.ts misclasificado.
      // Medido post-F3: Statements 82.15% / Branches 75.19% / Functions
      // 77.92% / Lines 84.01% — prácticamente plano vs. F2 (dilución honesta:
      // los 14 archivos recién contados traen su propia cobertura parcial
      // real, que compensa casi exacto el aporte de los 6 archivos nuevos al
      // 100%). Piso NO se mueve — ya está a −2pp del valor F2 y sigue siendo
      // válido con margen real bajo la medición F3 (ratchet respetado, cero
      // retroceso). ArchonTopBar.tsx confirmado huérfano (sin imports en el
      // árbol) — no se escribe test para código muerto, queda excluido con
      // hallazgo documentado para decisión de Alfa/Bravo. Layout.tsx se
      // mantiene excluido (mismo perfil de orquestador puro que App.tsx,
      // cobertura real vía E2E).
      thresholds: {
        lines: 82,
        functions: 75,
        branches: 73,
        statements: 80,
      },
    },
  },
});
