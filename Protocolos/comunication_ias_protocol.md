# 🔱 PROTOCOLO DE COORDINACIÓN ENTRE IAs

### Archon ERP — mantenimiento.piic.com.mx

**Versión:** 1.0.0 · **Fecha:** 2026-05-25 · **Autor:** Felipe Miramontes

---

## 1. IDENTIDAD DE LOS AGENTES

| Atributo                | Antigravity (AG)                                                                                | Claude Code (CC)                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Plataforma**          | Google Gemini Advanced / Antigravity IDE                                                        | Anthropic Claude · VS Code Extension                                                               |
| **Acceso principal**    | Chat web + terminal integrada (PowerShell)                                                      | VS Code · acceso directo a archivos y terminal                                                     |
| **Fortaleza**           | Planificación arquitectónica, análisis multi-capa, generación de planes detallados, Protocolo L | Edición de archivos in-place, refactoring local, navegación de codebase, autocompletar inteligente |
| **Limitación**          | Escritura de archivos vía scripts intermedios (PowerShell + Node.js)                            | Sin memoria persistente entre sesiones salvo contexto de ventana                                   |
| **Compromisos activos** | Protocolo L, Protocolo Commit, reglas de versionado                                             | Linting on-save, formatting con Prettier                                                           |

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

> **Última actualización:** 2026-05-25T03:51 CST
> **Agente saliente:** Antigravity (AG)
> **Agente entrante:** —
> **Última versión committeada:** `V.78.100.212_Remove_Encrypted_Placas_From_Maintenance_UI`

### Trabajo completado en esta sesión:

- [x] Compliance Hierarchy Engine (dual-state systemRecommended/userSelected)
- [x] Modal de confirmación para PARTIAL_EXECUTION
- [x] Hotfix UTF-8 — restauración de diacríticos en español
- [x] ArchonSelect Portal Architecture (z-index fix)
- [x] Dropdown direction enforcement (always downward)
- [x] Remove encrypted `placas` ciphertext from UI

### Archivos actualmente modificados (sin commit pendiente):

```
— Ninguno. Working tree limpio.
```

### Próxima tarea sugerida:

> Pendiente de definición por parte de Felipe.

### Notas para el agente entrante:

- El campo `placas` en `fleet_units` está **cifrado en reposo**. No exponer en UI sin pasar por el servicio de desencriptación (`encryption.ts`).
- Los scripts Node.js para escritura de archivos DEBEN usar `\uXXXX` para caracteres no-ASCII (ver Hotfix V.78.100.209).
- `ArchonSelect` usa React Portal en `#archon-select-portal` — el dropdown es `position: fixed`.

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

# 2. Tests — 100% pass en web, API con thresholds en 0
npm run test --workspace=@mantenimiento/web -- --run
npm run test --workspace=@mantenimiento/api -- --run

# 3. Git add + commit (husky ejecuta lint-staged automáticamente)
git add [archivos específicos]
git commit -m "V.X.Y.Z_Descriptor"
```

### 5.3 Versión actual del proyecto

```
Última versión: V.78.100.212
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
└── datosCliente/     → Hallazgos, PROTOCOLO_L.md, contexto de negocio
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
const getLabel = (isRec: boolean, mode: ServiceMode): string => {
  if (isRec) return 'RECOMENDADO';
  if (mode === 'PARTIAL_EXECUTION') return 'PARCIAL';
  return 'PREVENTIVO';
};

// ❌ INCORRECTO — nested ternary (regla ESLint no-nested-ternary)
const label = isRec ? 'A' : mode === 'X' ? 'B' : 'C';
```

### 6.4 Componentes UI críticos

| Componente                    | Ubicación                                        | Notas                                                                 |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `ArchonSelect`                | `apps/web/src/components/ArchonSelect.tsx`       | Usa React Portal en `#archon-select-portal`, siempre abre hacia abajo |
| `ArchonField`                 | `apps/web/src/components/ArchonField.tsx`        | Wrapper de label + input con icono                                    |
| `ArchonDataTable`             | `apps/web/src/components/UI/ArchonDataTable.tsx` | Tabla con sorting y loading state                                     |
| `MaintenanceRegistrationForm` | `apps/web/src/components/Maintenance/`           | Compliance Hierarchy Engine v3.0.0                                    |
| `MaintenanceGridView`         | `apps/web/src/components/Maintenance/`           | Historial con cursor pagination                                       |

---

## 7. MÓDULOS DEL SISTEMA

### 7.1 Módulos activos (en producción local)

| Módulo          | Ruta API          | Estado                               |
| --------------- | ----------------- | ------------------------------------ |
| Fleet (Flota)   | `/v1/fleet`       | ✅ Estable                           |
| Mantenimiento   | `/v1/maintenance` | ✅ Compliance Hierarchy implementado |
| Rutas           | `/v1/routes`      | ✅ Estable                           |
| Usuarios        | `/v1/auth/users`  | ✅ Estable                           |
| Telemetría      | `/v1/telemetry`   | ✅ Estable                           |
| Geolocalización | `/v1/geolocation` | ✅ Estable                           |
| Catálogos       | `/v1/catalogs`    | ✅ Estable                           |

### 7.2 Módulos en desarrollo

| Módulo | Descripción             | Prioridad |
| ------ | ----------------------- | --------- |
| —      | Pendiente de definición | —         |

---

## 8. REGLAS DE ENCRIPTACIÓN

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

## 9. REGLAS DE ESCRITURA DE ARCHIVOS (SOLO PARA AG)

> Esta sección es específica para Antigravity que escribe archivos vía PowerShell.

```
❌ PROHIBIDO: Set-Content sin -Encoding UTF8
   Causa: caracteres á, é, í, ó, ú, ñ, — se corrompen a \uFFFD

✅ OBLIGATORIO: Para cualquier carácter fuera del rango ASCII puro,
   usar secuencias \uXXXX en los scripts Node.js:

   á = \u00E1    é = \u00E9    í = \u00ED    ó = \u00F3
   ú = \u00FA    ñ = \u00F1    Ó = \u00D3    — = \u2014
   · = \u00B7    ✅ = \u2705   ⚠️ = \u26A0   ✨ = \u2728
```

---

## 10. ESTÁNDARES DE DISEÑO UI

### 10.1 Paleta de colores Archon

```css
--pinnacle-navy:   #0f2a44   /* Color primario — texto, bordes */
--archon-gold:     #f2b705   /* Accent — focus, selected, CTA */
--sentinel-red:    #C12020   /* Danger, cancel, alerts */
--emerald-success: #10b981   /* Success, full compliance */
--amber-warning:   #f59e0b   /* Partial execution, warnings */
```

### 10.2 Clases CSS soberanas (Tailwind)

```
card-archon-sovereign    → Card principal con sombra y bordes
archon-grid-2-sovereign  → Grid 2 columnas soberano
card-sovereign-header    → Header de card con icono
btn-sentinel-red         → Botón rojo (cancelar/danger)
btn-sentinel-emerald     → Botón verde (confirmar/success)
```

### 10.3 Tipografía

- **Sans:** Inter (body text, UI)
- **Mono:** Fira Code o system monospace (valores numéricos, IDs, códigos)
- **Tamaños:** `text-[10px]` labels, `text-[13px]` body, `text-[14px]` headers

---

## 11. GUÍA DE ALTERNANCIA ENTRE IAs

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

## 12. REGISTRO DE SESIONES

| Fecha      | Agente | Commits      | Descripción                                                             |
| ---------- | ------ | ------------ | ----------------------------------------------------------------------- |
| 2026-05-25 | AG     | V.78.100.208 | Compliance Hierarchy Engine — dual state, modal confirmación, auditoría |
| 2026-05-25 | AG     | V.78.100.209 | Hotfix UTF-8 — restauración de diacríticos en español (21 chars)        |
| 2026-05-25 | AG     | V.78.100.210 | ArchonSelect Portal Architecture — z-index/overflow fix                 |
| 2026-05-25 | AG     | V.78.100.211 | ArchonSelect — enforce always open downward                             |
| 2026-05-25 | AG     | V.78.100.212 | Remove encrypted placas ciphertext from maintenance UI                  |

---

## 13. CONTACTO Y ESCALACIÓN

- **Decisiones de negocio:** Felipe Miramontes (propietario del proyecto)
- **Conflictos técnicos entre IAs:** Felipe decide, documenta en este archivo
- **Bloqueos por permisos o contexto:** El agente bloqueado lo indica en ESTADO ACTIVO y espera instrucción

---

_Este documento es un artefacto vivo. Actualizar ESTADO ACTIVO en cada cambio de turno._
_Versión del protocolo: 1.0.0 — Archon ERP · PIIC_
