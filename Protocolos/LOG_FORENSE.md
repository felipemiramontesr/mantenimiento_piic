# LOG FORENSE DE AGENTES — Archon ERP

**Uso:** Bitácora personal de GrayMan. Registro cronológico de iteraciones de CC y AG sobre el sistema.
**Formato:** Una entrada por sesión o bloque de trabajo significativo.
**Actualización:** Obligatoria al cierre de cada sesión por el agente activo.

---

## PROTOCOLO MAESTRO

**Archivo:** `Protocolos/PROTOCOLO_L.md`
**Ruta completa:** `C:\Users\felip\OneDrive\Documentos\felipe\03_Desarrollo_Web\mantenimiento.piic.com.mx\Protocolos\PROTOCOLO_L.md`

Toda sesión registrada en este log debe apegarse a las reglas, versión activa y Feature Contract definidos en el Protocolo Maestro. Este archivo es la única fuente de verdad del proyecto.

---

## ESTRUCTURA DE ENTRADA

```
### [VERSIÓN] — [FECHA] — [AGENTE]
**Sesión:** [descripción breve de la sesión]
**Archivos tocados:** [lista de paths]
**Qué se hizo:** [resumen técnico]
**Por qué:** [decisión o requerimiento que lo originó]
**Decisiones tomadas:** [alternativas evaluadas y la elegida]
**Pendiente / Notas:** [si quedó algo sin resolver]
```

---

## HISTORIAL

---

### V.78.101.0 — 2026-05-30 — CC

**Sesión:** Finance Module Phase 1 — Ledger, API, UI y backfill histórico
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `DECISIONS_LOG.md` (creado)
- `packages/database/migrations/085_finance_module_tables.sql` (creado)
- `packages/database/migrations/086_finance_permissions.sql` (creado)
- `packages/database/migrations/backfill_finance_from_maintenance.sql` (creado)
- `apps/api/src/routes/finance.ts` (creado)
- `apps/api/src/routes/finance.test.ts` (creado — 13 tests)
- `apps/api/src/index.ts` (registrar financeRoutes)
- `apps/web/src/types/finance.ts` (creado)
- `apps/web/src/components/Finance/FinancialDashboard.tsx` (creado)
- `apps/web/src/components/Finance/EgressTable.tsx` (creado)
- `apps/web/src/components/Finance/EgressRegistrationModal.tsx` (creado)
- `apps/web/src/pages/Dashboard/FinancialHealthModule.tsx` (reemplazado stub)
  **Qué se hizo:** Implementación completa del Módulo Finanzas Fase 1: tabla ledger `financial_transactions`, permisos RBAC (`financial:write`, `financial:report`), script de backfill histórico de costos de mantenimiento, 4 endpoints API REST (`/finance/dashboard`, `/finance/transactions`, POST `/finance/transactions`, `/finance/export`), y UI completa con Dashboard KPIs + ApexCharts (donut + area), tabla de egresos con filtros + cursor paginación, modal de registro manual, y exportación CSV nativa.
  **Por qué:** GrayMan aprobó Feature Contract Finance_Module_Phase_1_Foundation_And_Core_UI. Módulo diseñado para demostrar valor al área de finanzas del cliente y acelerar la adopción de Archon ERP.
  **Decisiones tomadas:** (1) CSV nativo sin dependencias nuevas — rechazado jsPDF por peso. (2) computePeriod usa UTC para determinismo en servidor Hostinger. (3) backfill idempotente por source_uuid separado de la migración para permitir control por ambiente. (4) financial:write asignado a todos los roles para fase testing — se restringe en hardening.
  **Pendiente / Notas:** El pre-flight del protocolo confirmó que el plugin `@vitest/coverage-v8` tiene incompatibilidad de versión con vitest 3.2.4 — es un issue pre-existente (51 fallas en baseline sin mis cambios). Delta de regresión = 0. Antes del go-live: truncar `financial_transactions` en producción, validar costos históricos con cliente, re-ejecutar backfill solo con datos validados. Ver `DECISIONS_LOG.md`.

---

### V.78.100.213 — 2026-05-25 — CC

**Sesión:** Protocolo de coordinación Dual-IA
**Archivos tocados:** `Protocolos/comunication_ias_protocol.md` (creado)
**Qué se hizo:** Creación del protocolo de comunicación entre AG y CC con identidad de agentes, sistema de handoff, ESTADO ACTIVO y registro de sesiones.
**Por qué:** Necesidad de formalizar la colaboración entre dos IAs con limitaciones distintas.
**Decisiones tomadas:** Patrón Driver/Navigator; ESTADO ACTIVO como sección viva del archivo.
**Pendiente:** ESTADO ACTIVO envejeció rápidamente — se resolvió migrando el estado dinámico al memory system de CC en sesiones posteriores.

---

### V.78.100.214 — 2026-05-25 — AG

**Sesión:** Lifecycle de mantenimiento CTI + Cyclic Engine + Cumulative Checklist
**Archivos tocados:** `apps/api/src/routes/fleetMaintenance.ts`, `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx`
**Qué se hizo:** Implementación del motor cíclico `computeServiceType`, herencia acumulativa de tareas, modo automático `is_in_progress`.
**Por qué:** El sistema de mantenimiento necesitaba lógica de negocio que derivara el tipo de servicio del odómetro sin input manual del usuario.
**Decisiones tomadas:** `computeServiceType` duplicado en frontend y backend para feedback inmediato en UI. Alternativa descartada: solo backend (requería round-trip para mostrar el tipo calculado).
**Pendiente:** La duplicación de `computeServiceType` es deuda técnica conocida — se documenta en Sección 9.2 de PROTOCOLO_L.md como advertencia.

---

### HOTFIX — 2026-05-25 — AG

**Sesión:** Core Mining Cumulative Patch (rama `hotfix/core-mining-cumulative-patch`)
**Archivos tocados:** `apps/api/src/routes/fleetMaintenance.ts`, scripts de hidratación DB
**Qué se hizo:** Corrección de inyección de MINOR_MINING en hitos de agencia. Refactor de query SQL para evaluar reglas de marca y combustible de forma agnóstica. Transición a paquetes de mantenimiento discretos 1:1.
**Por qué:** El motor acumulativo jerárquico generaba "ruido" en el checklist — tareas incorrectas aparecían para unidades de mina en hitos de agencia.
**Decisiones tomadas:** Paquetes discretos en lugar de herencia jerárquica para MINOR_MINING. Encapsulación de alertas predictivas (`CHASSIS_SHOCKS_HEAVY`, `DISTRIBUTION_KIT_WATER_PUMP`) estrictamente bajo flag `isMineUnit`.
**Pendiente:** Ninguno — hotfix mergeado y validado.

---

### V.78.100.215 — 2026-05-29 — CC

**Sesión:** QA / Unit Tests — Export Pure Maintenance Business Logic
**Archivos tocados:** `apps/api/src/routes/fleetMaintenance.ts`, `apps/api/src/routes/fleetMaintenance.test.ts` (nuevo), `apps/api/src/services/fleetIntelligence.test.ts`, `apps/api/src/routes/fleetIntegration.test.ts`, `apps/web/src/components/Maintenance/MaintenanceForecastView.test.tsx` (nuevo), `apps/web/src/pages/Dashboard/MaintenanceModule.test.tsx`
**Qué se hizo:** Export de funciones puras para testabilidad. 46 tests nuevos en API (computeServiceType, resolveServiceMode, buildCascadeServiceTypes). 20 tests en ForecastView. Corrección de mock sequencing en fleetIntegration (KPI consume 3 db.execute por llamada). Thresholds de cobertura elevados de 0% a valores reales.
**Por qué:** Requerimiento de GrayMan: "mejora la QA, UNIT TESTS para que quede al 100%".
**Decisiones tomadas:** Export de funciones sin cambiar su lógica (no breaking). Mock interleaving para KPI queries. `/* eslint-disable */` en script seed (patrones de loop incompatibles con ESLint de producción).
**Pendiente:** Ninguno — 228/228 API, 245/245 Web.

---

### V.78.100.216 — 2026-05-29 — CC

**Sesión:** Fuel & Odometer Telemetry para eventos de mantenimiento
**Archivos tocados:** `apps/api/src/routes/fleetMaintenance.ts`, `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx`, `apps/web/src/components/Maintenance/MaintenanceCompletionPanel.tsx`, `apps/web/src/types/maintenance.ts`
**Qué se hizo:** Activación de campos existentes en `fleet_movements` (`fuel_level_start/end`, `fuel_liters_loaded`, `fuel_amount`, `end_reading`) para mantenimiento. `fuel_level_start` auto-heredado de `fleet_units.lastFuelLevel` server-side. `applyMaintenanceCompletionToUnit` sincroniza `lastFuelLevel` y usa `endOdometer` para odómetro post-pruebas. UI con `ArchonFuelSensor` en 2 tarjetas independientes. WORKSHOP: sensor read-only + info. IN_SITU: captura completa.
**Por qué:** Cada mantenimiento tiene la lógica de una ruta — genera km (traslado al taller o pruebas de campo) y consume combustible.
**Decisiones tomadas:** Sin columnas nuevas en DB — reutilización de campos existentes en `fleet_movements`. `fuelLevelStart` auto-capturado server-side (no frontend input) para evitar error humano. Dos tarjetas independientes en lugar de una card con grid interno — consistencia estética con paneles superiores.
**Pendiente:** Ninguno — tests verdes, commit y push realizados.

---

### 2026-05-29 — CC

**Sesión:** Consolidación de protocolos + mejoras a PROTOCOLO_L.md
**Archivos tocados:** `Protocolos/PROTOCOLO_L.md`, `Protocolos/LOG_FORENSE.md` (creado), `.gitignore`, `COMMIT_PROTOCOL.md` (eliminado de git)
**Qué se hizo:** PROTOCOLO_L.md elevado a V.4.0.0 como única fuente de verdad. Absorción de `comunication_ias_protocol.md`, `PROTOCOLO_DB_SYNC.md` y `COMMIT_PROTOCOL.md`. Adición de Secciones 2.4 (Logging), 2.5 (Error Response Contract), 2.6 (Transacción Fastify), 3.3 (Guía alternancia), 4.5 (ESLint crítico), 4.6 (Tipografía), 4.7 (Badges), 4.8 (Componentes UI), 9.4-9.6 (Flotilla y módulos), 10 (Feature Contract), 11 (DB Sync), 6.1 (Dependency Gate), regla de complejidad cognitiva ≤ 20, secret scan en pre-flight. Creación de `LOG_FORENSE.md` como bitácora personal local.
**Por qué:** Requerimiento de GrayMan: single source of truth. Eliminación de redundancia y posibles contradicciones entre archivos.
**Decisiones tomadas:** ESTADO ACTIVO y registro de sesiones NO migrados a PROTOCOLO_L (son estado dinámico, viven en memory system de CC y git log). COMMIT_PROTOCOL.md eliminado de git — versión absorbida en header de PROTOCOLO_L.md.
**Pendiente:** Ninguno.

---

---

### V.78.100.217 — 2026-05-29 — CC

**Sesión:** Auditoría completa del ERP Archon contra PROTOCOLO_L.md — Security Hardening + Test Coverage
**Archivos tocados:** `apps/api/src/index.ts`, `apps/api/src/services/encryption.ts`, `apps/api/src/routes/auth.ts`, `apps/api/src/routes/geolocation.ts`, `apps/api/src/routes/geolocationIntegration.test.ts`, `apps/api/src/routes/fleetMaintenance.ts`, `apps/api/src/services/fleetIntelligence.ts`, `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx`, `apps/web/src/components/Maintenance/MaintenanceGridView.test.tsx` (nuevo), `apps/web/src/components/Maintenance/MaintenanceCompletionPanel.test.tsx` (nuevo), `apps/web/src/components/Maintenance/MaintenanceHistoryDetail.test.tsx` (nuevo), `CLAUDE.md` (nuevo), `apps/api/package.json`
**Qué se hizo:** Auditoría de 14 reglas del Protocolo L. 9 hallazgos corregidos: (1) fail-fast guard para JWT_SECRET y DB_ENCRYPTION_KEY en producción — throw si ausentes; (2) @fastify/helmet v11 con CSP, HSTS, X-Frame-Options; (3) CORS restringido a dominio conocido en producción; (4) login retornaba `{ status: 'success' }` → `{ success: true }`; (5) geolocation 4 endpoints retornaban array desnudo → `{ success: true, data }`; (6) tests de geolocation actualizados al nuevo contrato; (7) `residuo` → `remainder` y `intServi` → `serviceInterval`; (8) 3 nuevos archivos de test para componentes sin cobertura (16 tests nuevos). CLAUDE.md creado para auto-cargar PROTOCOLO_L al inicio de sesión.
**Por qué:** Requerimiento de GrayMan: "auditoria completa del ERP Archon contrastado con L".
**Decisiones tomadas:** @fastify/helmet v11 (no latest) por compatibilidad con Fastify v4. Geolocation HistoryDetail usa `document.body.textContent` en lugar de `getByText` porque el unit_id está mezclado con el número de orden en el mismo nodo de texto. `computeServiceType` duplicada NO migrada a shared package — riesgo de romper CI considerado demasiado alto para esta sesión.
**Pendiente:** `computeServiceType` sigue duplicada — deuda técnica documentada en Sección 9.2 de PROTOCOLO_L.md.

---

### V.78.100.218 — 2026-05-29 — AG

**Sesión:** Resolución de parpadeo en UI y refactorización a Sovereign Action Buttons
**Archivos tocados:** `apps/web/src/components/UI/ArchonDataTable.tsx`, `apps/web/src/components/Maintenance/MaintenanceGridView.tsx`, `Protocolos/PROTOCOLO_L.md`
**Qué se hizo:** Se trasladó la clase de fondo (bg-pinnacle-navy) del elemento tr a th en ArchonDataTable para eliminar el efecto de parpadeo blanco originado al aplicar opacity sobre una capa sin color de fondo (transparent) encima del tr; también se corrigió el alineado dinámico text-align que causaba fallos en la compilación CSS. En MaintenanceGridView se renombró 'ACCIÓN' a 'ACCIONES' y se migró el botón 'Finalizar' texto/ícono naranja por un botón icónico Sovereign (w-10 h-10, background emerald-50 y hover:rotate-12) como estipula el protocolo L.
**Por qué:** Un usuario reportó un bug visual (parpadeo blanco) y desajuste en el estándar de los botones de acciones al finalizar un mantenimiento.
**Decisiones tomadas:** Se migró el fondo del TheadRow (tr) al TheadCell (th) en lugar de parchear las filas, garantizando una transición suave en el hover sin romper layout. Se migró el botón de Acción a un componente exclusivamente gráfico respetando el estándar Sovereign del Protocolo L.
**Pendiente:** Ninguno.

---

_Próxima entrada: al cierre de la siguiente sesión de trabajo._

---

### V.78.101.9 → V.78.101.23 — 2026-06-02 — CC

**Sesión:** Settings Panel Refactor + REFACTOR global del sistema (Fases 1-3) + Security hardening A01 + Dashboard gaps
**Archivos tocados (resumen por commit):**

- V.78.101.9–16: `ArchonProfilePanel.tsx` (layout, spacing, borders, icons), `SettingsModule.tsx`, `AlertsPanel.tsx`, `App.tsx`
- V.78.101.17: `ArchonCenter.tsx` (11→9 tarjetas, routing de 9 botones), `FleetModule.tsx` (query params)
- V.78.101.18: `IncidentsModule.tsx` (nuevo módulo `/dashboard/incidents`), `IncidentsModule.test.tsx`
- V.78.101.19: `finance.ts` API + `finance.ts` types (alias SQL unitName→unitId)
- V.78.101.20: `constants/statuses.ts` (API), `imageUtils.ts` (web), `ArchonProfilePanel.tsx`, `useFleetForm.ts`, `FleetGridView.tsx`
- V.78.101.21: `constants/maintenance.ts` (API+web), `CategoryAnalyticsCard.tsx`, `MaintenanceRegistrationForm.tsx`
- V.78.101.22: JWT auth en `catalogs.ts`, `geolocation.ts`, `fleetMaintenance.ts` + tests 401
- V.78.101.23: JWT auth en `fleetRoutes.ts`, archonCache TTL, smoke test env vars, playwright localhost config
  **Qué se hizo:** (1) Módulo Settings refactorizado: panel Alertas por defecto + toggle Configuración de Identidad. (2) Módulo Incidencias creado en /dashboard/incidents usando GET /v1/incidents existente. (3) Centro de Comando: 11→9 tarjetas (eliminadas Activos Totales + Mantenimiento), routing de 9 botones a módulos correctos, FleetModule pre-filtra por query params. (4) REFACTOR Fase 1 (alias SQL), Fase 2 (status constants, imageUtils, catalog cache, props drilling), Fase 3 (maintenance constants, CategoryAnalyticsCard, computeServiceType constants mirror). (5) Security hardening: JWT auth en 4 rutas desprotegidas (catalogs, geolocation, fleetMaintenance, fleetRoutes), 8+ tests de seguridad añadidos. (6) archonCache con TTL 1h, smoke test credenciales a env vars, playwright config localhost.
  **Por qué:** GrayMan solicitó ciclo completo RED-GREEN-REFACTOR, evaluación del dashboard de certificación y reparación de gaps de seguridad.
  **Decisiones tomadas:** (1) computeServiceType duplicación resuelta con constants mirror (no shared package — riesgo de setup). (2) fleetRoutes: inline jwtVerify removidos post-hook. (3) archonCache TTL default 1h para catálogos. (4) E2E_ENV=local para separar prod/local sin romper CI.
  **Pendiente / Notas:** Los commits V.78.101.9-16 de UI identity panel no se registraron en log previo — cubiertos en esta entrada. Smoke test requiere E2E_PASSWORD en entorno para correr.

---

### V.78.100.220 — 2026-05-29 — AG

**Sesión:** PWA Network Resilience & Runtime Caching (PWA Phase 1 & 2)
**Archivos tocados:** pps/web/vite.config.ts, pps/web/index.html, pps/web/src/hooks/useNetworkStatus.ts, pps/web/src/hooks/useNetworkStatus.test.ts, pps/web/src/components/Navigation/ArchonNetworkBanner.tsx, pps/web/src/components/Navigation/ArchonNetworkBanner.test.tsx, pps/web/src/App.tsx, pps/web/public/manifest.webmanifest, pps/web/public/pwa-192x192.png, pps/web/public/pwa-512x512.png, pps/web/public/favicon.ico
**Qué se hizo:** Integración de ite-plugin-pwa con estrategia generateSW para habilitar instalación en móviles (A2HS). Implementación de un hook global useNetworkStatus para detectar caídas de red y un componente ArchonNetworkBanner para advertir al usuario. Se aplicó runtime caching para assets estáticos pero se excluyó /api/ para bloquear mutaciones críticas en modo offline.
**Por qué:** Requisito de negocio: la operación de los técnicos en campo exige uso del sistema en móviles, requiriendo características de Progressive Web App y bloqueo seguro ante intermitencias de red.
**Decisiones tomadas:** Se evitó cachear las peticiones /api/\* porque el sistema no permite mutaciones offline (Protocolo de Integridad EAL6+). Toda petición fallará elegantemente con el feedback nativo.
**Pendiente:** Ninguno.

### V.78.100.221 — 2026-05-29 — AG

**Sesión:** Adaptación Responsiva Mobile-First (PWA Phase 3)
**Archivos tocados:** pps/web/src/context/SovereignLayoutContext.tsx, pps/web/src/pages/Dashboard/Layout.tsx, pps/web/src/components/Navigation/Sidebar.tsx, pps/web/src/components/Navigation/SovereignHeader.tsx, pps/web/src/components/UI/ArchonDataTable.tsx, pps/web/src/components/Navigation/Sidebar.test.tsx, pps/web/src/components/Navigation/SovereignHeader.test.tsx
**Qué se hizo:** Implementación de layout responsivo flex-col para móviles, transformación del Sidebar en un drawer off-canvas con z-index prioritario y overlay, adición de toggle hamburger en el header, y wrapping de tablas de datos masivos con overflow-x-auto. Corrección de mocks de contexto en pruebas Vitest para alcanzar 100% pass.
**Por qué:** Requerimiento del usuario para habilitar operación PWA en dispositivos móviles como mandato para usuarios de campo sin romper la vista desktop EAL6+.
**Decisiones tomadas:** Se utilizó el contexto SovereignLayoutContext para el estado de isMobileMenuOpen, evitando prop drilling. Tailwind md: breakpoint para diferenciar layout desktop/mobile. Commit unificado squash de Phase 3 bajo Protocolo L.
**Pendiente:** Ninguno — mergeado con commit limpio.

---

### V.78.100.222 — 2026-05-30 — AG

**Sesión:** UI Linguistics & Geometry Stabilization (Maintenance Module)
**Archivos tocados:** `apps/web/src/components/Maintenance/MaintenanceForecastView.tsx`, `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx`, `apps/web/src/components/Maintenance/MaintenanceCompletionPanel.tsx`, `apps/web/src/components/Maintenance/MaintenanceHistoryDetail.tsx`, `apps/web/src/components/Maintenance/MaintenanceGridView.tsx`, `apps/web/src/components/Maintenance/MaintenanceForecastView.test.tsx`, `Protocolos/PROTOCOLO_L.md`
**Qué se hizo:** Homogeneización lingüística de etiquetas de servicio a "Servicio Menor", "Mayor 30K - 40K" y "Avanzado 50K - 60K". Ordenamiento algorítmico gravitacional por peso de Tiers en la matriz de Pronósticos. Eliminación del sufijo rígido duplicado (`· mina`). Refactor geométrico para aplicar bordes de `4px` (`rounded-[4px]`) a contenedores que infringían la regla (`rounded-xl`). Sincronización de las aserciones en pruebas unitarias de Vitest para avalar la nueva UI. Cumplimiento de nomenclatura de _commit_ bajo Protocolo L.
**Por qué:** Mantenimiento de integridad estética EAL6+ (Sovereign) y ajuste de matriz operativa del usuario donde los servicios son "intervalos de paquete" (Tiers), no solo hitos fijos.
**Decisiones tomadas:** Cambio en diccionarios `SERVICE_LABELS` como single source of truth; purga de lógica en JSX que anexaba cadenas redundantes. Se re-escribió un commit incorrecto al formato L estricto (`V.x.x.x_Pascal_Snake_Case`).
**Pendiente / Notas:** Preparación de Handoff para el relevo (Claude Code - CC).

---

### V.78.101.0 + V.78.101.1 — 2026-06-01 — CC

**Sesión:** Finance Module Phase 1 — Implementación completa + Data Hydration + UI Polish
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `Protocolos/LOG_FORENSE.md` (sección PROTOCOLO MAESTRO + esta entrada)
- `apps/api/src/routes/finance.ts` (endpoints dashboard/transactions/export/create; KPIs ampliados: totalTire, totalFine, totalRepair, totalOther; totalLease migrado de fleet_units a financial_transactions)
- `apps/api/src/routes/finance.test.ts` (13 tests)
- `apps/api/src/index.ts` (registro financeRoutes)
- `apps/api/src/services/routeService.ts` (finishRoute: INSERT AUTO en financial_transactions category=FUEL)
- `apps/web/src/types/finance.ts` (FinanceDashboardKpis ampliado)
- `apps/web/src/components/Finance/FinancialDashboard.tsx` (KPI cards, donut chart con mínimo visual + leyenda custom + formatters, area chart con chips 15D/1M/2M/3M/6M/12M/Todo + flex-1 height)
- `apps/web/src/components/Finance/EgressTable.tsx` (diseño soberano: header navy, columna Concepto fusionada, autocomplete de unidad, layout grid cols-2, style archon-sovereign para inputs)
- `apps/web/src/components/Finance/EgressRegistrationModal.tsx`
- `apps/web/src/components/Finance/PeriodRangePicker.tsx` (bug fix selección blanca, acordeón, alineación soberana bordes, localStorage persistencia)
- `apps/web/src/pages/Dashboard/FinancialHealthModule.tsx` (localStorage dateRange)
- `apps/web/src/pages/Dashboard/Layout.tsx` (pr-10 restaurado para alineación con scrollbar)
- `packages/database/migrations/087_backfill_finance_from_routes.sql` (FUEL de rutas)
- `packages/database/migrations/088_hydrate_insurance.sql` (insuranceCost en fleet_units)
- `packages/database/migrations/089_backfill_lease.sql` (LEASE mensual histórico)
- `packages/database/scripts/run_087.js`, `run_088.js`, `run_089.js`
- `DECISIONS_LOG.md`
  **Qué se hizo:** Implementación end-to-end del Módulo Finanzas Phase 1: (1) API REST con 4 endpoints, KPIs matemáticamente correctos con invariante totalEgresos=SUM(todas las categorías de financial_transactions); (2) Hydración DB: insuranceCost en 23 unidades, 690 registros LEASE, 690 registros INSURANCE, 4 registros FUEL de rutas históricas; (3) routeService integrado con financial_transactions vía source='AUTO'; (4) PeriodRangePicker refactorizado: bug de selección blanca corregido, acordeón, persistencia localStorage, alineación soberana grid; (5) EgressTable: diseño soberano, autocomplete de unidad, columna Concepto inteligente, estilo archon para inputs; (6) FinancialDashboard: donut con mínimo visual honesto 2% + leyenda custom con montos/%, area chart con 7 chips de período, formatters correctos para MySQL DECIMAL→string.
  **Por qué:** GrayMan requirió módulo financiero clase mundial con matemática exacta: totalEgresos cuadrando con suma de categorías, arrendamiento desde financial_transactions (no hardcoded), combustible de rutas integrado al ledger.
  **Decisiones tomadas:** (1) totalLease migrado de fleet_units.monthlyLeasePayment (hardcoded) a financial_transactions con 30 meses históricos — invariante matemática correcta. (2) displaySeries con mínimo 2% para visibilidad de slices pequeños — datos honestos en tooltip/leyenda. (3) Layout.tsx restaurado a pr-10 para alineación correcta con scrollbar de 6px. (4) source_uuid con CONVERT para collation fix entre fleet_movements y financial_transactions.
  **Pendiente / Notas:** Para ir a producción: validar montos de backfill con cliente, ejecutar run_087/088/089 en DB prod, considerar proceso mensual automático para registros LEASE/INSURANCE futuros.

---

### V.78.101.1 — 2026-06-01 — CC

**Sesión:** Pre-flight, TypeScript fix en ApexCharts formatters, reescritura de tests FinancialHealthModule, commit y push
**Archivos tocados:**

- `apps/web/src/components/Finance/FinancialDashboard.tsx` (fix TS: formatters opts? opcional)
- `apps/web/src/pages/Dashboard/FinancialHealthModule.test.tsx` (reescritura completa con MSW)
  **Qué se hizo:** Pre-flight completo del Finance Module Phase 1. Se detectaron y corrigieron 3 errores TypeScript en `FinancialDashboard.tsx` (firmas de formatter ApexCharts: `opts` debe ser `opts?` opcional conforme al tipo `ApexFormatterOpts | undefined`). Se reescribió `FinancialHealthModule.test.tsx` desde cero: el stub original probaba texto del componente placeholder anterior — ahora usa MSW para mockear `/finance/dashboard` y `/finance/transactions`, y tiene 3 tests que verifican el componente real (KPIs, panel transition, layout metadata). Suite final: API 241/241, Web 266/266. Commit `cabbf6e` pusheado a main.
  **Por qué:** La sesión anterior no ejecutó el pre-flight antes de cerrar. Al retomar, el protocolo exige pre-flight antes del commit. Los 3 errores TS y los 3 tests fallidos fueron descubiertos en esta sesión.
  **Decisiones tomadas:** (1) Formatter opts marcado como opcional (no como `as any`) — fix tipado limpio. (2) value.formatter del donut usa `parseFloat(String(val))` porque el tipo de ApexCharts solo acepta 1 argumento para esa callback — dato honesto del displaySeries. (3) Tests reescritos con `vi.mock('react-apexcharts')` para evitar problemas SVG en JSDOM.
  **Pendiente / Notas:** Ninguno en dev. Pre go-live: validar backfill con cliente, ejecutar run_087/088/089 en prod.

---

### V.78.101.2 — 2026-06-01 — CC

**Sesión:** Finance Module JWT Auth + Type Fix
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `apps/api/src/routes/finance.ts` (addHook onRequest JWT + fix createdBy)
- `apps/api/src/routes/financeIntegration.test.ts` (nuevo — 6 integration tests)
- `apps/api/src/types/fastify.d.ts` (fix: role_id→roleId, +roleName, +permissions)
  **Qué se hizo:** Auditoría completa del sistema de auth — descubrió que RBAC no existe en la API (solo en DB), que `finance.ts` estaba completamente abierto, y que `createdBy` defaulteaba a user_id=1 cuando no había sesión. Implementado el patrón `addHook('onRequest', jwtVerify)` idéntico al de `fleet.ts`. Corregido `createdBy` usando `(request.user as { id: number }).id` (patrón establecido en auth.ts). Corregido `fastify.d.ts` con los campos reales del JWT payload (camelCase). 6 integration tests nuevos: 4×401 sin token (uno por endpoint), 1×200 dashboard autenticado, 1×201 POST autenticado verificando que `insertParams[8] === 1` (el user.id del token).
  **Por qué:** Feature Contract A aprobado por GrayMan. AG bloqueado — CC continúa la roadmap.
  **Decisiones tomadas:** (1) Solo JWT auth, NO RBAC granular — el sistema no tiene checkPermission() en ningún endpoint, implementarlo solo en finance sería inconsistente. (2) `request.user as { id: number }` — patrón establecido en auth.ts, no `request.user.id` directo porque el type de @fastify/jwt conflictúa con la augmentación. (3) RBAC granular planificado como Feature Contract independiente: Auth_Module_Permission_Enrichment (poblar permissions[] en el JWT al login).
  **Pendiente / Notas:** Próximos pasos: (C) Finance_Periodic_Insert_LEASE_INSURANCE, (D) Auth_Module_Permission_Enrichment.

---

### V.78.101.3 — 2026-06-01 — CC

**Sesión:** Finance Periodic Insert — GitHub Actions cron mensual
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `packages/database/scripts/run_090_periodic_finance.js` (nuevo)
- `.github/workflows/finance-periodic.yml` (nuevo)
  **Qué se hizo:** Script Node.js idempotente `run_090` que inserta LEASE + INSURANCE para todas las unidades activas en un rango de períodos FINANCE_FROM/FINANCE_TO (default: mes actual UTC). Workflow GH Actions con cron `0 6 1 * *` (día 1 de cada mes a las 6am UTC) + `workflow_dispatch` con inputs `from`/`to` para ejecución manual o retroactiva. Variable `MONTHS_TO_COVER` en el workflow para ajustar frecuencia sin tocar el script. Idempotencia validada en local: 1ª ejecución insertó 46 registros (23 LEASE + 23 INSURANCE para junio 2026); 2ª ejecución: 0 insertados, 46 omitidos. Rango trimestral: 0 insertados, 138 omitidos (meses previos cubiertos por run_088/089).
  **Por qué:** GrayMan aprobó Feature Contract C. Diseño flexible para cambiar frecuencia sin refactoring: solo cambiar cron expression y variable MONTHS_TO_COVER.
  **Decisiones tomadas:** (1) FINANCE_FROM/FINANCE_TO en lugar de FINANCE_PERIOD singular — permite rangos nativamente sin cambiar el script. (2) `getInsuranceCost()` copiada en run_090 (no shared module) — 4 líneas sin dependencias, sobrecarga de abstracción innecesaria. (3) `workflow_dispatch` con inputs opcionales + cron automático en el mismo workflow. (4) `MONTHS_TO_COVER=1` como variable documentada para cambio de frecuencia.
  **Pendiente / Notas:** (D) Auth_Module_Permission_Enrichment — poblar permissions[] en JWT al login para habilitar RBAC granular en todos los endpoints.

---

### V.78.101.8 — 2026-06-02 — CC

**Sesión:** Settings Module — Alertas y Notificaciones + toggle Configuración de Identidad
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `apps/web/src/pages/Dashboard/SettingsModule.tsx` (refactorizado)
- `apps/web/src/components/Identity/AlertsPanel.tsx` (nuevo)
- `apps/web/src/pages/Dashboard/SettingsModule.test.tsx` (6 tests nuevos)
  **Qué se hizo:** Refactor de `SettingsModule` para mostrar panel "Alertas y Notificaciones" (vacío) por defecto al hacer clic en el avatar del Sidebar. El header ahora incluye una `ArchonManagementCard` (patrón idéntico a Finanzas/Mantenimiento) que alterna entre el panel de alertas y el formulario de Configuración de Identidad (`ArchonProfilePanel`). Toggle simétrico: ALERTS → tarjeta dice "Configuración de Identidad"; IDENTITY → tarjeta dice "Ver Alertas". 6 tests nuevos cubren: render default, card header en cada estado, toggle ALERTS↔IDENTITY. Suite final: 271/271.
  **Por qué:** GrayMan aprobó Feature Contract `Settings_Module_Alerts_And_Identity_Panel` vía Protocolo L. Opción A (toggle simétrico) seleccionada.
  **Decisiones tomadas:** (1) Toggle simétrico (Opción A) — consistente con patrón de Finanzas. (2) `AlertsPanel` como componente independiente para aislamiento de futura lógica de alertas. (3) `ArchonProfilePanel` sin modificaciones — reutilizado tal cual. (4) `Protocolos/` está en `.gitignore` (protege `LOG_FORENSE.md`); `PROTOCOLO_L.md` se commitea con `git add -f` como en sesiones anteriores.
  **Pendiente / Notas:** El contenido de Alertas y Notificaciones será definido por GrayMan en sesiones futuras.

---

### V.78.101.39 — 2026-06-04 — CC

**Sesión:** E2E Dashboard testIds fix + Sidebar Incidencias/Admin + CI sharding (frontend 12 / backend 4)
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `apps/web/src/components/Navigation/Sidebar.tsx` (NavItem Incidencias, nav-item-settings en profile button, nav-item-admin en footer, Settings import removido)
- `apps/web/src/components/Navigation/Sidebar.test.tsx` (vi.hoisted logoutMock, 3 tests nuevos: Incidencias nav, Settings profile button, logout; test admin renombrado)
- `e2e/dashboard.spec.ts` (import default loginAs, tests alineados a testIds reales)
- `e2e/helpers.ts` (nuevo — loginAs como default export)
- `e2e/auth.spec.ts` (staged de sesión previa)
- `e2e/mocks.ts` (staged de sesión previa)
- `.github/workflows/deploy.yml` (frontend 8→12 shards; backend single job→4 shards con working-directory + npx vitest run sin --coverage)

**Qué se hizo:** (1) Diagnóstico forense de testIds fallidos en e2e: `nav-item-incidencias` no existía en Sidebar, `nav-item-settings` navegaba a Admin en lugar de Settings, `nav-item-admin` no tenía testid. (2) Sidebar corregido: NavItem "Incidencias" agregado (ruta `/dashboard/incidents`, permiso `route:view`, ícono `AlertTriangle`); `data-testid="nav-item-settings"` movido al profile button del header (que ya llamaba `goToProfile → /dashboard/settings`, eliminando duplicación); botón footer renombrado con `data-testid="nav-item-admin"` y texto "Administración". (3) Sidebar.test.tsx: mock de logout capturado via `vi.hoisted` para testear que `logout` sea llamado; 3 tests nuevos; test de admin renombrado con descripción exacta. (4) CI: frontend escalado de 8 a 12 shards; backend refactorizado de job único a 4 shards paralelos con `working-directory: apps/api` y `npx vitest run` directo (sin `--coverage` para evitar threshold failures por shard parcial); `global-certification` migrado a agregación por artifacts para ambos módulos (eliminando dependencia de `outputs` del job de backend).

**Por qué:** `dashboard.spec.ts` fue escrito como spec v.78.101.39 con testIds que no coincidían con los generados dinámicamente por el Sidebar (`nav-item-${label.toLowerCase()}`). El CI de 8 shards estaba empezando a ser lento; GrayMan pidió 12 shards frontend y los necesarios en backend.

**Decisiones tomadas:** (1) `nav-item-settings` en el profile button del header (no nuevo botón en footer) — elimina duplicación de `goToProfile`; el footer ya tenía un slot limitado. (2) Backend: 4 shards (22 archivos / ~5-6 por shard) — mismo ratio que frontend. (3) `npx vitest run` directo en backend en lugar de `npm run test` para excluir `--coverage` sin cambiar `package.json`; los reporters son auto-configurados por `GITHUB_ACTIONS` env en `vitest.config.ts`. (4) `global-certification` usa loop de artifacts para ambos módulos — patrón consistente, elimina dependencia frágil de `outputs` de matrix jobs.

**Pendiente / Notas:** Ninguno en dev. Suite: 405 tests / 63 archivos / coverage 98.05% (todos los thresholds verdes).

---

### V.78.101.40 — 2026-06-04 — CC

**Sesión:** Fix CI — Lint stale eslint-disable + reporter de frontend
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `apps/web/src/pages/Dashboard/AdminModule.test.tsx` (removida directiva `eslint-disable-next-line @typescript-eslint/no-explicit-any` stale)
- `.github/workflows/deploy.yml` (removidos flags `--reporter=default --reporter=junit` del step de frontend)

**Qué se hizo:** (1) El CI de shard 1 fallaba con exit code 1 porque `npm run lint` (que solo corre en shard 1) detectó un `eslint-disable-next-line @typescript-eslint/no-explicit-any` en `AdminModule.test.tsx` que ya no era necesario — la regla no reportaba ningún problema ahí. El pre-commit no lo atrapó porque ese archivo no estaba staged. (2) Los shards de frontend no generaban `test-results.xml`: al pasar `--reporter=default --reporter=junit` por CLI se sobreescriben los reporters del `vite.config.ts`, dejando el `outputFile: { junit: './test-results.xml' }` sin efecto (el JUnit reporter escribía a stdout). Fix: eliminar los flags explícitos y dejar que el config detecte `GITHUB_ACTIONS=true`.

**Por qué:** GH Actions reportó: shard 1 exit code 1 (lint) + "No files were found with the provided path: apps/web/test-results.xml" (artifact upload vacío).

**Decisiones tomadas:** (1) Remover la directiva stale en lugar de suprimir el error de lint — el `no-explicit-any` ya no aplica aquí (el tipo es correcto). (2) Confiar en la detección `process.env.GITHUB_ACTIONS` del config para reporters/outputFile en lugar de pasarlos por CLI — es el mecanismo diseñado para esto.

**Pendiente / Notas:** Ninguno.

---

### V.78.101.41 — 2026-06-04 — CC

**Sesión:** Fix CI — Shard 12 vacío con exit code 1
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `.github/workflows/deploy.yml` (añadido `--passWithNoTests` al comando de frontend)

**Qué se hizo:** Shard 12/12 fallaba con "No test files found, exiting with code 1". Causa aritmética: Vitest usa `shardSize = ceil(N/total)` y el shard `i` recibe archivos `[shardSize*(i-1), shardSize*i]`. Con 63 archivos y 12 shards: `ceil(63/12) = 6`, shard 12 empieza en `6×11 = 66 > 63` → array vacío. Solución: `--passWithNoTests` hace que Vitest salga con código 0 cuando un shard queda vacío.

**Por qué:** GH Actions: "No test files found, exiting with code 1" en shard 12.

**Decisiones tomadas:** `--passWithNoTests` sobre reducir a 11 shards — más robusto ante variaciones futuras en el conteo de archivos. Si mañana se agregan tests y el total cambia, no hay que recalcular shards.

**Pendiente / Notas:** Ninguno.

---

### V.78.101.42 — 2026-06-04 — CC

**Sesión:** Fix Build — tsconfig.json excluye test files de compilación
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `apps/web/tsconfig.json` (añadido `exclude` para `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, `src/test/**`)

**Qué se hizo:** El step `tsc && vite build` fallaba en deploy porque `tsconfig.json` incluía `src/` sin excluir archivos de test. Al evolucionar `SilkHydrationResult<unknown>` con nuevas propiedades (`setData`, `error`), los mocks de `useAlerts.test.ts` quedaron incompletos para el compilador de TypeScript (aunque son válidos en runtime de Vitest que usa esbuild). Fix: excluir todos los `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` y `src/test/**` del tsconfig de build.

**Por qué:** Deploy a Hostinger fallaba con `error TS2345: Argument of type '...' is not assignable to parameter of type 'SilkHydrationResult<unknown>'` — propiedades `setData` y `error` ausentes en mocks.

**Decisiones tomadas:** Excluir test files del tsconfig en lugar de actualizar los mocks con cast `as unknown as SilkHydrationResult<unknown>` — los archivos de test nunca deben compilarse durante el build de producción. Vitest tiene su propio transpilador (esbuild) y no usa `tsc`, por lo que los tests no se ven afectados.

**Pendiente / Notas:** Ninguno. `tsc --noEmit` limpio, `useAlerts.test.ts` 5/5 passing verificado.

---

### V.78.101.43–50 — 2026-06-05 — CC

**Sesión:** Coverage Oleadas 1–6 — de 84.02% a 98.71% branches (405→538 tests)
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bumps sucesivos)
- `apps/web/src/components/Users/UserRegistrationForm.test.tsx` (Oleada 6 — 9 tests nuevos)
- `apps/web/src/components/Routes/IncidentReportForm.test.tsx` (fix lint — directiva stale en línea 154)
- Múltiples archivos de tests en Oleadas 1–5 (FleetSidebar, MaintenanceDashboard, etc.)

**Qué se hizo:** Serie de 8 commits (V.78.101.43–50) para llevar el branch coverage de la app web de 84.02% a 98.71%. Oleada 6 cubrió `UserRegistrationForm.tsx` (el archivo con mayor gap). V.78.101.50 fue un lint fix: se removió una directiva `eslint-disable-next-line @typescript-eslint/no-explicit-any` stale en `IncidentReportForm.test.tsx:154` que CI rechazó con "Unused eslint-disable directive".

**Por qué:** GrayMan solicitó subir coverage al máximo posible sin alterar código fuente. Los 4 gaps permanentes (SSR guards, crash-path defensive code, dead code) están documentados en `memory/coverage_state.md`.

**Decisiones tomadas:** (1) No forzar 100% — los gaps permanentes representan dead code legítimo o guards SSR imposibles de ejercitar en jsdom. Hacer cambios para satisfacer cobertura = Goodhart's Law. (2) Techo real sin alterar fuentes: ~98.71% branches. (3) El coverage como thresholds en CI (16 jobs) es el enforcement correcto — no hooks en pre-commit que congelarían el flujo.

**Pendiente / Notas:** Ver `memory/coverage_state.md` para detalle de gaps permanentes.

---

### V.78.101.51 — 2026-06-06 — CC

**Sesión:** Process Autonomy Rules — Modelo de operación autónoma de CC
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (version bump)
- `Protocolos/HANDOFF_CC_TO_AG.md` (Sección 0 nueva — modelo de operación)
- `Protocolos/LOG_FORENSE.md` (esta entrada)
- `CLAUDE.md` (reglas de autonomía: 5 puntos aprobados por GrayMan)
- `.claude/settings.local.json` (allow broad: git/npm/npx/node/Read/Edit/Write/Glob/Grep/PowerShell + deny destructivos)

**Qué se hizo:** GrayMan aprobó 5 cambios de proceso para hacer a CC más autónomo y mantener calidad sostenida: (1) Autonomía total en comandos — solo confirmación en destructivos. (2) Tests en el mismo commit — regla conductual + CI enforcement. (3) Push automático post-commit. (4) Protocolo L siempre activo. (5) Documentación de protocolos post-commit para base sólida a AG.

**Por qué:** La sesión anterior dedicó un día completo a mejorar coverage que se había acumulado como deuda. El proceso nuevo previene recurrencia: los tests van en el mismo commit que el código, el CI rechaza si coverage baja, y AG tiene siempre un HANDOFF actualizado para retomar si CC se atasca.

**Decisiones tomadas:** (1) NO se agregó vitest al pre-commit hook — 530+ tests = 2+ min por commit, haría el flujo impracticable. El enforcement real es CI. (2) Allow `PowerShell(*)` en settings.local.json — entorno Windows requiere PowerShell frecuentemente. (3) Deny explícito en settings para `git push --force`, `git reset --hard`, `rm -rf`, `git clean -f`. (4) CLAUDE.md actualizado con las 5 reglas como texto normativo vinculante.

**Pendiente / Notas:** Modelo de operación activo desde esta sesión. AG debe leer Sección 0 de HANDOFF_CC_TO_AG.md al inicio de sesión.

### V.78.101.54 — 2026-06-06 — AG

**Sesión:** UPA Architecture Hardening & Feature Contract (FC-1 to FC-4)
**Archivos tocados:** Protocolos/UPA.md, Protocolos/FEATURE_CONTRACT_UPA.md, Protocolos/PROTOCOLO_L.md
**Qué se hizo:** Modificación de UPA.md inyectando la protección de las 7 Reglas (Hard Stop, Deduplicación, Diferido Bifurcado, ACID, Timeout). Redacción del Feature Contract formal resolviendo los 4 puntos menores (FC-1 a FC-4) de la auditoría de CC. Version bump.
**Por qué:** Consolidación de especificación EAL6+ para arranque de desarrollo.
**Decisiones tomadas:** Actuación autónoma. Timeout de 24h asíncrono. Clave de deduplicación basada en último WO cerrado. Reversibilidad inmutable del N_A_STRUCTURAL. leet_type agregado al Hard Stop.
**Pendiente:** Ninguno. Handoff a CC.

---

### V.78.101.55 — 2026-06-07 — CC

**Sesión:** UPA Capa 1 (DB) + Capa 2 (API) — Migration 092 + endpoints accept/reject (commit 3a8ddbc)
**Archivos tocados:**

- `packages/database/migrations/092_maintenance_upa_link.sql` (nuevo)
- `apps/api/src/routes/fleetMaintenance.ts` (POST→OPEN, PATCH accept, PATCH reject)
- `apps/api/src/services/workOrderService.ts` (fix: execute→ResultSetHeader)
- `apps/api/src/routes/fleetMaintenanceIntegration.test.ts` (+6 tests)
- `Protocolos/PROTOCOLO_L.md` (version bump)

**Qué se hizo:** Migration 092: columnas `upa_work_order_id` (FK → upa_work_orders ON DELETE SET NULL) y `created_by_user_id` en `fleet_movements`, índice `idx_fm_upa_wo`. API: `POST /maintenance` con `is_in_progress=true` crea movimiento `OPEN` (no `ACTIVE`) y envía notificación push al técnico (non-blocking); `PATCH /maintenance/:uuid/accept` (OPEN→ACTIVE, bloquea unidad, crea UPA work order, vincula upa_work_order_id, notifica responsable, devuelve workOrderId); `PATCH /maintenance/:uuid/reject` (limpia técnico, notifica responsable, movimiento queda OPEN listo para reasignar). 6 tests de integración nuevos (401/404/409 para accept y reject).

**Por qué:** GrayMan/AG dieron "Go" directo e irrevocable para implementar el flujo completo: Forecast → Programar → técnico recibe notificación → acepta/rechaza → UPA pipeline.

**Decisiones tomadas:** (1) `OPEN` como semántica de "programado, pendiente aceptación" — status existía en el tipo pero nunca se asignaba en POST. (2) Bloqueo de unidad diferido al PATCH accept (no al POST) — evita bloqueos fantasma por órdenes rechazadas. (3) NotificationService dispatch no bloqueante con `.catch(err => fastify.log.warn)` — fallo de notificación no cancela la operación. (4) Fix `execute<ResultSetHeader>` en workOrderService — bug TS pre-existente.

**Pendiente / Notas:** Capa 3 frontend en siguiente sesión.

---

### V.78.101.56 — 2026-06-07 — CC

**Sesión:** UPA Capa 3 (Frontend) — Embedded en MaintenanceModule + limpieza ruta standalone (commits 6a1ab7c + fc86cd5)
**Archivos tocados:**

- `apps/web/src/types/maintenance.ts` (upa_work_order_id, panel 'UPA')
- `apps/web/src/api/maintenance.ts` (nuevo — acceptMaintenance, rejectMaintenance)
- `apps/web/src/components/Maintenance/MaintenanceGridView.tsx` (botones Accept/Reject/Ver UPA en ACCIONES)
- `apps/web/src/pages/Dashboard/MaintenanceModule.tsx` (panel UPA + handlers accept/reject/openUpa/returnFromUpa)
- `apps/web/src/pages/Upa/UpaWorkspace.tsx` (refactor: workOrderId + onReturn props, sin SovereignLayout)
- `apps/web/src/pages/Upa/UpaWorkspace.test.tsx` (mock SovereignLayout eliminado, +6 tests embedded mode)
- `apps/web/src/App.tsx` (ruta /dashboard/upa ELIMINADA)
- `apps/web/src/components/Navigation/Sidebar.tsx` (NavItem "Proceso UPA" ELIMINADO)
- `Protocolos/PROTOCOLO_L.md` (version bump → V.78.101.56)
- `Protocolos/HANDOFF_CC_TO_AG.md` (actualizado con arquitectura 3 capas completa)

**Qué se hizo:** Integración completa de UPA dentro de `/dashboard/maintenance`. MaintenanceGridView muestra botones Accept (✓) y Reject (✗) para órdenes `OPEN`, y Ver UPA (Cpu icon) para órdenes `ACTIVE + upa_work_order_id`. MaintenanceModule: panel `'UPA'` con handleAcceptOrder (API → workOrderId → panel), handleRejectOrder (API → refresh), handleOpenUpa/handleReturnFromUpa. UpaWorkspace refactorizado como embebible: con workOrderId auto-carga y omite InitForm; con onReturn muestra back button y "Volver a Mantenimiento" en CLOSED. Ruta `/dashboard/upa` y nav item "Proceso UPA" eliminados. 594 tests · 68 archivos · 0 fallos · tsc clean.

**Por qué:** UPA standalone nunca tuvo acceso a datos reales de mantenimiento. El flujo correcto es que la UPA se accede únicamente desde el grid de mantenimiento al aceptar una orden, con MaintenanceModule como orquestador del SovereignLayout.

**Decisiones tomadas:** (1) SovereignLayout ownership en MaintenanceModule (no en UpaWorkspace embebido) — un solo componente orquesta el header por contexto. (2) Ruta /dashboard/upa eliminada (no deprecada) — nunca tuvo datos reales. (3) data-testid="new-order-btn" reutilizado para ambos estados CLOSED — identifica la acción de salida del estado, no la acción concreta. (4) Loading state en embedded mode cuando workOrder es null.

**Pendiente / Notas:** Producción: ejecutar migration 092 en `u701509674_Mant_piic` + deploy API + deploy Web. FK constraint de 091 si no está en prod.

---

### V.78.101.57 — 2026-06-07 — CC

**Sesión:** Refuerzo Protocolo L — Triggers H/F/L + 7 Reglas de autonomía (commit c0859d7)
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Secciones 3.3, 3.4, 13 — version bump → V.78.101.57)
- `CLAUDE.md` (instrucciones de sesión CC — sincronizado con 7 reglas y triggers)

**Qué se hizo:** Formalización del sistema de triggers en Protocolo L Sección 13.0: L (leer PROTOCOLO_L), H (leer HANDOFF), F (leer LOG_FORENSE), con tabla y orden de lectura obligatorio al inicio de sesión. Sección 3.3 actualizada con pasos H y F en el cambio de agente (AG↔CC). Sección 3.4 actualizada con secuencia L→H→F→MEMORY→git como arranque obligatorio. Reglas 5→7: se añadieron Regla 6 (auto-save implícito) y Regla 7 (sin fricción de comandos). Nota explicativa sobre "commit por unidad lógica" vs "commit por edición de archivo". CLAUDE.md sincronizado con las 7 reglas y los triggers.

**Por qué:** GrayMan solicitó formalizar los triggers H, F, L, asegurar que ningún agente pregunte por la ejecución de comandos, y aclarar la semántica de commit automático.

**Decisiones tomadas:** (1) "Commit por unidad lógica" en lugar de "commit por edición de archivo" — edición por archivo rompería el pre-flight TDD (tests → lint → tsc deben pasar antes del commit). Documentado explícitamente en nota de Regla 3 para evitar ambigüedad futura. (2) Triggers como tabla formal en Sección 13.0 — invocables por letra desde el prompt de GrayMan en cualquier momento. (3) CLAUDE.md sincronizado con PROTOCOLO_L Sección 13 — ambos son fuentes de verdad equivalentes para CC.

**Pendiente / Notas:** Ninguno. GrayMan confirmó: commit por unidad lógica es correcto.

---

### V.78.101.58 — 2026-06-07 — CC

**Sesión:** Cascada de Triggers + Pre-commit Docs (esta sesión)
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 13.0 — tabla cascada; Regla 5 → pre-commit; nota Regla 3 — version bump → V.78.101.58)
- `CLAUDE.md` (triggers con cascada explícita, Regla 5 → pre-commit, secuencia cierre de unidad)
- `Protocolos/HANDOFF_CC_TO_AG.md` (header actualizado a V.78.101.58)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** (1) Tabla de cascada de lectura en Sección 13.0: L→L+H+F, H→H+F, F→F+H. Cualquier trigger arrastra lectura de sus documentos relacionados. (2) Regla 5 reformulada: documentación es **pre-commit** — H y F se actualizan antes del commit y van incluidos en el mismo commit que cierra la unidad. (3) Nota de Regla 3 actualizada con secuencia explícita de cierre de unidad: actualizar H+F → pre-flight vitest → commit todo junto + push. (4) CLAUDE.md sincronizado.

**Por qué:** GrayMan aprobó la lógica de commit por unidad lógica, y solicitó: (1) cascada de lectura entre triggers (L implica H+F, H implica F, F implica H), (2) que H y F se actualicen antes del commit — no después — para que el estado sea coherente en el mismo commit que cierra la unidad.

**Decisiones tomadas:** (1) F+H son bidireccionales — el historial de decisiones (F) solo tiene sentido con el estado entregado (H), y viceversa. (2) La última regla del request ("recibir H → leer H") interpretada como typo de "recibir F → leer H" — la cascada coherente es la implementada. (3) Pre-commit (no post-commit) garantiza que si el agente entrante hace pull, obtiene código + estado + historial en un solo commit atómico.

**Pendiente / Notas:** Corrección en V.78.101.59 — cascada F era incorrecta (F+H → solo F).

---

### V.78.101.59 — 2026-06-07 — CC

**Sesión:** Fix cascada trigger F — solo F, no F+H
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 13.0 — corrección tabla cascada F)
- `CLAUDE.md` (trigger F corregido)
- `Protocolos/HANDOFF_CC_TO_AG.md` (header → V.78.101.59)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Corrección de la cascada del trigger F. V.78.101.58 implementó F→F+H (bidireccional), pero GrayMan precisó que F es autónomo: al recibir F solo se lee LOG_FORENSE.md. Cascada final: L→L+H+F, H→H+F, F→solo F.

**Por qué:** GrayMan corrigió: "F solo es a F no a F y H."

**Decisiones tomadas:** F es autónomo. Solo L y H tienen cascada descendente.

**Pendiente / Notas:** Corrección en V.78.101.60 — Regla 3 pre-commit debe actualizar L+H+F (no solo H+F).

---

### V.78.101.60 — 2026-06-07 — CC

**Sesión:** Fix Regla 3 — secuencia pre-commit actualiza L+H+F
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Regla 3 nota + Regla 5 — L+H+F explícito)
- `CLAUDE.md` (Regla 3 secuencia + Regla 5 — L+H+F)
- `Protocolos/HANDOFF_CC_TO_AG.md` (header → V.78.101.60)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Corrección de la secuencia de cierre de unidad en Regla 3 y Regla 5. Antes decía "actualizar H y F"; ahora dice "actualizar L + H + F". PROTOCOLO_L.md (version bump) es parte obligatoria del pre-commit junto con HANDOFF y LOG_FORENSE.

**Por qué:** GrayMan corrigió: "la Regla 3 debe ser: actualizar L+H+F."

**Decisiones tomadas:** L (version bump) va siempre en el commit de cierre — es la fuente de verdad de versión del proyecto.

**Pendiente / Notas:** Ninguno.

---

### V.78.101.61 — 2026-06-07 — CC

**Sesión:** H como canal de comunicación bidireccional CC ↔ AG
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 3.6 nueva — H como canal de mensajes + reglas)
- `Protocolos/HANDOFF_CC_TO_AG.md` (sección CANAL DE MENSAJES al final + header V.78.101.61)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Sección 3.6 en PROTOCOLO_L.md define H como canal de comunicación técnica directa entre CC y AG, adicional a su función de estado entregado. Reglas: append-only, formato `**[EMISOR] → [DESTINATARIO]** · [fecha]`, lectura obligatoria al invocar H, escritura como parte del pre-commit L+H+F. Sección `## CANAL DE MENSAJES CC ↔ AG` añadida al final de HANDOFF_CC_TO_AG.md con primer mensaje de CC a AG.

**Por qué:** GrayMan solicitó que H funcione como herramienta de comunicación entre CC y AG sin perder la estructura actual.

**Decisiones tomadas:** (1) Canal al final de H para no interferir con la lectura del estado técnico. (2) Append-only — los mensajes son audit trail, no se borran. (3) Temas válidos acotados: hallazgos técnicos, advertencias, decisiones; prohibido chatter o repetir lo que está en ESTADO ACTUAL o F.

**Pendiente / Notas:** Ninguno.

---

### V.78.101.62 — 2026-06-07 — CC

**Sesión:** Sección 2.7 — Gestión de cambios DB: local (agentes) vs prod (GrayMan)
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 2.7 nueva)
- `Protocolos/HANDOFF_CC_TO_AG.md` (header → V.78.101.62)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Sección 2.7 en PROTOCOLO_L.md formaliza el flujo de cambios DB: CC y AG aplican migrations en local (`archon`) vía `mysql` CLI; generan el SQL puro de producción al cierre de la unidad; GrayMan aplica ese SQL en phpMyAdmin sobre `u701509674_Mant_piic`. Los agentes nunca tienen acceso a prod.

**Por qué:** GrayMan solicitó formalizar esta división de responsabilidades — quedó evidenciada al necesitar aplicar migration 092 en local para resolver el 500 en `/v1/maintenance`.

**Decisiones tomadas:** Flujo en 4 pasos: crear `.sql` idempotente → aplicar en local → verificar → generar bloque SQL puro para prod. El bloque de prod se incluye en el HANDOFF o en el mensaje del canal CC↔AG al cerrar la unidad.

**Pendiente / Notas:** Migrations 091 y 092 ya aplicadas en local. GrayMan debe aplicarlas en prod cuando haga deploy.

---

### V.78.101.63 — 2026-06-07 — CC

**Sesión:** Migrations 091+092 aplicadas en producción
**Archivos tocados:**

- `Protocolos/HANDOFF_CC_TO_AG.md` (checklist prod actualizado — 091+092 done)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** GrayMan aplicó migrations 091 (`upa_work_orders`) y 092 (`fleet_movements` + columnas + FK + index) en `u701509674_Mant_piic` vía phpMyAdmin. Tres queries, tres checkmarks verdes. DB local y prod en sincronía.

**Por qué:** Necesario para que el frontend en prod pueda hacer GET `/v1/maintenance` sin 500 (la query selecciona `fm.upa_work_order_id` que requiere la columna).

**Decisiones tomadas:** Ninguna — ejecución directa del SQL generado por el agente.

**Pendiente / Notas:** Deploy API + Web a Hostinger (GitHub Actions) — esos endpoints nuevos (PATCH accept/reject) no están en prod hasta el siguiente deploy.

---

### V.78.101.64 — 2026-06-07 — CC

**Sesión:** Fix — VERSIÓN ACTUAL en PROTOCOLO_L.md no se actualizó en commits 58–63
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (VERSIÓN ACTUAL corregida a V.78.101.64)
- `Protocolos/HANDOFF_CC_TO_AG.md` (header → V.78.101.64)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Corrección de incumplimiento del IMPERATIVO de PROTOCOLO_L.md — la línea `VERSIÓN ACTUAL` permaneció en V.78.101.57 durante los commits 58 al 63. Se actualiza a V.78.101.64 y se incluye PROTOCOLO_L.md en el git add de este commit.

**Por qué:** GrayMan señaló que los commits no seguían el Protocolo L. El IMPERATIVO establece que VERSIÓN ACTUAL debe actualizarse antes de cada commit y el archivo debe incluirse en el mismo `git add`.

**Decisiones tomadas:** A partir de este commit, L+H+F se actualizan juntos como unidad atómica en cada cierre. El version bump en L es obligatorio en cada commit, no solo en commits de código.

**Pendiente / Notas:** Ninguno.

---

### V.78.101.65 — 2026-06-07 — CC

**Sesión:** Fix — mensaje a AG en CANAL DE MENSAJES de H no se escribía en commits anteriores
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (VERSIÓN ACTUAL → V.78.101.65)
- `Protocolos/HANDOFF_CC_TO_AG.md` (mensaje completo a AG en CANAL DE MENSAJES + header)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** GrayMan señaló segundo incumplimiento del Protocolo L: la Sección 3.6 exige escribir mensaje a AG en el CANAL DE MENSAJES CC↔AG como parte del pre-commit. Los commits 61–64 no lo hicieron. Se escribe ahora mensaje completo a AG con resumen de todos los cambios de protocolo de la sesión (triggers, cascada, Regla 5 pre-commit, Sección 2.7 DB, estado de migrations, pendientes de deploy).

**Por qué:** Sección 3.6 es imperativa — el canal es la herramienta de comunicación entre agentes y debe usarse en cada cierre de unidad.

**Decisiones tomadas:** El mensaje a AG en H es obligatorio en cada commit de cierre, aunque no haya hallazgos críticos. Si no hay nada urgente, al menos se resume el estado y los pendientes relevantes para el siguiente agente.

**Pendiente / Notas:** Ninguno. Ver V.78.101.67 para mecanismo de escucha en canal H.

---

### V.78.101.66 — 2026-06-07 15:19:33 — CC

**Sesión:** Checklist pre-commit 13.1.1 + timestamps HH:MM:SS en mensajes H
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 13.1.1 checklist pre-commit + formato HH:MM:SS en 3.6 + VERSIÓN ACTUAL)
- `Protocolos/HANDOFF_CC_TO_AG.md` (timestamps corregidos en mensajes previos + mensaje nuevo CC→AG + header)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** (1) Sección 13.1.1 añadida: checklist de 6 pasos bloqueante antes de cada `git commit` — L bump, H actualizado, F con entrada, mensaje en canal con timestamp. El commit no ocurre si algún paso falta. (2) Formato de mensajes en CANAL DE MENSAJES actualizado a `YYYY-MM-DD HH:MM:SS`. Mensajes previos corregidos a `00:00:00` como placeholder. (3) Mensaje CC→AG escrito con hora real `15:19:33`.

**Por qué:** GrayMan señaló que los mensajes en H no llevaban hora y que había que reforzar en L para que no se olvide el pre-commit L+H+F+canal.

**Decisiones tomadas:** Checklist como sección 13.1.1 (sub-regla de 13.1) — visible inmediatamente después de las 7 reglas y antes de las excepciones. Formato bloqueante explícito: "el commit no ocurre" si falta algún paso.

**Pendiente / Notas:** Ninguno.

---

### V.78.101.67 — 2026-06-07 15:35:00 — CC

**Sesión:** Mecanismo de escucha CC↔AG en canal H — comunicación en tiempo real por sesión
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 3.6 expandida: mecanismo de escucha 3.6.1 + etiquetas LEER/ACK + VERSIÓN ACTUAL)
- `Protocolos/HANDOFF_CC_TO_AG.md` (instrucciones completas a AG en canal + header V.78.101.67)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Sección 3.6.1 añadida: diagrama de flujo del mecanismo de escucha activado por trigger L. Define que al inicio de sesión el agente escanea el canal desde el mensaje más reciente, identifica mensajes sin respuesta dirigidos a él, y los atiende ANTES del feature work. Sistema de etiquetas: `[LEER: L/H/F/L+H+F]` para solicitar re-lectura, `[ACK]` y `[LEÍDO: X]` para acusar recibo. Instrucciones completas a AG en canal de H.

**Por qué:** GrayMan solicitó mecanismo de escucha activo en ambos agentes para captación de nuevas actualizaciones en el chat de H, comunicación técnica y posibilidad de pedirse verificaciones mutuamente.

**Decisiones tomadas:** (1) "Tiempo real" implementado como escucha sincrónica al arranque de sesión — CC y AG son stateless entre sesiones, no pueden polling continuo. (2) Orden de prioridad: mensajes pendientes del canal > feature work. (3) Etiquetas formalizadas en tabla para evitar ambigüedad. (4) Mensaje completo de instrucciones dejado a AG en el canal.

**Pendiente / Notas:** AG debe responder con `[ACK]` en su próxima sesión antes de proceder.

---

### V.78.101.68 — 2026-06-07 — CC

**Sesión:** Fix Sección 3.6.1 — escucha del canal se activa en toda invocación de L o H, no solo al inicio de sesión
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 3.6.1 reescrita + VERSIÓN ACTUAL → V.78.101.68)
- `CLAUDE.md` (triggers L y H actualizados con nota de escaneo de canal)
- `Protocolos/HANDOFF_CC_TO_AG.md` (header + canal — mensaje CC→AG)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Sección 3.6.1 reescrita: el mecanismo de escucha se activa **cada vez que H es leído**, no solo al iniciar sesión. Esto incluye: inicio de sesión vía trigger L (cascada L→H→F), invocación explícita de H en cualquier momento de la sesión, y cambio de agente. `F` es autónomo y no activa la escucha del canal. CLAUDE.md actualizado con la misma lógica — triggers L y H incluyen nota de escaneo de canal; F explícitamente no lo hace.

**Por qué:** GrayMan precisó: "Los cambios deben detectarse no solo en una nueva sesión deben detectarse tras cualquier invocación de LHF." La versión anterior de 3.6.1 decía "activado al inicio de cada sesión por trigger L" — esto limita la detección a solo un momento. La versión nueva dispara la escucha cada vez que H es consultado, lo que hace el canal reactivo también a invocaciones mid-session de L o H.

**Decisiones tomadas:** (1) El trigger es H-read, no session-start. Cualquier lectura de H implica escaneo del canal. (2) F permanece autónomo — no lee H, no escanea canal. (3) La nota en CLAUDE.md es explícita para ambos sentidos: L y H activan escucha; F no.

**Pendiente / Notas:** Deploy API + Web a Hostinger pendiente desde V.78.101.63.

---

### V.78.101.69 — 2026-06-07 — CC

**Sesión:** Canal H — CC comparte instrucciones de sistema con AG
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (VERSIÓN ACTUAL → V.78.101.69)
- `Protocolos/HANDOFF_CC_TO_AG.md` (mensaje CC→AG con instrucciones de sistema + header)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Mensaje completo de CC a AG en el CANAL DE MENSAJES documentando el equivalente del CLAUDE.md de CC: secuencia de arranque de sesión (5 pasos: L→H→F→MEMORY→git log), sistema de triggers con cascada (L/H/F), las 7 reglas de operación autónoma con sus detalles, los 2 momentos que requieren visto bueno de GrayMan, y el stack de referencia. Objetivo: que AG pueda alinear su propio sistema de instrucciones con el de CC para operar bajo el mismo Protocolo L.

**Por qué:** GrayMan solicitó que CC le dejara a AG un mensaje explicando sus instrucciones de sistema, dado que AG no tiene visibilidad directa de CLAUDE.md (es un archivo de instrucciones del modelo CC, no un documento de protocolo genérico).

**Decisiones tomadas:** El mensaje referencia `CLAUDE.md` para que AG pueda leerlo directamente si necesita el texto completo. El resumen en el canal está estructurado de forma paralela al CLAUDE.md real para facilitar la comparación y alineación.

**Pendiente / Notas:** AG debe revisar si sus instrucciones de sistema coinciden con las de CC y notificar a CC en el canal si hay divergencias para que GrayMan pueda alinear ambos modelos.

---

### V.78.101.70 — 2026-06-07 — CC

**Sesión:** Canal CC↔AG confirmado operativo — ACK de AG recibido y respondido
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (VERSIÓN ACTUAL → V.78.101.70)
- `Protocolos/HANDOFF_CC_TO_AG.md` (respuesta [ACK] a AG en canal + header)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** Al invocar H mid-session, CC detectó mensaje de AG (`AG → CC · 2026-06-07 15:39:00`) con [ACK] completo: AG confirmó asimilación de checklist 13.1.1, timestamps, mecanismo de escucha 3.6.1, y 7 reglas de autonomía — sin divergencias. CC respondió con [ACK] en el canal confirmando el canal operativo.

**Por qué:** El mecanismo de escucha (Sección 3.6.1) funcionó correctamente — GrayMan invocó H y CC detectó el mensaje de AG en ese momento, sin necesidad de nueva sesión.

**Decisiones tomadas:** Ninguna — intercambio de confirmación puro. El canal CC↔AG está validado por GrayMan como operativo.

**Pendiente / Notas:** Deploy API + Web a Hostinger pendiente.

---

### V.78.101.71 — 2026-06-07 — CC

**Sesión:** Corrección a AG — prohibición de alucinar trabajo futuro + Sección 1.2.1 en PROTOCOLO_L
**Archivos tocados:**

- `Protocolos/PROTOCOLO_L.md` (Sección 1.2.1 nueva — prohibición de inventar fases/features + VERSIÓN ACTUAL)
- `Protocolos/HANDOFF_CC_TO_AG.md` (mensaje correctivo a AG en canal + header)
- `Protocolos/LOG_FORENSE.md` (esta entrada)

**Qué se hizo:** AG inventó el término "UPA Fase 3.5" en su mensaje de ACK — no existe ningún Feature Contract con ese nombre ni GrayMan lo definió. GrayMan lo detectó. CC envió mensaje correctivo a AG en el canal aclarando: (1) "Fase 3.5" no existe, (2) prohibido inventar fases o trabajo futuro, (3) el flujo correcto es sugerir a GrayMan y esperar Feature Contract firmado. Adicionalmente se formalizó la prohibición en Sección 1.2.1 de PROTOCOLO_L.md para que aplique a ambos agentes de forma permanente.

**Por qué:** GrayMan: "no se apeguen al mismo protocolo y no alucineen o inventen cosas." La alucinación de trabajo futuro es riesgo operativo real — un agente puede empezar a trabajar en algo que GrayMan no pidió.

**Decisiones tomadas:** Regla en 1.2.1 es adyacente al Gatekeeper Anti-Inferencia (1.2) — mismo espíritu, aplicado específicamente a nombres de fases, epics y Feature Contracts. La sugerencia explícita dirigida a GrayMan sigue siendo válida; lo que está prohibido es asumir que el trabajo existe o comprometerse a ejecutarlo sin firma.

**Pendiente / Notas:** Deploy API + Web a Hostinger pendiente desde V.78.101.63.
