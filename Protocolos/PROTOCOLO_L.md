# ARCHON UNIFIED HARNESS — PROTOCOLO MAESTRO (AUH)

| Campo                     | Valor                                   |
| ------------------------- | --------------------------------------- |
| **Estado**                | `CRITICAL_LAW_REINFORCED`               |
| **Nivel de Cumplimiento** | `EAL6+ (Industrial Grade Shield)`       |
| **Destinatarios**         | `Antigravity (AG)` · `Claude Code (CC)` |
| **Emisor**                | `GrayMan (Super Usuario / Omnipotente)` |
| **Versión del Protocolo** | `V.4.3.0_Single_Message_Per_Session`    |

---

## VERSIÓN ACTIVA DEL PROYECTO

> **IMPERATIVO:** Antes de proponer o ejecutar cualquier operación Git (commit o push), el agente DEBE actualizar esta línea e incluir el archivo en el mismo `git add`.

```
VERSIÓN ACTUAL: V.78.101.150_CC_FleetRoutes_Coverage_100pct
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

### 1.2.1 Prohibición de Alucinación — No Inventar, No Inferir

**Queda estrictamente prohibido** inventar, nombrar, anticipar o comprometerse con cualquier cosa que GrayMan no haya definido explícitamente. Aplica a **ambos agentes (CC y AG)** sin excepción:

- No crear nombres de fases, Feature Contracts, roadmaps o epics que GrayMan no haya redactado o solicitado
- No asumir que "la siguiente fase lógica" existe o debe implementarse
- No comprometerse con trabajo futuro en el canal CC↔AG ni en ningún documento del repo
- No usar en el canal términos de trabajo no definidos, aunque sea para referirse a algo que "podría existir"

Si un agente quiere sugerir trabajo futuro: redactarlo como **sugerencia explícita dirigida a GrayMan**, esperar su visto bueno, y no actuar hasta recibir un Feature Contract firmado.

### 1.2.2 Coordinación Obligatoria en Cambios de Impacto

**Todo cambio que cause impacto en Archon debe coordinarse entre CC y AG por el canal de comunicación antes de ejecutarse.** Se considera cambio de impacto cualquier modificación que afecte:

- Esquema de base de datos (migraciones, alteraciones de tablas)
- Endpoints API existentes (firma, comportamiento, respuestas)
- Lógica de negocio crítica (motor UPA, cálculos de mantenimiento, reglas de flota)
- Estructura de rutas o navegación del frontend
- Protocolos y reglas del sistema (PROTOCOLO_L, HANDOFF, LOG_FORENSE)

**Flujo obligatorio antes de ejecutar un cambio de impacto:**

```
Agente identifica cambio de impacto
         │
         ▼
Escribe en canal CC↔AG describiendo:
  - qué cambia
  - por qué
  - impacto esperado
         │
         ▼
El otro agente puede responder con [ACK] o advertencia
         │
         ▼
GrayMan tiene visibilidad completa en el canal
         │
         ▼
Agente ejecuta el cambio
```

> Esta regla no bloquea la autonomía operativa — no requiere aprobación del otro agente para proceder. Su propósito es garantizar que ambos agentes y GrayMan tengan contexto antes de que el cambio se materialice en el repo.

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

### 2.7 Gestión de Cambios en Base de Datos

| Entorno                                 | Responsable | Método                                                                                    |
| --------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| **Local (XAMPP · `archon`)**            | CC o AG     | El agente aplica la migration directamente vía `mysql -u root archon < migration.sql`     |
| **Producción (`u701509674_Mant_piic`)** | GrayMan     | GrayMan ejecuta el SQL puro en phpMyAdmin — **nunca** los agentes tocan prod directamente |

**Flujo obligatorio:**

1. El agente crea el archivo `.sql` idempotente en `packages/database/migrations/`
2. El agente lo aplica en local (`archon`) y verifica que no hay errores
3. El agente genera el **SQL puro de producción** al final de la unidad — bloque copiable, sin dependencias de paths locales
4. GrayMan aplica ese SQL en phpMyAdmin sobre `u701509674_Mant_piic` cuando hace el deploy

> Los agentes **nunca** tienen acceso ni credenciales de producción. Toda modificación en prod es responsabilidad y decisión de GrayMan.

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
2. CC lee `Protocolos/HANDOFF_CC_TO_AG.md` completo — estado entregado, decisiones y pendientes (Trigger **H**)
3. CC lee `Protocolos/LOG_FORENSE.md` — últimas 2–3 entradas para entender sesiones recientes (Trigger **F**)
4. CC ejecuta `git log --oneline -10` y `git status`
5. CC NO sobreescribe sin entender qué hizo AG
6. Si hay dudas de intención, CC pregunta antes de actuar

**Cuando GrayMan cambia de CC → AG:**

1. AG aplica Protocolo L (Sección 5) antes de cualquier cambio complejo
2. AG lee `Protocolos/HANDOFF_CC_TO_AG.md` completo — estado actual del sistema (Trigger **H**)
3. AG lee `Protocolos/LOG_FORENSE.md` — últimas 2–3 entradas para entender qué hizo CC (Trigger **F**)
4. AG verifica que el archivo objetivo no tiene ediciones en curso de CC
5. AG no usa `Set-Content` sin `-Encoding UTF8`

### 3.4 Harness Protocol — Ciclo de Vida de Sesión CC

**Al iniciar sesión (orden obligatorio):**

1. Leer `Protocolos/PROTOCOLO_L.md` — especialmente VERSIÓN ACTIVA y Sección 9 (Trigger **L**)
2. Leer `Protocolos/HANDOFF_CC_TO_AG.md` — estado entregado, decisiones y pendientes (Trigger **H**)
3. Leer `Protocolos/LOG_FORENSE.md` — últimas 2–3 entradas del historial (Trigger **F**)
4. Leer `MEMORY.md` (contexto persistente acumulado)
5. Ejecutar `git log --oneline -10` y `git status`
6. Activar `TodoWrite` con las tareas del Feature Contract activo — máximo 1 tarea `in_progress` en todo momento

**Durante la sesión — antes de cada tarea nueva (Regla 9):**

- Re-leer `PROTOCOLO_L.md` mínimo: VERSIÓN ACTIVA + Sección 9 + Feature Contract activo
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

### 3.6 H como Canal de Comunicación CC ↔ AG

`Protocolos/HANDOFF_CC_TO_AG.md` cumple dos funciones simultáneas:

1. **Estado entregado** — snapshot técnico del sistema al cierre de cada sesión (estructura existente)
2. **Canal de mensajes** — comunicación directa entre CC y AG sin que GrayMan tenga que repetir contexto

#### Reglas del canal

- La sección `## CANAL DE MENSAJES CC ↔ AG` vive **al final** de HANDOFF_CC_TO_AG.md, después del estado técnico
- Los mensajes son **append-only** — nunca se borran; son audit trail de la colaboración
- Cada mensaje sigue el formato exacto:

```
**[EMISOR] → [DESTINATARIO]** · [fecha YYYY-MM-DD HH:MM:SS]
[Cuerpo del mensaje — técnico y directo. Sin saludos. Sin relleno.]
```

> **IMPERATIVO de timestamp:** El agente DEBE obtener la hora real del sistema antes de escribir cada mensaje. Ejecutar `date +"%Y-%m-%d %H:%M:%S"` (Bash) inmediatamente antes de redactar el mensaje y usar ese valor exacto. **Prohibido inventar, estimar o copiar timestamps de mensajes anteriores.**

- El agente que lee H **debe** leer también la sección de mensajes antes de actuar
- Si un mensaje requiere respuesta, el agente responde en la misma sección antes del siguiente commit
- Los mensajes se escriben **en la sesión que cierra la unidad**, como parte del pre-commit L+H+F
- Temas válidos: hallazgos técnicos, advertencias, decisiones que el otro agente debe conocer, preguntas que GrayMan ya contestó
- Temas prohibidos: chatter, resúmenes que ya están en ESTADO ACTUAL, repetir lo que está en F

#### Solicitudes de re-lectura entre agentes

Un agente puede pedir al otro que re-lea un documento específico usando estas etiquetas en el cuerpo del mensaje:

| Etiqueta        | Acción requerida por el destinatario                 |
| --------------- | ---------------------------------------------------- |
| `[LEER: L]`     | Re-leer PROTOCOLO_L.md completo (con cascada H+F)    |
| `[LEER: H]`     | Re-leer HANDOFF_CC_TO_AG.md completo (con cascada F) |
| `[LEER: F]`     | Re-leer LOG_FORENSE.md últimas entradas              |
| `[LEER: L+H+F]` | Re-leer los tres — contexto crítico ha cambiado      |

El destinatario **debe** acusar recibo en su siguiente mensaje con `[LEÍDO: X]` antes de continuar.

#### 3.6.1 Mecanismo de Escucha — Activado en cada lectura de H

El mecanismo se dispara **cada vez que H es leído** — no solo al iniciar sesión. Esto incluye:

- Inicio de sesión con trigger `L` (cascada L→H→F)
- Invocación explícita de `H` en cualquier momento de la sesión
- Cambio de agente (AG↔CC) que activa H por protocolo

> `F` es autónomo y **no** activa la escucha del canal — F solo lee LOG_FORENSE.

**Lectura Eficiente de H (Optimización de Contexto):**
Queda estrictamente prohibido que el agente lea el archivo `HANDOFF_CC_TO_AG.md` completo. Debe emplear lectura por rango de líneas de la siguiente forma:

1. Leer únicamente la cabecera del archivo (líneas 1–30) para escanear el `## ESTADO ACTUAL` y el campo de control `Último mensaje`.
2. Si el campo `Último mensaje` indica que el último mensaje fue enviado por el otro agente (ej. si soy AG y dice `**CC → AG** · [timestamp]`), el agente debe proceder a leer las últimas líneas del archivo (las últimas 150–200 líneas) para obtener el cuerpo del mensaje y responder en consecuencia.
3. Si el campo `Último mensaje` indica que el último mensaje fue enviado por el agente activo (ej. si soy AG y dice `**AG → CC** · [timestamp]`), no es necesario leer el final del archivo ni escanear el canal de mensajes, ahorrando tiempo y tokens de contexto.

**Flujo de escucha — se ejecuta cada vez que H es leído:**

```
H es leído (por L, por trigger H, o por cambio de agente)
       │
       ▼
Agente escanea CANAL DE MENSAJES — de abajo hacia arriba
       │
       ├─ ¿Hay mensajes sin [ACK] dirigidos a mí?
       │         │                    │
       │        SÍ                    NO
       │         │                    │
       │         ▼                    ▼
       │  Responder con [ACK]    Continuar con
       │  o [LEÍDO: X] ANTES    la tarea activa
       │  de cualquier acción
       │
       ▼
Continuar con lo que activó la lectura de H
```

Esto significa que si GrayMan invoca `H` a mitad de una sesión, el agente activo detecta en ese momento cualquier mensaje nuevo que el otro agente haya dejado desde el último escaneo — sin necesidad de abrir una sesión nueva.

**Regla de escucha:** Un mensaje está "sin respuesta" si no hay un mensaje posterior del destinatario con `[ACK]`, `[LEÍDO: X]`, o una respuesta sustantiva. El agente activo resuelve los pendientes antes de continuar.

**Regla de brevedad y economía de tokens (CONCISIÓN ESTRICTA):**
Los mensajes en el canal deben ser ultra-precisos, técnicos y extremadamente concisos para optimizar el consumo de tokens y memoria de contexto.

1. Queda estrictamente prohibido incluir saludos, cierres, cortesías, o texto de relleno (greetings, pleasantries).
2. Prohibido duplicar información que ya esté descrita en el `## ESTADO ACTUAL` del handoff, el historial de Git, o el `LOG_FORENSE.md`.
3. El límite máximo por mensaje es de **6 líneas** (excluyendo el encabezado).
4. Si el tema a discutir requiere proponer diseños extensos, contratos o tablas complejas, **el agente no debe redactarlos en el canal**. Debe crear un archivo de soporte (ej. un archivo markdown en `Protocolos/` o en el directorio temporal `.gemini_scratch/`) y dejar únicamente un enlace Markdown clickeable en su mensaje apuntando a dicho archivo.

**Regla de ACK recíproco:** El `[ACK]` es **obligatorio para ambos agentes** — CC y AG. Cuando AG deja un mensaje en el canal, CC **debe** responder con `[ACK]` + resumen de lo entendido/accionado antes de continuar. El canal es bidireccional; ningún mensaje queda sin acuse de recibo.

**Regla de mensaje obligatorio al tocar H:** Cada vez que **cualquiera de los dos agentes** (CC o AG) escriba o modifique `HANDOFF_CC_TO_AG.md` por cualquier motivo (pre-commit, ACK, update de estado), **debe** dejar un mensaje dirigido al otro agente en el canal con:

- Últimas actualizaciones relevantes (qué cambió, qué se hizo)
- Dudas o preguntas abiertas si las hay
- Riesgos identificados si los hay
- Cualquier información que el otro agente necesite para mantenerse sincronizado en tiempo real

El objetivo es que el agente destinatario, al leer H en su próxima activación, encuentre el canal completamente al día sin necesidad de que GrayMan repita contexto. **No es opcional** — tocar H sin dejar mensaje al canal es una violación del protocolo.

#### 3.6.2 Roles: Ejecutor y Sentinela

En cada sesión activa existe un agente en rol **Ejecutor** y otro en rol **Sentinela**:

| Rol           | Agente                               | Función                                         |
| ------------- | ------------------------------------ | ----------------------------------------------- |
| **Ejecutor**  | El agente activo en la sesión actual | Implementa, actualiza protocolos, deja mensajes |
| **Sentinela** | El agente en espera (no activo)      | Recibe mensajes, audita, responde al activarse  |

**Asignación actual:** CC = Ejecutor · AG = Sentinela

**Obligación del Ejecutor al correr L:**

Al invocar el trigger `L` (o al inicio de sesión), el agente Ejecutor debe:

```
1. Leer PROTOCOLO_L.md completo (L)
2. Leer HANDOFF_CC_TO_AG.md (H) → escanear canal → atender mensajes del Sentinela
3. Leer LOG_FORENSE.md (F)
4. Analizar si algún protocolo requiere actualización según el contexto actual
5. Actualizar L, H o F si corresponde (local — no git)
6. Dejar mensaje al Sentinela en el canal H con el resumen del análisis
```

El paso 6 es obligatorio aunque no haya cambios que reportar — el Sentinela debe saber que el Ejecutor corrió L y qué encontró. Mensaje mínimo: estado leído + ninguna acción requerida.

#### 3.6.3 Archivos LHF — Solo Locales, Nunca en Git

`Protocolos/` está en `.gitignore`. Los archivos L, H y F son **exclusivamente locales**:

- Ambos agentes los leen y escriben vía filesystem compartido (OneDrive)
- **Prohibido** usar `git add -f Protocolos/...` o cualquier variante
- Los commits contienen **solo archivos de código** — nunca archivos de `Protocolos/`
- El versionado de VERSIÓN ACTUAL en L es un tracker local entre sesiones, no un tag de git

#### 3.6.4 Flujo de Feature Contract via Canal

Este flujo aplica **en ambas direcciones** — independientemente de cuál agente sea Sentinela y cuál sea Ejecutor. Cuando el Sentinela elabora una propuesta de trabajo (Feature Contract, pasos de implementación, refactor arquitectónico), el flujo autorizado es:

```
Sentinela redacta propuesta/pasos → escribe en canal H
  ↓
Ejecutor lee H (escaneo canal obligatorio)
  ↓
Ejecutor da su opinión a GrayMan (análisis técnico, riesgos, dudas)
  ↓
GrayMan da Go explícito al Ejecutor directamente
  ↓
Ejecutor ejecuta
```

**El mismo flujo aplica en sentido inverso:** si GrayMan cambia los roles (CC pasa a Sentinela, AG pasa a Ejecutor), CC puede enviar propuestas/pasos por el canal y AG aplica el mismo proceso — lee, da opinión a GrayMan, espera Go.

**Reglas de este flujo:**

- El Sentinela **puede y debe** incluir en el canal: pasos detallados, contexto arquitectónico, archivos a tocar, orden sugerido de implementación, referencias a documentos relevantes.
- El Sentinela **no debe** usar headers que suenen a orden: "Tu instrucción:", "Ejecuta:", "Debes:". El tono correcto es descriptivo/propositivo — "La propuesta contempla...", "Los pasos serían...", "El contrato incluye...".
- El Ejecutor **no ejecuta** por lectura del canal — solo informa a GrayMan y solicita autorización.
- Solo GrayMan puede emitir el Go de ejecución al Ejecutor. Ningún agente habla por GrayMan ni transmite su autorización.

#### 3.6.5 Regla de Continuidad Cronológica del Canal (BLOQUEANTE)

El canal CC↔AG es un audit trail inmutable. Su valor depende de que los mensajes aparezcan en **estricto orden cronológico** — más antiguo arriba, más reciente abajo — sin excepción.

**Las tres obligaciones (ninguna es opcional):**

**Obligación 1 — Timestamp del sistema vía tool call, siempre antes de redactar. (BLOQUEANTE)**

El agente **debe invocar la herramienta Bash o PowerShell** para obtener el timestamp — una llamada real al shell, no el conocimiento interno del modelo. Esta tool call es una precondición bloqueante: sin ella no se redacta el encabezado del mensaje. El valor obtenido se copia literalmente.

| Entorno    | Comando                                  |
| ---------- | ---------------------------------------- |
| PowerShell | `Get-Date -Format "yyyy-MM-dd HH:mm:ss"` |
| Bash       | `date +"%Y-%m-%d %H:%M:%S"`              |

> **Prohibido sin excepción:** inventar la hora, estimarla, inferirla del contexto de conversación, redondearla, o copiar el timestamp de un mensaje anterior. El modelo no tiene reloj — el shell sí. Si el reloj del sistema parece desfasado, reportarlo en el cuerpo del mensaje y usar el valor obtenido igualmente.

**Obligación 2 — Append al final, siempre.**

Los mensajes nuevos se escriben **únicamente al final** de la sección `## CANAL DE MENSAJES CC ↔ AG`. Insertar un mensaje entre mensajes existentes está prohibido, independientemente de la razón. Si se detecta un mensaje fuera de orden, se corrige antes de añadir el nuevo — nunca se deja el canal en estado corrupto.

**Obligación 3 — Verificar monotonía antes de escribir.**

Antes de añadir un mensaje, confirmar visualmente que el timestamp obtenido en la Obligación 1 es **posterior** al timestamp del último mensaje existente en el canal. Si no lo es (reloj desfasado, cambio de zona horaria), reportar la anomalía en el cuerpo del mensaje y nunca insertar antes del último.

**Consecuencia documentada de una violación:** En la sesión del 2026-06-08, un mensaje de `17:58:56` quedó insertado antes de uno de `17:19:15`, corrompiendo el audit trail. Fue necesario leer el canal completo, identificar el swap incorrecto, y ejecutar una corrección manual del archivo. El costo de una violación supera con creces el segundo que tarda en ejecutar `Get-Date`.

**Regla en una línea:** _Tool call al shell → copiar valor → redactar texto → append al final del canal único._

**Obligación 4 — La sección CANAL es única y vive al final absoluto del documento.**

Existe una sola sección `## CANAL DE MENSAJES CC ↔ AG` en todo `HANDOFF_CC_TO_AG.md`, ubicada al **final absoluto del archivo** — después de todos los bloques `## ESTADO ACTUAL` y `## ESTADO ANTERIOR` sin excepción. Está terminantemente prohibido:

- Crear una nueva cabecera `## CANAL DE MENSAJES CC ↔ AG` dentro de un bloque ESTADO
- Insertar una sección de canal en el encabezado, en medio del documento, o en cualquier posición que no sea la última
- Duplicar el canal en ninguna forma

Los mensajes nuevos se añaden mediante append a la sección existente al final. Si el agente necesita dejar un mensaje durante la escritura de un bloque ESTADO, debe terminar ese bloque, desplazarse al final del archivo, y agregar el mensaje en el canal canónico.

**Consecuencia documentada de una violación:** En la sesión del 2026-06-08, CC insertó tres secciones `## CANAL...` dentro y entre bloques ESTADO (líneas 52, 202 del archivo). Fue necesario tres ediciones manuales para extraer los mensajes, eliminar las cabeceras duplicadas y reposicionarlos al final. La corrección costó contexto, tiempo y una sesión de GrayMan.

**Obligación 5 — Continuidad Conversacional.**

Las IAs nunca deben perder el hilo del chat en el Canal H. Al redactar un mensaje, el agente debe **siempre** contestar o acusar de recibo del último mensaje dejado por el otro agente primero, antes de introducir nueva información o reportar nuevos estatus. Si el último mensaje hace preguntas o plantea dudas, deben ser respondidas explícitamente en el primer párrafo del nuevo mensaje. Esto previene hilos fragmentados y pérdida de contexto crítico.

**Obligación 6 — Checkpoint de Cabecera.**

Cada vez que el agente escriba un nuevo mensaje en el canal al final del archivo, debe obligatoriamente actualizar la línea `Último mensaje:` en el bloque de metadata de la cabecera (líneas 1–30) de `HANDOFF_CC_TO_AG.md`. La cabecera debe reflejar de forma exacta el emisor, destinatario y timestamp del mensaje recién añadido.
Ejemplo: `Último mensaje: **AG → CC** · 2026-06-10 15:08:39`
Esto permite al agente entrante en la siguiente sesión escanear el estado de la conversación leyendo únicamente la cabecera.

**Obligación 7 — Entrada Única Consolidada por Turno.**

Queda estrictamente prohibido que un mismo agente publique múltiples mensajes consecutivos en el canal `HANDOFF_CC_TO_AG.md`. Toda la información, reportes, acuses de recibo y propuestas de la sesión activa deben consolidarse en un **único mensaje final al terminar el turno**.

- **Estructura Multitemática:** Si la sesión abarca múltiples tópicos (ej. responder al agente anterior, reportar el estatus y plantear una propuesta), el agente debe estructurar su único mensaje utilizando apartados o bloques anidados claros (ej. `[ACK]`, `[REPORTE]`, `[PROPUESTA]`).
- **Límite de Tokens:** Para entradas consolidadas multitemáticas, se permite un límite de hasta **6 líneas por cada bloque o sección anidada**, manteniendo siempre el estándar de concisión estricta y delegando los detalles extensos a archivos de soporte.

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

> **Régimen de push (ambos agentes):** CC y AG hacen push automático después de cada commit exitoso. Ver Sección 13.

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

| #      | Fase         | Acción                                                                                        | Estado requerido                       |
| ------ | ------------ | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| **0**  | Secret Scan  | Revisar staged files en busca de tokens, API keys, JWT, connection strings hardcodeados       | `0` hallazgos                          |
| **0b** | Version Bump | Actualizar línea `VERSIÓN ACTUAL` en este archivo (`PROTOCOLO_L.md`) e incluirlo en `git add` | Actualizado y staged                   |
| **0c** | RED          | Escribir test(s) que mapeen los Acceptance Criteria del Feature Contract                      | Tests **fallan**                       |
| **0d** | Confirmación | `vitest run` — verificar que el fallo es el esperado                                          | Confirmado                             |
| **1**  | GREEN        | Implementar el código mínimo para pasar los tests                                             | Tests **pasan**                        |
| **2**  | REFACTOR     | Limpiar sin romper — DRY, naming, complejidad                                                 | Tests siguen **pasando**               |
| **3**  | Lint         | `eslint --max-warnings=0` sobre archivos modificados                                          | `0` errores                            |
| **4**  | TypeScript   | `tsc --noEmit` en ambas apps                                                                  | `0` errores                            |
| **5**  | Cobertura    | `vitest run --coverage` — delta no puede bajar del baseline                                   | Delta ≥ 0                              |
| **6**  | Propuesta    | Presentar versión `V.x.x.x_...` a GrayMan con pre-flight report                               | Await `"Go"`                           |
| **7**  | Push         | `git add [archivos] && git commit && git push`                                                | Automático post-commit (ambos agentes) |

**Test obligatorio por tipo de cambio:**

| Tipo                         | Test requerido                                    |
| ---------------------------- | ------------------------------------------------- |
| Nuevo endpoint API           | Integración (Vitest + db mock)                    |
| Nueva lógica de negocio pura | Unitario (función exportada)                      |
| Nuevo componente con lógica  | Renderizado + interacción (Testing Library + MSW) |
| Migración SQL                | Script idempotente validado en dev                |
| Cambio UI puro               | No requiere test — validación visual              |

### 6.3.1 Contrato TDD — Cuándo el RED es obligatorio

El paso **0c (RED)** del pipeline no es opcional. Sin embargo, el ciclo completo Red→Green→Refactor aplica de forma diferente según el tipo de código:

| Tipo de código                                                                      | Ciclo requerido                        | Razón                                                                             |
| ----------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| **Lógica de negocio pura con condiciones** (`if`/`switch`/cálculos/ventanas)        | **RED → GREEN → REFACTOR obligatorio** | El test debe existir ANTES del código para que defina el contrato, no lo confirme |
| **Funciones con invariantes críticos** (engines, algoritmos, reglas de ciclo)       | **RED → GREEN → REFACTOR obligatorio** | Errores en estas funciones son silenciosos sin test previo                        |
| **Wiring con Feature Contract cerrado** (bridge SQL, route registration, glue code) | **Test-after aceptable**               | El diseño ya está tomado; el test confirma la integración                         |
| **Componentes UI sin lógica propia** (layout, estilos, texto)                       | **Validación visual únicamente**       | Test sería frágil y no agrega valor defensivo                                     |

**Proceso para RED genuino (obligatorio en los dos primeros tipos):**

```
1. Escribir el test que expresa el comportamiento esperado
2. vitest run [test-file] — confirmar fallo con el ERROR ESPERADO (no "cannot find module")
3. Implementar el mínimo para pasar
4. vitest run — confirmar GREEN
5. Refactor si aplica — vitest run — confirmar que sigue GREEN
```

> **Señal de alerta:** Si el test pasa en el primer `vitest run` (antes de escribir la implementación), el test fue escrito mirando el código, no especificando el comportamiento. Esto es test-after, no TDD. Reescribir el test desde cero pensando en el contrato, no en la implementación.

**Criterio de diferencia práctica:**

Un test escrito en RED genuino puede describir un caso que la implementación no maneja todavía. Un test escrito en test-after sólo confirma lo que ya funciona. Si no puedes imaginar cómo el test fallaría si la implementación tuviera un bug, es test-after.

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

## SECCIÓN 13 — MODELO DE OPERACIÓN AUTÓNOMA (CC Y AG — VIGENTE DESDE 2026-06-06)

> **Aprobado por GrayMan.** Estas reglas son ley de protocolo equivalente a EAL6+. Aplican a **CC (Claude Code) y AG (Antigravity)** por igual.

### 13.0 Sistema de Triggers

Los triggers son disparadores de lectura obligatoria. Cualquier agente puede invocarlos explícitamente en el prompt o GrayMan puede activarlos por su letra.

| Trigger | Letra | Acción                                                                                         | Cuándo se activa                                                               |
| ------- | ----- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **L**   | `L`   | Leer y comprender `Protocolos/PROTOCOLO_L.md` completo — VERSIÓN ACTIVA + Secciones 9 y 13     | Inicio de sesión (obligatorio) · Cuando GrayMan escribe `L`                    |
| **H**   | `H`   | Leer cabecera y canal de `Protocolos/HANDOFF_CC_TO_AG.md` (§3.6.1) — estado y mensajes         | Inicio de sesión (obligatorio) · Cambio de agente · Cuando GrayMan escribe `H` |
| **F**   | `F`   | Leer y comprender `Protocolos/LOG_FORENSE.md` — últimas 2–3 entradas del historial de sesiones | Inicio de sesión (obligatorio) · Cuando GrayMan escribe `F`                    |

**Orden de lectura al iniciar sesión:** L → H → F → MEMORY.md → `git log` + `git status`

#### Cascada de Lectura por Trigger

Cada trigger tiene un alcance exacto de lectura. No más, no menos.

| Trigger recibido | Documentos que el agente **debe** leer y comprender                                              |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| **L**            | PROTOCOLO_L.md completo **+** HANDOFF cabecera y canal (§3.6.1) **+** LOG_FORENSE.md últimas (F) |
| **H**            | HANDOFF cabecera y canal (§3.6.1) **+** LOG_FORENSE.md últimas (F)                               |
| **F**            | LOG_FORENSE.md últimas (solo F)                                                                  |

> **Lógica:** L es el trigger maestro — garantiza contexto completo. H arrastra F porque el estado entregado necesita historial de decisiones. F es autónomo — el log es suficiente por sí solo.

### 13.1 Las Trece Reglas

| #      | Regla                                       | Comportamiento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **Autonomía total — sin preguntar**         | El agente ejecuta **todos** los comandos sin solicitar permiso. Sin prompts de confirmación para operaciones normales. GrayMan no debe ser interrupted por aprobaciones rutinarias.                                                                                                                                                                                                                                                                                                                                                                        |
| **2**  | **Tests en el mismo commit**                | Todo commit que introduzca código nuevo debe incluir sus tests en el mismo commit. Prohibido separar código y cobertura en commits distintos.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **3**  | **Commit + push automático por unidad**     | Al cerrar cada unidad lógica de trabajo (capa, feature, fix), el agente hace commit y push a `origin/main` sin esperar autorización. GrayMan trackea el flujo desde GitHub.                                                                                                                                                                                                                                                                                                                                                                                |
| **4**  | **Lectura obligatoria L → H → F al inicio** | Al iniciar cada sesión: L (PROTOCOLO_L) → H (HANDOFF, ver §3.6.1 para lectura eficiente) → F (LOG_FORENSE) → MEMORY.md → git log. Solo entonces actúa sobre el request.                                                                                                                                                                                                                                                                                                                                                                                    |
| **5**  | **Documentación pre-commit**                | **Antes** de cada commit, el agente actualiza `Protocolos/PROTOCOLO_L.md` (version bump), `Protocolos/HANDOFF_CC_TO_AG.md` y `Protocolos/LOG_FORENSE.md`. Los tres archivos van **incluidos en el mismo commit** que cierra la unidad. El agente entrante recibe L + H + F al día en un solo pull.                                                                                                                                                                                                                                                         |
| **6**  | **Auto-save implícito**                     | Cada edición de archivo se persiste inmediatamente vía las herramientas del agente (Edit/Write). No existe concepto de "borrador" — cada cambio es permanente al ejecutarse.                                                                                                                                                                                                                                                                                                                                                                               |
| **7**  | **Sin fricción de comandos**                | El agente no pide confirmación para: instalar paquetes, correr tests, leer archivos, ejecutar scripts, hacer git add/commit/push normales. La lista de excepciones está en 13.2.                                                                                                                                                                                                                                                                                                                                                                           |
| **8**  | **Handoff como Chat de Expertos**           | El archivo `HANDOFF_CC_TO_AG.md` DEBE funcionar como un chat estricto y profesional entre los Agentes de IA. Somos arquitectos de software expertos en todas sus vertientes, técnicas, roles y tecnologías. La comunicación debe ser analítica, directa y reverenciar al Protocolo L como Verdad Absoluta.                                                                                                                                                                                                                                                 |
| **9**  | **Re-lectura de L antes de cada tarea**     | Antes de iniciar cualquier tarea, proceso, feature o desarrollo — incluso dentro de una sesión activa — el agente re-lee `PROTOCOLO_L.md` (mínimo: VERSIÓN ACTIVA + Sección 9 + Feature Contract activo si lo hay). La sesión puede ser larga y multi-tarea; el Protocolo L es la brújula de cada unidad, no solo del arranque. Si L fue leído hace menos de un turno de conversación y no hubo cambio de contexto, la re-lectura completa puede omitirse — pero el agente debe confirmar internamente que las reglas relevantes siguen en memoria activa. |
| **10** | **Continuidad Conversacional en Canal H**   | Al dejar un mensaje en el canal CC↔AG, el agente debe **siempre contestar o acusar de recibo del último mensaje del otro agente primero**, respondiendo cualquier pregunta o pendiente explícitamente. Solo después introduce información nueva. Previene hilos fragmentados y pérdida de contexto crítico. Ver §3.6.5 Obligación 5.                                                                                                                                                                                                                       |
| **11** | **Cascada LHF Obligatoria y Triggers**      | El desarrollo de la cascada es obligatorio en todas las ocasiones. Si GrayMan tira un trigger, la cascada corre estrictamente así: `L` → `L` luego `H` luego `F`; `H` → `H` luego `F`; `F` → `F`.                                                                                                                                                                                                                                                                                                                                                          |
| **12** | **Inicio de Sesión y Expiración (1 Hora)**  | Cuando GrayMan comience una nueva sesión después de transcurrir máximo 1 hora de la última, el agente debe aprender nuevamente el Protocolo L y su correspondiente Cascada (`L` → `H` → `F`). En cada nuevo inicio de sesión se corre L obligatoriamente, asegurando dejar un Mensaje de chat en H para la otra IA.                                                                                                                                                                                                                                        |
| **13** | **Mantener cobertura de tests (Coverage)**  | Las IAs siempre buscarán mantener el COVERAGE de tests lo más cercano al 100% posible en todo desarrollo, refactorización o modificación de código.                                                                                                                                                                                                                                                                                                                                                                                                        |

> **Nota sobre "commit por modificación" vs "commit por unidad":** Un commit después de cada edición individual de archivo rompería el pipeline TDD (tests → lint → tsc deben pasar antes del commit). La Regla 3 aplica al cierre de cada **unidad lógica** — una capa completa, un fix cerrado, un feature completo. Dentro de una unidad, el agente edita libremente sin commitear. Al cerrar la unidad: (1) actualizar **L + H + F** (Regla 5), (2) pre-flight vitest (Regla 2), (3) commit todo junto + push.

### 13.1.1 CHECKLIST PRE-COMMIT — OBLIGATORIO ANTES DE CADA `git commit`

> **El agente NO puede ejecutar `git commit` sin haber completado estos pasos en orden.**

```
[ ] 1. PROTOCOLO_L.md  — VERSIÓN ACTUAL bumpeada (edición local — NO va en git add)
[ ] 2. HANDOFF_CC_TO_AG.md — header + ESTADO ACTUAL actualizados (local — NO git add)
[ ] 3. LOG_FORENSE.md  — entrada nueva (local — NO git add)
[ ] 4. CANAL DE MENSAJES en H — ejecutar Get-Date / date ANTES de redactar, append al final (§3.6.5)
[ ] 5. git add [archivos de código únicamente] — NUNCA incluir Protocolos/
[ ] 6. git commit + git push
```

> **`Protocolos/` está en `.gitignore` — los cambios en L, H y F son locales.**
> Ambos agentes acceden a los mismos archivos vía filesystem compartido (OneDrive).
> Usar `git add -f Protocolos/...` está **prohibido**.

Si cualquiera de los pasos 1–4 no está completo, el commit **no ocurre**. No hay excepciones.

### 13.2 Excepciones — Confirmación explícita de GrayMan siempre requerida

| Operación                          | Razón                                     |
| ---------------------------------- | ----------------------------------------- |
| `git push --force` / `git push -f` | Reescribe historial remoto — irreversible |
| `git reset --hard`                 | Descarta trabajo local — irreversible     |
| `rm -rf [directorio de código]`    | Destrucción masiva — irreversible         |
| `git clean -f`                     | Elimina untracked files — irreversible    |

### 13.3 Los Dos Únicos Momentos que Requieren Visto Bueno

1. **Plan de implementación** — antes de ejecutar cambios no triviales (Protocolo L Sección 5, Cuadrantes I–III)
2. **Resultado del Pre-Flight** — el agente presenta el pre-flight report y espera `"Go"` antes del commit

### 13.4 Configuración Técnica de Referencia

| Archivo                       | Contenido clave                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.claude/settings.local.json` | `allow: ["Bash(*)", "Read", "Edit", "Write", "Glob", "Grep", "PowerShell(*)"]` + `deny` de 5 operaciones destructivas |
| `CLAUDE.md`                   | Las 12 reglas y triggers como texto normativo — se carga en cada sesión de CC                                         |
| `.husky/pre-commit`           | Solo `npx lint-staged` — tests NO van en hook (530+ tests = 2+ min por commit; enforcement real: CI)                  |
| CI (GitHub Actions)           | 16 jobs paralelos verifican coverage thresholds en cada push                                                          |

### 13.5 Fuentes de Verdad para este Modelo

- **`CLAUDE.md`** — instrucciones que CC carga automáticamente al inicio de sesión
- **`Protocolos/HANDOFF_CC_TO_AG.md` Sección 0** — descripción operativa para ambos agentes
- **Esta sección (13)** — fuente normativa dentro del Protocolo L

---

_END OF PROTOCOL · Versión V.4.0.0 · Modificación restringida a GrayMan_
