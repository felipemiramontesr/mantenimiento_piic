// FC083 F3 — Flat config (ESLint 9, Camino A/Híbrido).
// Diseño: protocols/analysis/088_evidence/f1/diseno_flat_config.md
// Un solo config raíz con bloques `files` por workspace (apps/api, apps/web),
// reemplazando los 3 `.eslintrc.json` legacy (root/api/web). `airbnb-base`
// sigue vía FlatCompat (confirmado funcional en el spike F0); la capa TS
// específica de Airbnb (`eslint-config-airbnb-typescript`, nunca usada en
// este repo) queda reemplazada por `@typescript-eslint` recommended nativo.
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

// FC094 Cond.14/RR1-RR6 — Ratchet de tamaño: allowlist explícita y comentada de
// god-files legado, exenta de max-lines (tamaño total del archivo) pero NO de
// max-lines-per-function/complexity (T1 del FC: función/complexity NUEVA dentro de
// un archivo exento sigue bloqueando — Escenario 2 de Acceptance Criteria). Semilla
// congelada en F1 (RR4 = inventario COMPLETO real bajo `eslint .` full-tree, no la
// muestra ilustrativa de 094_AN) — evidencia exacta en
// protocols/analysis/094_evidence/f1/allowlist_seed.md, dictaminada por Alfa
// (110_AN) y Bravo (H 2026-08-03 20:03:59). RR2: esta lista SOLO se acorta — un
// archivo sale cuando su FC de dominio lo cierra; 0 altas sin FC + dictamen R
// propio nuevo. Estar aquí NO exime a los servicios de I1-I3 cuando les toque su
// FC de dominio (el SQL sigue debiendo migrar a Repository).
// Exportada (no solo local) para que scripts/checkDiffQuality.ts (Gate 2,
// FC094 F1 Dual-Gate, 111_AN/Bravo 21:54:11) reuse la MISMA lista como fuente
// única — el umbral de complexity relajado (20 vs 15) de Gate 2 depende de
// saber si un archivo tocado en el diff está aquí.
// FC126 F1 (Cond.R-I1-G1…G7, mandato 125_AN Bravo) — I1 (routes zero-SQL) no
// tenía gate mecánico: la tabla de invariantes de FC094 citaba
// `no-restricted-imports` pero nunca se implementó, hallazgo real de la
// interconsulta previa a este FC. Allowlist EXACTA (grep real, no estimada) de
// rutas que aún importan `../services/db` directamente — monótonamente
// decreciente (RR2, mismo principio que LEGACY_GODFILES): un archivo sale de
// aquí en el commit de cierre de su propio FC de dominio, nunca antes. Rutas
// NUEVAS (no listadas) fallan el gate por defecto — sin excepción manual (G4).
export const LEGACY_DB_IMPORT_ALLOWLIST = [
  'apps/api/src/routes/areas.ts',
  'apps/api/src/routes/auth.ts',
  'apps/api/src/routes/catalogs.ts',
  'apps/api/src/routes/finance.ts',
  'apps/api/src/routes/fleet.ts',
  'apps/api/src/routes/fleetMaintenance.ts',
  'apps/api/src/routes/fleetRecalls.ts',
  'apps/api/src/routes/fleetTco.ts',
  'apps/api/src/routes/geolocation.ts',
  'apps/api/src/routes/notifications.ts',
  'apps/api/src/routes/ownerProfile.ts',
  'apps/api/src/routes/realtimeTelemetry.ts',
  'apps/api/src/routes/recallsNhtsa.ts',
  'apps/api/src/routes/recallsVim.ts',
  'apps/api/src/routes/reports.ts',
  'apps/api/src/routes/security.ts',
  'apps/api/src/routes/social.ts',
  'apps/api/src/routes/users.ts',
];

export const LEGACY_GODFILES = [
  // Backend routes (8) — presupuesto normal 250 LOC
  'apps/api/src/routes/fleetMaintenance.ts', // 1338 LOC
  'apps/api/src/routes/auth.ts', // 1069 LOC
  // FC126 F1/F2 — fleetRoutes.ts migrated to Route->Service->Repository (I1-I3
  // clean, zero-SQL, 43 call-sites moved to 3 repository files); 390 LOC
  // (ESLint skipBlankLines/skipComments) stays over the 250 LOC route budget
  // purely from endpoint count — 15 endpoints is a wide domain, not a
  // SQL-coupling problem. F2 dictamen (128_AN Alfa, 2026-08-05) audited and
  // APPROVED this as a standing size exception rather than forcing a further
  // mechanical split; RR2 still applies whenever it does get split.
  'apps/api/src/routes/fleetRoutes.ts', // 390 LOC (post-migration, was 789)
  'apps/api/src/routes/finance.ts', // 717 LOC
  // alerts.ts REMOVED FC094 F5 (RR2/Inv-C) — migrated to Route->Service->Repository
  // in F3 (653 -> 53 LOC), well under the 250 LOC route budget; no longer needs the
  // size exemption. Allowlist only shrinks, never grows without a signed FC.
  'apps/api/src/routes/social.ts', // 532 LOC
  'apps/api/src/routes/fleet.ts', // 395 LOC
  'apps/api/src/routes/ownerProfile.ts', // 383 LOC
  // Backend services (4) — presupuesto normal 400 LOC
  'apps/api/src/services/upaEngine.ts', // 870 LOC
  // FC126 F1 — routeService.ts migrated to zero-SQL (I2, delegates to 2
  // repository files) but keeps its pre-existing `/* eslint-disable */` +
  // `// @ts-nocheck` pragma (out of this FC's scope to lift — that's a
  // separate, larger governance gap unrelated to the SQL-boundary migration
  // this FC actually authorized). The pragma already exempts the whole file
  // from max-lines regardless of this entry; kept here for documentation
  // continuity, not because the gate needs it.
  'apps/api/src/services/routeService.ts', // 643 LOC (post-migration, was 705)
  'apps/api/src/services/fleetService.ts', // 486 LOC
  'apps/api/src/services/workOrderService.ts', // 448 LOC
  // Web components/pages/context (18) — presupuesto normal 400 LOC
  'apps/web/src/components/Fleet/FleetRegistrationForm.tsx', // 1218 LOC
  'apps/web/src/pages/Dashboard/FleetUnitNode.tsx', // 1199 LOC
  'apps/web/src/components/Fleet/FleetGridView.tsx', // 1094 LOC
  'apps/web/src/components/Routes/RouteLogTable.tsx', // 745 LOC
  'apps/web/src/pages/Upa/UpaWorkspace.tsx', // 716 LOC
  'apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx', // 689 LOC
  'apps/web/src/pages/Dashboard/OnboardingModule.tsx', // 646 LOC
  'apps/web/src/components/Routes/ForensicJournalTable.tsx', // 608 LOC
  'apps/web/src/components/Routes/RouteAssignment/ArchonGeoSelector.tsx', // 508 LOC
  'apps/web/src/components/Maintenance/MaintenanceGridView.tsx', // 498 LOC
  'apps/web/src/pages/Dashboard/MaintenanceModule.tsx', // 467 LOC
  'apps/web/src/components/Users/UserRegistrationForm.tsx', // 463 LOC
  'apps/web/src/components/Maintenance/MaintenanceCompletionPanel.tsx', // 458 LOC
  'apps/web/src/components/Finance/FinancialDashboard.tsx', // 453 LOC
  'apps/web/src/context/FleetContext.tsx', // 450 LOC
  'apps/web/src/components/Navigation/Sidebar.tsx', // 450 LOC
  'apps/web/src/components/Finance/EgressTable.tsx', // 420 LOC
  'apps/web/src/pages/Dashboard/AuditLogView.tsx', // 413 LOC
  // Web hooks (2) — presupuesto normal 400 LOC
  'apps/web/src/components/Routes/RouteAssignment/useRouteAssignmentControl.ts', // 658 LOC
  'apps/web/src/hooks/useFleetForm.ts', // 421 LOC
];

export default [
  {
    ignores: [
      'packages/database/scripts/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/scratch/**',
    ],
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  ...compat.extends('airbnb-base'),
  eslintConfigPrettier,
  {
    // Settings globales (legacy .eslintrc.json los aplicaba sin scope de `files`).
    settings: {
      react: { version: 'detect' },
      'import/resolver': { node: true },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      import: importPlugin,
      sonarjs: sonarjsPlugin,
      security: securityPlugin,
      unicorn: unicornPlugin,
    },
    rules: {
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'no-console': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsFor: ['config', 'state'] },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'import/no-extraneous-dependencies': 'off',
      'unicorn/filename-case': [
        'error',
        {
          cases: {
            camelCase: true,
            pascalCase: true,
          },
          // unicorn@65 agregó chequeo de nombres de directorio (checkDirectories,
          // default true) -- v51 (legacy) solo revisaba archivos. __tests__/__mocks__
          // son convención del ecosistema, no algo a renombrar. Restaura el alcance
          // original (solo archivos).
          checkDirectories: false,
        },
      ],
      'unicorn/prevent-abbreviations': 'off',
      // FC094 Cond.14 — max-lines (tamaño de ARCHIVO) SÍ es blanket-safe: probado
      // contra el árbol completo, 0 hallazgos fuera del allowlist de 32 (RR4
      // confirmado). cognitive-complexity queda en 20 (SIN bajar a 15 blanket) y
      // max-lines-per-function NO se añade aquí — evidencia empírica (H
      // 2026-08-03) de que aplicar maxFnLoc:50/complexity:15 como regla ciega de
      // árbol completo rompe 177 funciones en ~85 archivos jamás auditados (el
      // patrón estructural de componentes React/registro de rutas Fastify hace
      // que la función completa sea larga sin ser "spaghetti"). T1 del FC ya
      // anota esto: "ExcedeFnLoc/Complexity(**diff**)" — a diferencia de
      // max-lines, esa dimensión está diseñada para evaluarse sobre el diff, no
      // sobre el árbol completo. Pendiente de mecanismo diff-scoped (Cond.8 lo
      // exige igual para jsdoc) — hallazgo posteado en H, en espera de
      // resolución O/R antes de implementar.
      'sonarjs/cognitive-complexity': ['error', 20],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'import/no-cycle': 'error',
      'security/detect-object-injection': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // La regla base no entiende posiciones solo-de-tipo (.d.ts, firmas de
      // interfaz) y duplica el reporte de @typescript-eslint/no-unused-vars —
      // recomendación oficial de typescript-eslint: desactivarla en archivos TS.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['apps/api/src/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      'import/no-extraneous-dependencies': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'all', argsIgnorePattern: '^_|^newDate$', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // FC094 Cond.14 — presupuesto especial de rutas backend (250 LOC, más
    // estricto que el general de 400 porque una ruta debe ser zero-SQL/delgada
    // por I1). Las rutas ya listadas en LEGACY_GODFILES quedan exentas vía el
    // bloque siguiente (orden de array = precedencia en flat config).
    files: ['apps/api/src/routes/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // FC126 F1 — Cond.R-I1-G1/G2: bloquea `import ... from '../services/db'`
    // en cualquier ruta de `routes/**` no listada en LEGACY_DB_IMPORT_ALLOWLIST
    // (bloque siguiente = precedencia). Path real confirmado por grep — NO es
    // `../db` (corrección de terreno, 127_AN Bravo).
    files: ['apps/api/src/routes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../services/db',
              message:
                'I1 (routes zero-SQL, FC126 Cond.R-I1-G1): las rutas no acceden a la DB directamente — delega a un Service, que a su vez delega a un Repository (I2/I3). Si este archivo es legado aún no migrado, agrégalo a LEGACY_DB_IMPORT_ALLOWLIST en eslint.config.mjs vía su propio FC de dominio.',
            },
          ],
        },
      ],
    },
  },
  {
    // Cond.R-I1-G3: exención temporal — sale de esta lista en el commit de
    // cierre del FC de dominio que migre ese archivo (RR2), nunca antes.
    files: LEGACY_DB_IMPORT_ALLOWLIST,
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // T1 del FC: RatchetPass exento de max-lines (tamaño de archivo) para la
    // semilla congelada de 32. max-lines-per-function/cognitive-complexity para
    // ESTOS 32 archivos se enforzan vía Gate 2 (scripts/checkDiffQuality.ts,
    // diff-scoped) — no aquí, per Dual-Gate (111_AN/Bravo 21:54:11).
    files: LEGACY_GODFILES,
    rules: {
      'max-lines': 'off',
    },
  },
  {
    // Dual-Gate F1 (111_AN Alfa + auditoría Bravo 21:54:11) — Gate 1 puede
    // exigir max-lines-per-function:50 en BLANKET solo para capas Clean que
    // hoy no existen (0 archivos coinciden, confirmado 2026-08-03): el sufijo
    // `.repository.ts` es exclusivo del patrón Route→Service→Repository que
    // introduce este mismo FC (F3+) — no hay legado que romper. Cuando F3/F4
    // creen el cliente HTTP centralizado de apps/web, su directorio nuevo debe
    // sumarse aquí con el mismo razonamiento (0 legado = seguro blanket).
    files: ['**/*.repository.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },
  {
    // El ratchet de tamaño de archivo nunca aplicó a tests (ni el inventario
    // F0/F1 los auditó) — suites exhaustivas legítimamente exceden 400/250 sin
    // ser "código espagueti". Bloque final: siempre gana sobre los anteriores.
    // Cond.R-I1-G1 tampoco aplica a tests — mockean/ejercitan `../services/db`
    // directamente por diseño (integration tests), no es el I1 que el gate
    // vigila (código de producto en routes/**).
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'e2e/**/*.ts'],
    rules: {
      'max-lines': 'off',
      'no-restricted-imports': 'off',
    },
  },
];
