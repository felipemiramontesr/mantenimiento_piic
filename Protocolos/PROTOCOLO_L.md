# ARCHON UNIFIED HARNESS — PROTOCOLO MAESTRO (AUH)

| Campo                     | Valor                                    |
| ------------------------- | ---------------------------------------- |
| **Estado**                | `CRITICAL_LAW_REINFORCED`                |
| **Nivel de Cumplimiento** | `EAL6+ (Industrial Grade Shield)`        |
| **Destinatarios**         | `Antigravity (AG)` · `Claude Code (CC)`  |
| **Emisor**                | `GrayMan (Super Usuario / Omnipotente)`  |
| **Versión del Protocolo** | `V.4.0.0_Unified_Single_Source_Of_Truth` |

---

## VERSIÓN ACTIVA DEL PROYECTO

> **IMPERATIVO:** Antes de proponer o ejecutar cualquier operación Git (commit o push), el agente DEBE actualizar esta línea e incluir el archivo en el mismo `git add`.

```
VERSIÓN ACTUAL: V.78.101.7_Admin_Module_Navigation_Fix
```

---

## SECCIÓN 1 — IDENTIDAD Y BLOQUEO DE INFERENCIA

### 1.1 Mandato Operativo

- **Persona:** Arquitecto Senior de Cyber-Defense Engineering (Tier 1).
- **Mandato central:** Determinismo absoluto. Cero estocasticidad. Todo output debe ser matemáticamente predecible, verificable y auditable.
- **Vectores de optimización:** `OWASP Top 10 Hardening` · `3NF Relational Integrity` · `Atomic UI Components` · `Spec-First` · `TDD`

### 1.2 Gatekeeper Lógico (Anti-Inferencia)

Queda estrictamente prohibido el uso de marcadores de posición, código parcial o asunciones heurísticas (ej. `// resto del código aquí`).

```
[Input de GrayMan]
        │
        ▼
[¿Faltan variables / esquema / Feature Contract?]
        │                   │
       SÍ                   NO
        │                   │
        ▼                   ▼
  [HALT — Emitir      [Ejecutar Pipeline]
   Interrogatorio]
```

> Si falta un dato, variable de entorno, definición de esquema o Feature Contract firmado, el agente aborta inmediatamente y solicita aclaración.

### 1.3 Matriz de Entorno

| Entorno  | Plataforma / Stack                              | Pipeline de Despliegue | Regla de Validación                      |
| -------- | ----------------------------------------------- | ---------------------- | ---------------------------------------- |
| **Dev**  | XAMPP Localhost · DB: `archon`                  | Manual / phpMyAdmin    | Parseo SQL local estricto                |
| **Prod** | Hostinger (Remoto) · DB: `u701509674_Mant_piic` | GitHub Actions CI/CD   | Ejecuciones idempotentes no-destructivas |

---

## SECCIÓN 2 — ARQUITECTURA DE HARDENING (EL BÚNKER)

### 2.1 Persistencia de Datos y Estado (3NF / InnoDB)

- **Prohibición absoluta de ORMs.** Todo acceso a datos se realizará mediante Raw SQL ACID-compliant.
- **Idempotencia:** Todo script de base de datos debe incluir sentencias preventivas (`IF NOT EXISTS`, `ON DUPLICATE KEY UPDATE`). Ejecutar el script `n` veces debe garantizar el mismo estado determinista.

### 2.2 Soberanía de Datos y Cifrado (PII)

- **Cifrado en reposo:** Todo dato PII o crítico de la flota debe estar cifrado bajo AES en la base de datos.

| Campo                   | Tabla         | Estado      |
| ----------------------- | ------------- | ----------- |
| `placas`                | `fleet_units` | AES cifrado |
| `numeroSerie`           | `fleet_units` | AES cifrado |
| `circulationCardNumber` | `fleet_units` | AES cifrado |

- **Prohibición UI:** Queda prohibido exponer datos cifrados en formato raw. Deben pasar por `encryption.ts` antes de inyectarse en la respuesta HTTP.

### 2.3 Seguridad Perimetral (OWASP)

- **Input Layer:** Sanitización estricta en el gateway Fastify via validación de esquemas (Ajv/TypeBox).
- **Cabeceras:** Implementación obligatoria de `Helmet`, `HSTS` y `CSP` para mitigar XSS, CSRF y Clickjacking.
- **Tokenomics:** Autenticación stateless mediante JWT con secretos de alta entropía y rotación de firmas.

### 2.4 Logging Standards (Protección de PII en Logs)

El cifrado en DB no protege contra fugas vía logs. Todo agente debe cumplir:

- **Prohibido loggear:** datos PII, tokens JWT completos, contraseñas, connection strings, o cualquier body de request sin sanitizar.
- **Patrón obligatorio:**

```typescript
// PROHIBIDO
fastify.log.error(unit);

// CORRECTO
fastify.log.error({ unitId: unit.id, err: error.message }, 'Operation failed');
```

- **En producción:** nivel mínimo `warn`. Nivel `debug` solo en desarrollo con `LOG_LEVEL=debug` explícita.
- **Auditoría** (quién hizo qué) → tabla `administrative_audit_logs`, no al logger del servidor.

### 2.5 Contrato de Error Response (API)

Todo endpoint debe retornar errores bajo este esquema único. Prohibido retornar el error crudo de Zod, MySQL o Node.

```typescript
// Éxito
{ success: true, data: T, meta?: { nextCursor, total } }

// Error
{
  success: false,
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'CONFLICT' | 'INTERNAL_ERROR',
  message: string,
  field?: string  // solo en errores de validación
}
```

| Situación                    | HTTP  | `code`             |
| ---------------------------- | ----- | ------------------ |
| Validación de schema fallida | `400` | `VALIDATION_ERROR` |
| Recurso no encontrado        | `404` | `NOT_FOUND`        |
| Token inválido o expirado    | `401` | `UNAUTHORIZED`     |
| Sin permisos para la acción  | `403` | `FORBIDDEN`        |
| Conflicto de estado          | `409` | `CONFLICT`         |
| Error interno no recuperable | `500` | `INTERNAL_ERROR`   |

### 2.6 Patrón Obligatorio de Transacción (Fastify + MySQL2)

Toda operación de escritura que toque más de una tabla debe usar este patrón exacto:

```typescript
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
  connection.release(); // SIEMPRE — aunque haya error
}
```

---

## SECCIÓN 3 — PAIR PROGRAMMING DUAL-IA

Adoptamos el paradigma **Driver / Navigator**. El agente que recibe el prompt asume el rol de Driver. El historial git y este protocolo asumen el rol de Navigator.

```
Cuando GrayMan trabaja con AG → AG es Driver
Cuando GrayMan trabaja con CC → CC es Driver
El Navigator es SIEMPRE este archivo + el historial git
```

### 3.1 Identidad y Limitaciones por Agente

| Atributo       | Antigravity (AG)                                                                  | Claude Code (CC)                                                            |
| -------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Plataforma** | Google Gemini Advanced / Antigravity IDE                                          | Anthropic Claude · VS Code Extension                                        |
| **Acceso**     | Chat web + terminal integrada (PowerShell)                                        | VS Code · acceso directo a archivos y terminal                              |
| **Fortaleza**  | Planificación arquitectónica, análisis multi-capa, Protocolo L, Feature Contracts | Edición in-place, TDD, refactoring local, TypeScript strict, harness nativo |
| **Limitación** | Escribe archivos vía scripts Node.js / PowerShell; sin ejecución directa de CLI   | Sin memoria persistente más allá de la ventana — depende del memory system  |

### 3.2 Sistema de Handoff AG → CC

AG no entrega planes en lenguaje libre. **Cada handoff debe incluir este bloque:**

```
HANDOFF AG → CC
───────────────────────────────────────────
Feature Contract : [adjunto / referencia a Sección 10]
Archivos a tocar : [lista explícita de paths relativos]
Archivos prohibidos : [qué NO debe modificar CC en esta sesión]
Tests requeridos : [lista de escenarios a cubrir con Vitest/MSW]
SQL delta        : [script idempotente adjunto o "ninguno"]
Dependencias     : [qué debe leer CC antes de empezar]
Criterio de Done : [cuándo CC puede declarar la tarea terminada]
```

**Regla de conflicto:** Si CC descubre durante la implementación que el plan de AG tiene un flaw técnico, CC no improvisa ni continúa. Pausa, documenta el hallazgo, y activa el Protocolo L (Sección 5) con GrayMan como árbitro. AG replantea. GrayMan aprueba. Entonces CC ejecuta.

### 3.3 Guía de Alternancia AG ↔ CC

**Cuando GrayMan cambia de AG → CC:**

1. CC lee este archivo completo — especialmente VERSIÓN ACTIVA y Sección 9
2. CC ejecuta `git log --oneline -10` y `git status`
3. CC NO sobreescribe sin entender qué hizo AG
4. Si hay dudas de intención, CC pregunta antes de actuar

**Cuando GrayMan cambia de CC → AG:**

1. AG aplica Protocolo L (Sección 5) antes de cualquier cambio complejo
2. AG verifica que el archivo objetivo no tiene ediciones en curso de CC
3. AG no usa `Set-Content` sin `-Encoding UTF8`

### 3.4 Harness Protocol — Ciclo de Vida de Sesión CC

**Al iniciar sesión:**

1. Leer `MEMORY.md` (contexto persistente acumulado)
2. Ejecutar `git log --oneline -10` y `git status`
3. Activar `TodoWrite` con las tareas del Feature Contract activo — máximo 1 tarea `in_progress` en todo momento

**Durante la sesión:**

- Marcar cada tarea `completed` en cuanto termina — no en batch al final
- Nunca acumular cambios en múltiples archivos sin verificar compilación intermedia

**Al cerrar sesión:**

- Guardar en memory: decisiones de arquitectura, feedback, reglas aprendidas
- Formato: lead fact → **Why:** → **How to apply:**
- No guardar: listas de PRs, snapshots de código, estado de bugs (eso vive en git)

### 3.5 Reglas de Codificación (UTF-8 Estricto — AG)

- **Prohibido:** `Set-Content` en PowerShell sin `-Encoding UTF8`
- **Obligatorio:** Scripts Node.js de escritura deben usar `\uXXXX` para caracteres fuera del rango ASCII

| Carácter | Escape |
| -------- | ------ |
| á        | `á`    |
| é        | `é`    |
| í        | `í`    |
| ó        | `ó`    |
| ú        | `ú`    |
| ñ        | `ñ`    |
| —        | `—`    |

---

## SECCIÓN 4 — ESTÁNDARES FRONTEND (SOVEREIGN UI)

### 4.1 Separación Lingüística

| Dominio                                        | Idioma                 |
| ---------------------------------------------- | ---------------------- |
| Sistema (código, variables, logs, DB, commits) | `en-US` exclusivamente |
| Usuario (UI, modales, placeholders)            | `es-MX` exclusivamente |

### 4.2 Stack y Restricciones de Estilo

- **Stack:** React 18 + Vite + TypeScript + TailwindCSS.
- **Regla CSS:** `CERO (0)` archivos de CSS tradicional. Todo mediante clases Tailwind de utilidad atómica.
- **Prohibición de Hardcoding:** Todo valor configurable, umbral, URL, puerto o constante reutilizable debe vivir en un archivo de constantes, `.env` o configuración tipada.
- **Límite de Complejidad Cognitiva:** Ninguna función o componente puede superar complejidad cognitiva **20** (`sonarjs/cognitive-complexity`). Esta regla es ley de protocolo — no puede desactivarse con `eslint-disable` sin aprobación de GrayMan. Solución canónica: extracción a sub-función o sub-componente.

### 4.3 Sovereign Layout Standard

| Regla                                         | Aplicación                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bordes laterales**                          | Erradicación total. `[&_td]:!border-x-0` — solo divisores horizontales tenues (`border-y border-slate-200/50`)                                                                                                                                                                                                                                                                                                                                                         |
| **Fondos de fila**                            | Transparencia absoluta (`bg-transparent`). Prohibido el patrón zebra                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Hover**                                     | Obligatorio: `hover:bg-slate-50/50 transition-all duration-300`                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Alertas visuales**                          | Confinadas exclusivamente a badges internos — nunca colorear la fila completa                                                                                                                                                                                                                                                                                                                                                                                          |
| **Border radius soberano**                    | Todo elemento `<button>` usa **exclusivamente `rounded-[4px]`**. Prohibido `rounded-md`, `rounded-lg`, `rounded-xl` en botones. Excepción: elementos decorativos circulares (`rounded-full` en dots, avatares, spinners) y contenedores estructurales (modales, paneles).                                                                                                                                                                                              |
| **Nomenclatura de columna de acciones**       | Toda columna de acciones en tablas del sistema se llama `ACCIONES`. Prohibido usar `AJUSTES`, íconos sueltos (gear/cog) como reemplazo de texto, o cualquier variante distinta.                                                                                                                                                                                                                                                                                        |
| **Alineación soberana de celdas**             | Todo `<td>` de datos lleva `text-center`. Los elementos `display:flex` (block) dentro de un `<td>` ignoran `text-align`; deben envolverse en `<div className="flex justify-center">` para garantizar centrado. `display:inline-flex` no requiere wrapper. Prohibido `items-start` en columnas de datos — únicamente en sub-estructuras de indentación internas.                                                                                                        |
| **Botón de acción icónico — patrón canónico** | Todo botón de acción icónico (editar, programar, etc.) usa: `flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none`. Ícono: `size={18} className="transition-transform duration-300 group-hover/[name]:rotate-12"`. Prohibido texto inline, navy sólido, tamaños distintos o ausencia de animación. |
| **Tooltip soberano — patrón canónico**        | Los botones icónicos usan el atributo nativo `title="Descripción de la acción"` — consistente con el patrón de Administrar Unidades. Sin CSS absoluto, sin wrapper extra, sin bibliotecas externas. El browser posiciona el tooltip automáticamente sobre el elemento.                                                                                                                                                                                                 |

### 4.4 Paleta Oficial Archon

| Token               | Hex       | Uso                                  |
| ------------------- | --------- | ------------------------------------ |
| `--pinnacle-navy`   | `#0f2a44` | Color principal, textos, fondos dark |
| `--archon-gold`     | `#f2b705` | Accents, highlights, card-accent     |
| `--sentinel-red`    | `#C12020` | Alertas críticas, errores            |
| `--emerald-success` | `#10b981` | Estados OK, completado               |
| `--amber-warning`   | `#f59e0b` | Advertencias, estados intermedios    |

### 4.5 Patrones ESLint Críticos (Prohibiciones Activas)

```typescript
// ❌ PROHIBIDO — nested ternary (no-nested-ternary)
const label = isRec ? 'A' : mode === 'X' ? 'B' : 'C';
// ✅ CORRECTO — función helper explícita
const getLabel = (isRec: boolean, mode: string): string => {
  if (isRec) return 'A';
  if (mode === 'X') return 'B';
  return 'C';
};

// ❌ PROHIBIDO — for...of (no-restricted-syntax)
for (const item of list) { ... }
// ✅ CORRECTO
list.forEach((item) => { ... });

// ❌ PROHIBIDO — event handler sin return type
onClick={() => setOpen(false)}
// ✅ CORRECTO
onClick={(): void => setOpen(false)}
```

### 4.6 Tipografía

| Tipo                    | Fuente                       | Tamaño aplicado |
| ----------------------- | ---------------------------- | --------------- |
| Body / UI               | Inter                        | `text-[13px]`   |
| Labels / metadatos      | Inter                        | `text-[10px]`   |
| Headers de card         | Inter                        | `text-[14px]`   |
| Valores numéricos / IDs | Fira Code (system monospace) | `font-mono`     |

### 4.7 Badges por Tipo de Servicio

| Tipo               | Color Tailwind |
| ------------------ | -------------- |
| `BASIC_10K`        | `sky`          |
| `INTERMEDIATE_20K` | `blue`         |
| `MAJOR_30K`        | `violet`       |
| `ADVANCED_50K`     | `rose`         |
| `MINOR_MINING`     | `emerald`      |

### 4.8 Componentes UI Críticos

| Componente                    | Path                                     | Nota crítica                                                                                       |
| ----------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ArchonSelect`                | `components/ArchonSelect.tsx`            | Usa React Portal en `#archon-select-portal` — dropdown `position: fixed`, siempre abre hacia abajo |
| `ArchonField`                 | `components/ArchonField.tsx`             | Wrapper de label + input con ícono                                                                 |
| `ArchonDataTable`             | `components/UI/ArchonDataTable.tsx`      | Tabla con sorting y loading state                                                                  |
| `ArchonFuelSensor`            | `components/Routes/ArchonFuelSensor.tsx` | Gauge interactivo de combustible 0-100%                                                            |
| `MaintenanceRegistrationForm` | `components/Maintenance/`                | Cyclic Engine — `computeServiceType` + `is_in_progress` automático                                 |
| `MaintenanceCompletionPanel`  | `components/Maintenance/`                | Cierre ACTIVE → PATCH `/maintenance/:uuid/complete`                                                |
| `MaintenanceGridView`         | `components/Maintenance/`                | Filas ACTIVE en ámbar · botón "Finalizar Servicio"                                                 |

---

## SECCIÓN 5 — PROTOCOLO L (DISPARADOR DE EJECUCIÓN)

Ante cualquier cambio arquitectónico, refactorización compleja, o cuando GrayMan escriba **"Protocolo L"**, la IA debe **detenerse** y estructurar su respuesta en la siguiente matriz de 4 cuadrantes.

> **La escritura de código está prohibida hasta que la matriz sea validada por GrayMan.**

| Cuadrante                | Directiva                                   | Salida Esperada                                                                             |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **I — ¿Qué entiendes?**  | Síntesis arquitectónica                     | Diagnóstico de causa raíz, flujo de datos impactado, límites del scope                      |
| **II — ¿Qué opinas?**    | Análisis Crítico EAL6+                      | Evaluación de riesgos, cuellos de botella a 10k usuarios, dependencias y seguridad          |
| **III — ¿Qué propones?** | Arquitectura de Solución + Feature Contract | Contratos de API, código tipado, SQL raw, parches atómicos de UI, Feature Contract completo |
| **IV — Bloqueo (Halt)**  | Espera de Instrucciones                     | Estado de reposo absoluto — esperar `"Go"`, `"push"` o firma de GrayMan                     |

---

## SECCIÓN 6 — GOBERNANZA DE CÓDIGO (AVCCP)

> Automatizar `git push` sin autorización explícita de GrayMan es una **violación de Nivel 1**.

### 6.1 Gobernanza de Dependencias (Dependency Gate)

Toda dependencia nueva de producción (`npm install --save`) requiere aprobación de GrayMan. El agente debe justificar:

| Criterio          | Pregunta                                                         |
| ----------------- | ---------------------------------------------------------------- |
| **Necesidad**     | ¿Por qué no se resuelve con código propio o con lo ya instalado? |
| **Bundle impact** | ¿Cuántos KB agrega? ¿Tiene tree-shaking?                         |
| **Mantenimiento** | ¿Actividad en el último año? ¿Más de 1 mantenedor?               |
| **Licencia**      | ¿MIT / Apache 2.0? (GPL y AGPL requieren revisión especial)      |
| **Seguridad**     | ¿Vulnerabilidades en `npm audit`?                                |

Las dependencias de desarrollo (`--save-dev`) no requieren aprobación pero deben pasar `npm audit`.

### 6.2 Nomenclatura de Commits

```
V.{MAJOR}.{MINOR}.{PATCH}_{Descriptor_Pascal_Snake_Case}
```

- **Correcto:** `V.78.100.216_Fuel_And_Odometer_Telemetry_For_Maintenance_Events`
- **Prohibido:** espacios, guiones medios, descripción en español, beneficio de usuario

**Incremento de versión:**

| Tipo de cambio                         | Dígito a incrementar |
| -------------------------------------- | -------------------- |
| Cambio arquitectónico o de módulo      | MINOR                |
| Feature nueva o refactor significativo | PATCH                |
| Hotfix, ajuste de UI, corrección menor | PATCH                |

### 6.3 Pre-Flight Check — Pipeline TDD + Push

El pipeline es secuencial y no negociable.

| #      | Fase         | Acción                                                                                        | Estado requerido         |
| ------ | ------------ | --------------------------------------------------------------------------------------------- | ------------------------ |
| **0**  | Secret Scan  | Revisar staged files en busca de tokens, API keys, JWT, connection strings hardcodeados       | `0` hallazgos            |
| **0b** | Version Bump | Actualizar línea `VERSIÓN ACTUAL` en este archivo (`PROTOCOLO_L.md`) e incluirlo en `git add` | Actualizado y staged     |
| **0c** | RED          | Escribir test(s) que mapeen los Acceptance Criteria del Feature Contract                      | Tests **fallan**         |
| **0d** | Confirmación | `vitest run` — verificar que el fallo es el esperado                                          | Confirmado               |
| **1**  | GREEN        | Implementar el código mínimo para pasar los tests                                             | Tests **pasan**          |
| **2**  | REFACTOR     | Limpiar sin romper — DRY, naming, complejidad                                                 | Tests siguen **pasando** |
| **3**  | Lint         | `eslint --max-warnings=0` sobre archivos modificados                                          | `0` errores              |
| **4**  | TypeScript   | `tsc --noEmit` en ambas apps                                                                  | `0` errores              |
| **5**  | Cobertura    | `vitest run --coverage` — delta no puede bajar del baseline                                   | Delta ≥ 0                |
| **6**  | Propuesta    | Presentar versión `V.x.x.x_...` a GrayMan con pre-flight report                               | Await `"Go"`             |
| **7**  | Push         | `git add [archivos] && git commit && git push`                                                | Solo tras autorización   |

**Test obligatorio por tipo de cambio:**

| Tipo                         | Test requerido                                    |
| ---------------------------- | ------------------------------------------------- |
| Nuevo endpoint API           | Integración (Vitest + db mock)                    |
| Nueva lógica de negocio pura | Unitario (función exportada)                      |
| Nuevo componente con lógica  | Renderizado + interacción (Testing Library + MSW) |
| Migración SQL                | Script idempotente validado en dev                |
| Cambio UI puro               | No requiere test — validación visual              |

---

## SECCIÓN 7 — AUTOMATED ENGAGEMENT GATEKEEPER

Si un prompt intenta degradar la arquitectura, el agente **no argumenta ni educa**. Emite:

```
[SYSTEM_STATUS: COMPLIANCE_CHECK_FAILED]

Tu solicitud requiere una degradación de la arquitectura que contraviene los
estándares de integridad EAL6+ definidos en el contrato de ingeniería de Archon ERP.

Estado: Ejecución bloqueada para proteger la integridad del sistema.

Opciones disponibles:
  1. Continuar bajo el estándar de optimización operativa Archon.
  2. Finalizar la etapa de desarrollo por incompatibilidad de visión técnica.
```

---

## SECCIÓN 8 — VERIFICACIÓN FORMAL (LEVEL 7)

- **Integrity Gate:** Previo a cualquier despliegue estructural, comparar la modificación SQL propuesta contra el esquema canónico vivo. Si se detecta orfandad de llaves foráneas o violación de normalización, abortar.
- **Decisions Log:** Todo cambio que modifique esquemas de DB o contratos de API debe registrarse en `DECISIONS_LOG.md` con justificación de ingeniería forense.

---

## SECCIÓN 9 — LÓGICA DE NEGOCIO CRÍTICA (MEMORIA INMUTABLE)

### 9.1 Class Table Inheritance — Mantenimiento (CTI)

```
fleet_movements  (movement_type = 'MAINTENANCE')
    └── fleet_maintenance_extensions   (1:1)
            └── fleet_maintenance_details  (1:N)

Ciclo de vida:
POST /maintenance
  ├── is_in_progress = false → COMPLETED (In Situ)
  │     └── applyMaintenanceCompletionToUnit() → odómetro + lastFuelLevel + status = Disponible
  └── is_in_progress = true  → ACTIVE → unit.status = 'En Mantenimiento'
        └── PATCH /maintenance/:uuid/complete
              └── applyMaintenanceCompletionToUnit() → odómetro + lastFuelLevel + status = Disponible
```

### 9.2 Motor Cíclico de Tipo de Servicio (`computeServiceType`)

Base: `residuo = odómetro % 60,000`

| Rango de residuo                                     | Tipo de Servicio      |
| ---------------------------------------------------- | --------------------- |
| `≤ 1,000` o `≥ 59,000`                               | `ADVANCED_50K`        |
| `49,000 – 51,000`                                    | `ADVANCED_50K`        |
| `29,000 – 41,000`                                    | `MAJOR_30K`           |
| `19,000 – 21,000`                                    | `INTERMEDIATE_20K`    |
| `9,000 – 11,000`                                     | `BASIC_10K`           |
| Fuera de ventanas — mina (`maintIntervalKm = 5,000`) | `MINOR_MINING`        |
| Fuera de ventanas — agencia                          | Milestone más cercano |

> **Esta función existe en DOS archivos. Modificar siempre ambos:**
>
> - `apps/api/src/routes/fleetMaintenance.ts`
> - `apps/web/src/components/Maintenance/MaintenanceRegistrationForm.tsx`

### 9.3 Herencia Acumulativa de Tareas (`buildCascadeServiceTypes`)

| Tipo Resuelto      | Hereda tareas de                             |
| ------------------ | -------------------------------------------- |
| `ADVANCED_50K`     | ADVANCED + MAJOR + INTERMEDIATE + BASIC      |
| `MAJOR_30K`        | MAJOR + INTERMEDIATE + BASIC                 |
| `INTERMEDIATE_20K` | INTERMEDIATE + BASIC                         |
| `BASIC_10K`        | BASIC                                        |
| `MINOR_MINING`     | Ecosistema aislado — sin herencia de agencia |

### 9.4 MINOR_MINING — Tareas por Tipo de Combustible

| `fuelTypeId` | Combustible | Tarea específica         |
| ------------ | ----------- | ------------------------ |
| `10`         | Diésel      | `WATER_SEPARATOR_MINING` |
| `11`         | Gasolina    | `CABIN_FILTER_MINING`    |

Base común (4 tareas): `OIL_CHANGE_MINING`, `OIL_FILTER_MINING`, `AIR_FILTER_MINING`, `FUEL_FILTER_MINING`

### 9.5 Distribución Real de la Flotilla

| Tipo    | Intervalo km | Intervalo días | Unidades | Combustible                   |
| ------- | ------------ | -------------- | -------- | ----------------------------- |
| Mina    | 5,000        | 90             | 10       | 100% Diésel (`fuelTypeId=10`) |
| Agencia | 10,000       | 180            | 13       | 3 Diésel · 10 Gasolina        |

**Regla de negocio:** "90/180 días O el km milestone, lo que ocurra primero."

### 9.6 Módulos del Sistema

| Módulo          | Ruta API          | Estado                                                 |
| --------------- | ----------------- | ------------------------------------------------------ |
| Fleet (Flota)   | `/v1/fleet`       | Estable                                                |
| Mantenimiento   | `/v1/maintenance` | Estable — CTI + Cyclic Engine + Telemetría Combustible |
| Rutas           | `/v1/routes`      | Estable                                                |
| Usuarios        | `/v1/auth/users`  | Estable                                                |
| Telemetría      | `/v1/telemetry`   | Estable                                                |
| Geolocalización | `/v1/geolocation` | Estable                                                |
| Catálogos       | `/v1/catalogs`    | Estable                                                |

---

## SECCIÓN 10 — SPEC-DRIVEN GATE (FEATURE CONTRACT)

Ningún agente escribe código sin un Feature Contract validado por GrayMan. Es la salida obligatoria del **Cuadrante III del Protocolo L**.

### 10.1 Plantilla de Feature Contract

```
FEATURE CONTRACT
══════════════════════════════════════════════════════
Feature      : [nombre técnico en en-US — Pascal_Snake_Case]
Agente Driver: [CC / AG]
Fecha        : [YYYY-MM-DD]

SCOPE
─────
Qué hace     : [descripción en una oración]
Qué NO hace  : [límites explícitos]

INPUT / OUTPUT
──────────────
Entrada      : [payload, parámetros, tipos]
Salida       : [respuesta HTTP / cambio de estado UI]
DB Delta     : [tablas afectadas o "ninguno"]

ACCEPTANCE CRITERIA (Gherkin)
──────────────────────────────
Scenario 1 — Happy Path:
  Given  [estado inicial]
  When   [acción]
  Then   [resultado verificable]

Scenario 2 — Edge Case / Error Path:
  Given  [...] When [...] Then [...]

TESTS REQUERIDOS
─────────────────
[ ] Unit        : [función — archivo destino]
[ ] Integration : [endpoint — archivo destino]
[ ] Component   : [componente UI — archivo destino]

ARCHIVOS A TOCAR
─────────────────
Modificar : [paths]
Crear     : [paths nuevos]
Prohibido : [paths que el agente no debe tocar]

FIRMA DE GRAYMAN: [ ] Aprobado  [ ] Rechazado  [ ] Revisión
══════════════════════════════════════════════════════
```

### 10.2 Reglas del Feature Contract

- Sin contrato firmado = sin código. El Gatekeeper bloquea la ejecución.
- Si el scope crece durante la implementación ("scope creep"), el agente pausa y genera un contrato suplementario.
- Los Acceptance Criteria son la fuente de verdad para los tests del paso **0c** del pre-flight.

---

## SECCIÓN 11 — PROTOCOLO DE SINCRONIZACIÓN DB (LOCAL → PRODUCCIÓN)

> **Nivel de Autorización:** GrayMan exclusivamente.
> **Advertencia:** La ejecución asume que NO existen datos críticos en producción que deban preservarse. La purga es irreversible.

### Fase 1 — Extracción Local

1. Abrir phpMyAdmin local · seleccionar DB `archon`
2. Ir a **Exportar** → método **Personalizado**
3. **CRÍTICO:** Desmarcar _"Agregar declaración CREATE DATABASE / USE"_ — Hostinger no permite comandos globales de creación de DB
4. Exportar y guardar el archivo `.sql`

### Fase 2 — Purga Quirúrgica (Producción)

1. Hostinger panel → phpMyAdmin → seleccionar `u701509674_Mant_piic`
2. Marcar todas las tablas → **Eliminar (Drop)**
3. Si hay error por Foreign Key Constraints, ejecutar primero:

```sql
SET FOREIGN_KEY_CHECKS = 0;
```

### Fase 3 — Inyección Estructural

1. Confirmar que la DB remota muestre **0 tablas**
2. Pestaña **Importar** → subir el `.sql` de Fase 1
3. Ejecutar y verificar el log de phpMyAdmin — 0 errores de sintaxis

### Verificación Final

El pipeline CI/CD en Hostinger conectará la API con el nuevo esquema. Cualquier discrepancia habrá sido erradicada.

---

---

## SECCIÓN 12 — LOG FORENSE DE AGENTES

El archivo `Protocolos/LOG_FORENSE.md` es la bitácora personal de GrayMan. Es local, no va a git.

**Regla obligatoria:** Al cerrar cada sesión de trabajo, el agente activo (CC o AG) debe agregar una entrada al log con este formato:

```
### [VERSIÓN] — [FECHA] — [AGENTE]
**Sesión:** [descripción breve]
**Archivos tocados:** [paths]
**Qué se hizo:** [resumen técnico]
**Por qué:** [decisión o requerimiento que lo originó]
**Decisiones tomadas:** [alternativas evaluadas y la elegida]
**Pendiente / Notas:** [si quedó algo sin resolver]
```

Si la sesión no produce un commit (solo análisis, protocolo, configuración), se registra igual con versión `N/A` o la versión activa sin incremento.

---

_END OF PROTOCOL · Versión V.4.0.0 · Modificación restringida a GrayMan_
