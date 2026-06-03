# HANDOFF CC → AG — Archon ERP

```
HANDOFF CC → AG
═══════════════════════════════════════════════════════════════
Versión activa  : V.78.101.23_Completion_Gaps_And_Security_Hardening
Commit          : (pending push)
Fecha           : 2026-06-02
Agente saliente : CC (Claude Code)
Agente entrante : AG (Antigravity)
═══════════════════════════════════════════════════════════════
```

---

## 1. ESTADO DEL PROYECTO

El proyecto está **limpio y en main**. No hay ramas colgantes, no hay WIP.

Suite de tests: **API 254/254 · Web 277/277** — delta = 0 regresiones.

---

## 2. QUÉ SE CONSTRUYÓ EN ESTA SESIÓN

### 2.1 Módulo Settings — Alertas e Identidad (V.78.101.8–16)

Panel de alertas vacío por defecto al hacer clic en avatar. Header con `ArchonManagementCard` que alterna a Configuración de Identidad. `ArchonProfilePanel` refactorizado con layout 2 columnas, `card-archon-sovereign` borders, spacing reducido.

### 2.2 Centro de Comando — Routing y Limpieza (V.78.101.17)

- 11 tarjetas → 9 (eliminadas Activos Totales + Mantenimiento)
- 9 botones vinculados a módulos correctos con query params
- `FleetModule` lee `?categoria` y `?status` al montar para pre-filtrar tabla

### 2.3 Módulo Incidencias (V.78.101.18)

Nueva ruta `/dashboard/incidents` con tabla soberana via `GET /v1/incidents`. Registrada en `App.tsx`. 6 tests MSW.

### 2.4 REFACTOR Completo — 3 Fases (V.78.101.19–21)

| Fase           | Hallazgos                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Fase 1 — Bajo  | SQL alias `unitName→unitId` (finance)                                                                                          |
| Fase 2 — Medio | `constants/statuses.ts`, `imageUtils.ts`, catalog cache con TTL, props drilling FleetGridView                                  |
| Fase 3 — Alto  | `constants/maintenance.ts` (API+Web), `CategoryAnalyticsCard`, computeServiceType constants mirror, useFleetForm return limpio |

### 2.5 Security Hardening A01:2021 (V.78.101.22–23)

JWT `addHook('onRequest')` añadido a: `catalogs.ts`, `geolocation.ts`, `fleetMaintenance.ts`, `fleetRoutes.ts`. Tests de 401 añadidos. Total rutas protegidas: 100%.

---

## 3. DECISIONES ARQUITECTÓNICAS TOMADAS (inmutables)

| Decisión                                                       | Razón                                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `computeServiceType` sigue duplicada pero con constants mirror | Shared package requiere setup de monorepo — riesgo elevado para este sprint   |
| `archonCache` TTL = 1h para catálogos                          | Catálogos son read-only; 1h es balance razonable entre frescura y rendimiento |
| `CategoryAnalyticsCard` en `components/Dashboard/`             | ArchonCenter ya no tiene lógica de render >20 cc — cumple Protocolo L         |
| fleetRoutes: inline jwtVerify removidos                        | El addHook a nivel de ruta los hace redundantes                               |

---

## 4. ARCHIVOS QUE NO DEBE TOCAR AG SIN LEER ANTES

| Archivo                                            | Razón                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/api/src/constants/statuses.ts`               | Fuente de verdad de strings de estado — cambio aquí impacta 4 rutas |
| `apps/api/src/constants/maintenance.ts`            | Mirror en `apps/web/src/constants/maintenance.ts` — modificar ambos |
| `apps/web/src/utils/imageUtils.ts`                 | Usado por ArchonProfilePanel — no duplicar en otros componentes     |
| `apps/web/src/pages/Dashboard/IncidentsModule.tsx` | Módulo nuevo — coordinar con GrayMan para scope de futuras alertas  |

---

## 5. PENDIENTES / PRÓXIMOS PASOS SUGERIDOS

### 5.1 Contenido del Panel de Alertas (Alta prioridad)

`AlertsPanel.tsx` está vacío por diseño — GrayMan definirá qué aparece ahí. Candidatos: alertas de mantenimiento vencido, unidades en estado crítico, incidentes abiertos.

### 5.2 RBAC Granular (pre go-live obligatorio)

Los permisos existen en JWT (`permissions[]`) pero ningún endpoint los valida más allá de `isAuthenticated`. Solo `admin.ts` verifica `isOmnipotent`. Necesita: `checkPermission('fleet:write')` etc. antes del go-live.

### 5.3 E2E Tests en local

Playwright ahora soporta `E2E_ENV=local` para apuntar a localhost:5173. Los tests de `auth.spec.ts` y `dashboard.spec.ts` necesitan ajuste de selectores para funcionar en local vs prod.

### 5.4 DB Sync a producción (pendiente de validación con cliente)

Backfill de `financial_transactions` (run_087/088/089) pendiente de validación de montos con cliente antes de ejecutar en prod.

---

## 6. CONTEXTO TÉCNICO PARA AG

### Stack recordatorio

- **API:** Fastify + TypeScript + MySQL2 (raw SQL) — `apps/api/src/`
- **Web:** React 18 + Vite + TypeScript + TailwindCSS — `apps/web/src/`
- **DB local:** `archon` · **DB prod:** `u701509674_Mant_piic`
- **Tests:** Vitest 3.2.4 + Testing Library + MSW 2.x

### Nuevos archivos clave

```
apps/api/src/constants/statuses.ts       — UNIT_STATUS, MOVEMENT_STATUS
apps/api/src/constants/maintenance.ts    — ciclo km, ventanas, alertas predictivas
apps/web/src/constants/maintenance.ts    — mirror del anterior (mantener en sync)
apps/web/src/utils/imageUtils.ts         — compressImage, resolveProfileImageUrl
apps/web/src/components/Dashboard/      — CategoryAnalyticsCard
apps/web/src/pages/Dashboard/           — IncidentsModule, SettingsModule (refactored)
```

---

_Handoff generado por CC (Claude Code) — 2026-06-02 — V.78.101.23_
