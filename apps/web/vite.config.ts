import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions', 'junit'] : ['default'],
    outputFile: process.env.GITHUB_ACTIONS ? { junit: './test-results.xml' } : undefined,
    setupFiles: './src/test/setup.ts',
    globalTeardown: './src/test/globalTeardown.ts',
    pool: 'threads',
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
        'dist/**' /* Build artifacts compilados */,
        'vite.config.ts' /* Configuracion de build */,
        /* === Contextos y Proveedores (lifecycle + localStorage + window = E2E) === */
        'src/context/AuthContext.tsx' /* Sesion con localStorage (test via E2E) */,
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
        'src/components/Identity/**' /* Paneles de identidad (test via E2E) */,
        'src/components/Fleet/FleetGridView.tsx' /* Tabla maestra (test via E2E) */,
        'src/components/Fleet/FleetKpiMatrix.tsx' /* Dashboard KPI (test via E2E) */,
        'src/components/Fleet/FleetRegistrationForm.tsx' /* Formulario complejo (test via E2E) */,
        'src/components/ArchonDatePicker.tsx' /* Calendario visual (test via E2E) */,
        'src/components/Routes/RouteAssignmentForm.tsx' /* Wizard de asignacion (test via E2E) */,
        'src/components/Routes/RouteLogTable.tsx' /* Tabla forense (test via E2E) */,
        'src/components/Routes/RouteManagementCards.tsx' /* Cards de gestion (test via E2E) */,
        'src/components/Routes/RouteAssignment/**' /* SubPaneles de asignacion (test via E2E) */,
        /* === Hooks complejos con estado de wizard === */
        'src/hooks/useFleetForm.ts' /* Hook de formulario con 350+ lineas (test via E2E) */,
        /* === Test infrastructure === */
        'src/test/handlers.ts' /* MSW handlers (infraestructura de test) */,
      ],
      thresholds: {
        lines: 98,
        functions: 85,
        branches: 80,
        statements: 98,
      },
    },
  },
});
