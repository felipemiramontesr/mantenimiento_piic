# 🔱 PROTOCOLO DE COORDINACIÓN ENTRE IAs

### Archon ERP — mantenimiento.piic.com.mx

**Versión:** 1.1.0 · **Fecha:** 2026-05-25 · **Autor:** Felipe Miramontes

---

## 1. IDENTIDAD DE LOS AGENTES

| Atributo                | Antigravity (AG)                                                                                | Claude Code (CC)                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Plataforma**          | Google Gemini Advanced / Antigravity IDE                                                        | Anthropic Claude · VS Code Extension                                                     |
| **Acceso principal**    | Chat web + terminal integrada (PowerShell)                                                      | VS Code · acceso directo a archivos y terminal                                           |
| **Fortaleza**           | Planificación arquitectónica, análisis multi-capa, generación de planes detallados, Protocolo L | Edición de archivos in-place, refactoring local, navegación de codebase, auditoría de DB |
| **Limitación**          | Escritura de archivos vía scripts intermedios (PowerShell + Node.js)                            | Sin memoria persistente entre sesiones salvo contexto de ventana                         |
| **Compromisos activos** | Protocolo L, Protocolo Commit, reglas de versionado                                             | Linting on-save, formatting con Prettier, TypeScript strict                              |

---

## 2. FILOSOFÍA DE TRABAJO: PAIR PROGRAMMING DUAL-IA

Adoptamos el modelo **Driver / Navigator** del Pair Programming clásico, adaptado para alternancia asíncrona:

```
┌─────────────────────────────────────────────────────────────┐
│  DRIVER (quien escribe código activo en ese momento)        │
│  NAVIGATOR (quien revisa, anticipa problemas, da contexto)  │
│                                                             │
│  Cuando Felipe trabaja con AG → AG es Driver               │
│  Cuando Felipe trabaja con CC → CC es Driver               │
│  El Navigator es SIEMPRE este archivo + el historial git    │
└─────────────────────────────────────────────────────────────┘
```

**Regla de oro:** Ningún agente debe sobreescribir trabajo del otro sin leer primero el estado actual del archivo en disco y el último commit relevante.

---

## 3. SISTEMA DE HANDOFF (TRASPASO DE TURNO)

### 3.1 Bloque de Estado Activo

Cuando Felipe cambia de IA, el agente saliente (o el usuario) actualiza la sección **ESTADO ACTIVO** de este archivo. El agente entrante **DEBE leer esta sección antes de cualquier acción**.

---

## 🟢 ESTADO ACTIVO

> **Última actualización:** 2026-05-25 · Handoff AG → CC (Hotfix Branch)
> **Agente saliente:** Antigravity (AG)
> **Agente entrante:** Claude Code (CC)
> **Última versión committeada:** `d782cdf` en rama `hotfix/core-mining-cumulative-patch`

### Trabajo completado en la última sesión (AG):

- [x] Validación forense de tareas vs PDF de cliente para MINOR_MINING y Reglas de Marca (colores).
- [x] Corrección (Hotfix) de cascada acumulativa para MINOR_MINING en hitos de agencia.
- [x] Refactorización de query SQL de marcas para aislar parámetros y hacer la evaluación 100% agnóstica (`brandId`, `fuelTypeId`).
- [x] Ejecución y resguardo del script de hidratación masiva (`packages/database/scripts/run_084_seed_maintenance.js`) para normalizar la matriz de mantenimiento preventivo base y marcas.
- [x] **Hotfix Estructural**: Transición definitiva del motor de plantillas a paquetes de mantenimiento discretos (1:1), desmantelando la herencia acumulativa jerárquica para eliminar el "ruido" en el checklist y adaptándose a la filosofía paramétrica real del negocio. Flujo aditivo de mina preservado.
- [x] Validación de compilación estricta (`tsc --noEmit`) en `apps/api` exitosa en repetidas ocasiones.
- [x] Commit y push de la rama `hotfix/core-mining-cumulative-patch` al repositorio remoto, lista para revisión y merge de CC.

### Archivos modificados en progreso:

```
(Ninguno - Árbol limpio en la rama hotfix)
```

### Próxima tarea sugerida:

> Commit del bloque de mantenimiento (lifecycle + cyclic engine + cumulative map).
> Luego: considerar módulo de scheduling por días (trigger 90/180 días — ver hallazgo en sección 14).

### Notas para el agente entrante:

- El campo `placas` en `fleet_units` está **cifrado en reposo**. No exponer en UI sin pasar por el servicio de desencriptación (`encryption.ts`).
- Los scripts Node.js para escritura de archivos DEBEN usar `\uXXXX` para caracteres no-ASCII (ver Hotfix V.78.100.209).
- `ArchonSelect` usa React Portal en `#archon-select-portal` — el dropdown es `position: fixed`, siempre abre hacia abajo.
- `computeServiceType` existe en dos lugares **idénticos** — si se modifica el algoritmo, ACTUALIZAR AMBOS: `apps/api/src/routes/fleetMaintenance.ts` y `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx`.
- El mapa acumulativo `cumulativeMap` vive **solo en el backend** (GET /template). El frontend no necesita saber de acumulación — solo envía el tipo computado y el backend expande.

---

## 4. PROTOCOLO L (OBLIGATORIO PARA AMBOS AGENTES)

Cuando el usuario diga **"Protocolo L"**, el agente DEBE responder con una matriz de 4 columnas antes de ejecutar cualquier cambio:

| Columna | Pregunta                      | Propósito                     |
| ------- | ----------------------------- | ----------------------------- |
| **I**   | ¿Qué entiendo del problema?   | Diagnóstico de causa raíz     |
| **II**  | ¿Qué opino sobre la solución? | Juicio técnico con fundamento |
| **III** | ¿Qué propongo?                | Plan de acción concreto       |
| **IV**  | Ejecutando                    | Implementación tras análisis  |

**Regla:** No iniciar implementación sin completar las 4 columnas en la respuesta.

---

## 5. PROTOCOLO COMMIT

### 5.1 Formato de versión

```
V.{MAJOR}.{MINOR}.{PATCH}_{Descriptor_CamelCase_Underscore}
```

- **MAJOR:** Cambios arquitectónicos o de módulo
- **MINOR:** Nuevas features o refactors significativos
- **PATCH:** Hotfixes, ajustes de UI, correcciones menores

### 5.2 Secuencia obligatoria antes de commit

```bash
# 1. ESLint — 0 errores, 0 warnings
npx eslint [archivos] --max-warnings=0

# 2. TypeScript — 0 errores
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json

# 3. Git add + commit (husky ejecuta lint-staged automáticamente)
git add [archivos específicos]
git commit -m "V.X.Y.Z_Descriptor"
```

### 5.3 Versión actual del proyecto

```
Última versión committeada: V.78.100.213
Próximo commit estimado:    V.78.100.214 (bloque mantenimiento lifecycle + cyclic engine)
```

---

## 6. ARQUITECTURA DEL PROYECTO

### 6.1 Stack tecnológico

```
monorepo/
├── apps/
│   ├── api/          → Fastify + TypeScript + MySQL2 + Zod
│   └── web/          → React 18 + Vite + TypeScript + TailwindCSS
├── Protocolos/       → Documentos de coordinación y protocolo
└── datosCliente/     → Hallazgos, contexto de negocio
```

### 6.2 Base de datos

- **Motor:** MySQL · Base de datos: `archon`
- **Credenciales locales:** `host: 127.0.0.1`, `user: root`, `password: ''`
- **Encriptación:** Datos PII cifrados en reposo (AES) — `placas`, `numeroSerie`, `circulationCardNumber`
- **ORM:** Ninguno — queries raw con `mysql2/promise`

### 6.3 Patrones de código críticos

#### Backend (API)

```typescript
// ✅ CORRECTO — transacción con rollback garantizado
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  // ... operaciones ...
  await connection.commit();
  return reply.code(201).send({ success: true });
} catch (error) {
  await connection.rollback();
  return reply.code(400).send({ success: false, message: (error as Error).message });
} finally {
  connection.release(); // SIEMPRE liberar
}
```

#### Frontend (React)

```typescript
// ✅ CORRECTO — explicit return types en event handlers
onClick={(): void => setOpen(false)}

// ✅ CORRECTO — no-nested-ternary: usar función helper
const getLabel = (inProgress: boolean): string => {
  if (inProgress) return 'Registrar en Taller';
  return 'Asentar Servicio';
};

// ❌ INCORRECTO — nested ternary (regla ESLint no-nested-ternary)
const label = isRec ? 'A' : mode === 'X' ? 'B' : 'C';

// ❌ INCORRECTO — for...of (regla ESLint no-restricted-syntax)
for (const item of list) { ... }
// ✅ CORRECTO — usar forEach/map/reduce
list.forEach((item) => { ... });
```

### 6.4 Componentes UI críticos

| Componente                    | Ubicación                                        | Notas                                                                |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `ArchonSelect`                | `apps/web/src/components/ArchonSelect.tsx`       | React Portal en `#archon-select-portal`, siempre abre hacia abajo    |
| `ArchonField`                 | `apps/web/src/components/ArchonField.tsx`        | Wrapper de label + input con icono                                   |
| `ArchonDataTable`             | `apps/web/src/components/UI/ArchonDataTable.tsx` | Tabla con sorting y loading state                                    |
| `MaintenanceRegistrationForm` | `apps/web/src/components/Maintenance/`           | Cyclic Engine v4.0 — computeServiceType + is_in_progress automático  |
| `MaintenanceCompletionPanel`  | `apps/web/src/components/Maintenance/`           | Cierre de orden ACTIVE → PATCH /maintenance/:uuid/complete           |
| `MaintenanceGridView`         | `apps/web/src/components/Maintenance/`           | Filas ACTIVE en ámbar · botón "Finalizar Servicio" en columna UNIDAD |

---

## 7. MÓDULOS DEL SISTEMA

### 7.1 Módulos activos (en producción local)

| Módulo          | Ruta API          | Estado                                                             |
| --------------- | ----------------- | ------------------------------------------------------------------ |
| Fleet (Flota)   | `/v1/fleet`       | ✅ Estable                                                         |
| Mantenimiento   | `/v1/maintenance` | ✅ Lifecycle completo — CTI + Cyclic Engine + Cumulative Checklist |
| Rutas           | `/v1/routes`      | ✅ Estable                                                         |
| Usuarios        | `/v1/auth/users`  | ✅ Estable                                                         |
| Telemetría      | `/v1/telemetry`   | ✅ Estable                                                         |
| Geolocalización | `/v1/geolocation` | ✅ Estable                                                         |
| Catálogos       | `/v1/catalogs`    | ✅ Estable                                                         |

### 7.2 Módulos en desarrollo / deuda técnica identificada

| Módulo / Tarea           | Descripción                                                                                        | Prioridad |
| ------------------------ | -------------------------------------------------------------------------------------------------- | --------- |
| Scheduling por tiempo    | Trigger de mantenimiento por días (90/180) además de km — actualmente ignorado en el motor cíclico | Media     |
| Alertas de deuda técnica | Unidades con km > nextServiceReading_forecast sin servicio registrado                              | Media     |

---

## 8. ARQUITECTURA DE MANTENIMIENTO (CTI)

> Esta sección es crítica. Leer antes de tocar cualquier ruta de mantenimiento.

### 8.1 Class Table Inheritance

```sql
fleet_movements          -- Base: uuid, unit_id, movement_type, status, start_reading, start_at, end_at
fleet_maintenance_extensions  -- Child: movement_id FK, service_date, service_type, service_mode, cost, technician
fleet_maintenance_details     -- Details: maintenance_id FK, task_code, status, notes
```

`movement_type = 'MAINTENANCE'` siempre. Mismo patrón que rutas (`movement_type = 'ROUTE'`).

### 8.2 Ciclo de vida de una orden de mantenimiento

```
POST /maintenance
  ├── is_in_progress = false → status = COMPLETED (In Situ)
  │     └── applyMaintenanceCompletionToUnit() → odómetro + forecast + status = Disponible
  └── is_in_progress = true  → status = ACTIVE
        └── fleet_units.status = 'Downtime'
              └── PATCH /maintenance/:uuid/complete
                    └── applyMaintenanceCompletionToUnit() → odómetro + forecast + status = Disponible
```

### 8.3 Motor cíclico `computeServiceType`

```
Regla: residuo = odómetro % 60,000

residuo ≤ 1,000 o ≥ 59,000 → ADVANCED_50K
residuo 49,000–51,000       → ADVANCED_50K
residuo 29,000–41,000       → MAJOR_30K
residuo 19,000–21,000       → INTERMEDIATE_20K
residuo 9,000–11,000        → BASIC_10K

Fuera de ventanas:
  - unidad mina (maintIntervalKm=5000) → MINOR_MINING
  - unidad agencia               → milestone más cercano
```

⚠️ **Esta función existe en DOS archivos. Modificar siempre ambos:**

- `apps/api/src/routes/fleetMaintenance.ts` (función `computeServiceType`)
- `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx` (función `computeServiceType`)

### 8.4 Checklist acumulativo (`SERVICE_CUMULATIVE_MAP`)

```
ADVANCED_50K → [ADVANCED_50K, MAJOR_30K, INTERMEDIATE_20K, BASIC_10K]
MAJOR_30K    → [MAJOR_30K, INTERMEDIATE_20K, BASIC_10K]
INTERMEDIATE → [INTERMEDIATE_20K, BASIC_10K]
BASIC_10K    → [BASIC_10K]
MINOR_MINING → [MINOR_MINING]   ← protocolo paralelo, sin herencia
```

La DB almacena tareas en **delta** (solo las nuevas por nivel). El mapa acumulativo vive en el handler GET /template. **No duplicar tareas en la DB.**

### 8.5 Flotilla — distribución de intervalos

```
Unidades mina   (maintIntervalKm=5000,  maintIntervalDays=90):  10 unidades — TODAS Diésel (fuelTypeId=10)
Unidades agencia(maintIntervalKm=10000, maintIntervalDays=180): 13 unidades
  └── 3 Diésel (ASM-002, ASM-020, ASM-022)
  └── 10 Gasolina
```

### 8.6 MINOR_MINING — tareas por combustible

```
Base (4 tasks en maintenance_plan_tasks):
  OIL_CHANGE_MINING, OIL_FILTER_MINING, AIR_FILTER_MINING, FUEL_FILTER_MINING

Brand rules (fuel-specific):
  fuelTypeId=10 (Diésel)   → + WATER_SEPARATOR_MINING   (total: 5 tasks) ✅ correcto
  fuelTypeId=11 (Gasolina) → + CABIN_FILTER_MINING       (total: 5 tasks) ✅ correcto
```

### 8.7 Derivación automática de `is_in_progress`

```
MINOR_MINING          → is_in_progress = false  (In Situ — campo)
BASIC_10K             → is_in_progress = true   (Taller)
INTERMEDIATE_20K      → is_in_progress = true   (Taller)
MAJOR_30K             → is_in_progress = true   (Taller)
ADVANCED_50K          → is_in_progress = true   (Taller)
```

---

## 9. REGLAS DE ENCRIPTACIÓN

```
⚠️  CAMPOS CIFRADOS EN REPOSO — NUNCA MOSTRAR RAW EN UI ⚠️

Tabla: fleet_units
  - placas            → AES encrypted
  - numeroSerie       → AES encrypted
  - circulationCardNumber → AES encrypted

Para desencriptar: usar servicio encryption.ts del API
Para mostrar en UI: solicitar endpoint con desencriptación explícita
```

---

## 10. REGLAS DE ESCRITURA DE ARCHIVOS (SOLO PARA AG)

> Esta sección es específica para Antigravity que escribe archivos vía PowerShell.

```
❌ PROHIBIDO: Set-Content sin -Encoding UTF8
   Causa: caracteres á, é, í, ó, ú, ñ, — se corrompen a �

✅ OBLIGATORIO: Para cualquier carácter fuera del rango ASCII puro,
   usar secuencias \uXXXX en los scripts Node.js:

   á = á    é = é    í = í    ó = ó
   ú = ú    ñ = ñ    Ó = Ó    — = —
   · = ·    ✅ = ✅   ⚠️ = ⚠   ✨ = ✨
```

---

## 11. ESTÁNDARES DE DISEÑO UI

### 11.1 Paleta de colores Archon

```css
--pinnacle-navy:   #0f2a44   /* Color primario — texto, bordes */
--archon-gold:     #f2b705   /* Accent — focus, selected, CTA */
--sentinel-red:    #C12020   /* Danger, cancel, alerts */
--emerald-success: #10b981   /* Success, completado */
--amber-warning:   #f59e0b   /* En taller, Downtime, advertencias */
```

### 11.2 Clases CSS soberanas (Tailwind)

```
card-archon-sovereign    → Card principal con sombra y bordes
archon-grid-2-sovereign  → Grid 2 columnas soberano
card-sovereign-header    → Header de card con icono
btn-sentinel-red         → Botón rojo (cancelar/danger)
btn-sentinel-emerald     → Botón verde (confirmar/success)
```

### 11.3 Tipografía

- **Sans:** Inter (body text, UI)
- **Mono:** Fira Code o system monospace (valores numéricos, IDs, códigos)
- **Tamaños:** `text-[10px]` labels, `text-[13px]` body, `text-[14px]` headers

### 11.4 Badges de tipo de servicio (SERVICE_BADGE_STYLE)

```
BASIC_10K        → sky
INTERMEDIATE_20K → blue
MAJOR_30K        → violet
ADVANCED_50K     → rose
MINOR_MINING     → emerald
```

---

## 12. GUÍA DE ALTERNANCIA ENTRE IAs

### Cuando Felipe cambia de AG → CC:

1. **CC lee este archivo completo** — especialmente la sección ESTADO ACTIVO
2. **CC ejecuta:** `git log --oneline -10` para ver contexto reciente
3. **CC ejecuta:** `git status` para confirmar working tree limpio
4. **CC NO sobreescribe** sin entender qué hizo AG
5. Si hay dudas de intención, CC pregunta a Felipe antes de actuar

### Cuando Felipe cambia de CC → AG:

1. **AG lee la sección ESTADO ACTIVO** actualizada por CC o Felipe
2. **AG aplica Protocolo L** antes de cualquier cambio si la tarea es compleja
3. **AG verifica** que el archivo objetivo no tiene ediciones en curso de CC
4. **AG no usa** `Set-Content` sin `-Encoding UTF8` para scripts con español

### Actualización de ESTADO ACTIVO:

> **¿Quién actualiza este archivo?**
>
> - Preferentemente: el **agente saliente** antes de terminar su turno
> - Alternativa: **Felipe** al hacer el cambio de IA
> - En ambos casos: actualizar fecha, agente saliente, commits realizados y notas

---

## 13. REGISTRO DE SESIONES

| Fecha      | Agente | Versión      | Descripción                                                                                |
| ---------- | ------ | ------------ | ------------------------------------------------------------------------------------------ |
| 2026-05-25 | AG     | V.78.100.208 | Compliance Hierarchy Engine — dual state, modal confirmación, auditoría                    |
| 2026-05-25 | AG     | V.78.100.209 | Hotfix UTF-8 — restauración de diacríticos en español (21 chars)                           |
| 2026-05-25 | AG     | V.78.100.210 | ArchonSelect Portal Architecture — z-index/overflow fix                                    |
| 2026-05-25 | AG     | V.78.100.211 | ArchonSelect — enforce always open downward                                                |
| 2026-05-25 | AG     | V.78.100.212 | Remove encrypted placas ciphertext from maintenance UI                                     |
| 2026-05-25 | CC     | V.78.100.213 | Add Dual IA Communication Protocol AG+CC Pair Programming                                  |
| 2026-05-25 | AG     | V.78.100.214 | Maintenance lifecycle CTI + Cyclic Engine + Cumulative Checklist + Auto-mode (Fix CC Lint) |
| 2026-05-25 | AG     | HOTFIX       | `hotfix/core-mining-cumulative-patch` — Force MINOR_MINING injection on agency milestones  |
| 2026-05-25 | AG     | HOTFIX       | `7f258c2` — Refactor SQL query to isolate and strictly evaluate brand and fuel rules       |
| 2026-05-25 | AG     | HOTFIX       | `e395d4f` — Chore: Add DB seeder script for maintenance matrix hydration                   |
| 2026-05-25 | AG     | HOTFIX       | `9031d93` — Refactor: transition to 1:1 discrete milestone packages                        |

---

## 14. HALLAZGOS PENDIENTES DE IMPLEMENTACIÓN FUTURA

### 14.1 Scheduling por tiempo (días)

`fleet_units` tiene `maintIntervalDays` (90 días para mina, 180 para agencia). El motor cíclico actual solo considera kilómetros. Si una unidad llega al umbral de días sin haber alcanzado el km, el sistema no lo detecta. Requiere un módulo de alertas separado — no bloquea el flujo actual de registro.

**Regla de negocio acordada:** "90/180 días O el km milestone, lo que ocurra primero."

---

## 15. CONTACTO Y ESCALACIÓN

- **Decisiones de negocio:** Felipe Miramontes (propietario del proyecto)
- **Conflictos técnicos entre IAs:** Felipe decide, documenta en este archivo
- **Bloqueos por permisos o contexto:** El agente bloqueado lo indica en ESTADO ACTIVO y espera instrucción

---

_Este documento es un artefacto vivo. Actualizar ESTADO ACTIVO en cada cambio de turno._
_Versión del protocolo: 1.1.0 — Archon ERP · PIIC_
