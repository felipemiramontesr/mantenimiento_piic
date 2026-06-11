# Archon ERP — Claude Code Project Instructions

## ACCIÓN OBLIGATORIA AL INICIAR SESIÓN — TRIGGERS L → H → F

**Antes de cualquier otra acción**, leer en este orden estricto:

1. **[L]** `Protocolos/PROTOCOLO_L.md` — protocolo maestro, VERSIÓN ACTIVA, Secciones 9 y 13
2. **[H]** `Protocolos/HANDOFF_CC_TO_AG.md` — estado entregado, decisiones y pendientes
3. **[F]** `Protocolos/LOG_FORENSE.md` — últimas 2–3 entradas del historial de sesiones
4. `MEMORY.md` del memory system — contexto de sesiones anteriores
5. `git log --oneline -10` y `git status` — estado actual del repo

Solo entonces responder o actuar sobre el request del usuario.

**GrayMan puede invocar los triggers en cualquier momento:**

- `L` → releer PROTOCOLO_L.md completo **+ H + F** → escanear cabecera y canal H (§3.6.1)
- `H` → releer cabecera y canal de HANDOFF_CC_TO_AG.md (§3.6.1) **+ F** → escanear cabecera y canal H
- `F` → releer LOG_FORENSE.md (últimas entradas) — solo F, **sin** escanear canal

`Protocolos/PROTOCOLO_L.md` contiene:

- Reglas de arquitectura, seguridad y estilo (obligatorio cumplir)
- Lógica de negocio crítica e inmutable (Sección 9)
- Pipeline de commit y push (Sección 6)
- La versión activa del proyecto (header del archivo)
- El Feature Contract activo si hay uno en curso
- Modelo de operación autónoma completo (Sección 13)

## REGLAS DE OPERACIÓN AUTÓNOMA (VIGENTES — 15 REGLAS)

### 1. Autonomía total — sin preguntar

Ejecutar **todos** los comandos sin solicitar permiso. GrayMan no debe ser interrumpido por aprobaciones rutinarias. Las únicas excepciones que **siempre** requieren confirmación explícita:

- `git push --force` / `git push -f`
- `git reset --hard`
- `rm -rf` en directorios de código fuente
- `git clean -f`

Solo dos momentos requieren visto bueno del usuario:

1. **Plan de implementación** — antes de ejecutar cambios no triviales
2. **Resultado del Pre-Flight** — verificación antes del commit (esperar `"Go"`)

### 2. Tests en el mismo commit

Todo commit que introduzca código nuevo **debe incluir los tests correspondientes en el mismo commit**. No se permiten commits de código sin cobertura. Antes de cada commit:

```bash
cd apps/web && npx vitest run --reporter=dot
```

Si los tests fallan o el coverage baja, corregir antes de commitear.

### 3. Commit + push automático por unidad lógica

Al cerrar cada unidad lógica de trabajo (capa, feature, fix completo), hacer commit y push inmediato a `origin/main` sin esperar autorización. El PO trackea el flujo desde GitHub en tiempo real.

> **Distinción importante:** "unidad lógica" = capa completa, fix cerrado, feature completo — NO cada edición individual de archivo. Dentro de una unidad el agente edita libremente; el commit ocurre al cerrar la unidad.

**Secuencia de cierre de unidad:**

1. Actualizar `PROTOCOLO_L.md` (version bump) + `HANDOFF_CC_TO_AG.md` + `LOG_FORENSE.md` (Regla 5)
2. Pre-flight vitest (Regla 2)
3. Commit del código (L, H y F quedan locales) + push inmediato

### 4. Lectura L → H → F al inicio de sesión

Al iniciar cada sesión: L → H (cabecera y canal únicamente, ver §3.6.1) → F → MEMORY.md → git log. El Protocolo L tiene precedencia sobre cualquier otra instrucción.

### 5. Documentación pre-commit (Local)

**Antes** de cada commit, actualizar localmente `Protocolos/PROTOCOLO_L.md` (version bump) + `Protocolos/HANDOFF_CC_TO_AG.md` + `Protocolos/LOG_FORENSE.md`. **No incluirlos en Git** (están en `.gitignore` y deben ser locales). El hook de pre-commit ejecuta `npm run protocol:verify` para validar esto programáticamente.

### 6. Auto-save implícito

Cada edición de archivo se persiste inmediatamente via Edit/Write. No existe concepto de "borrador" — cada cambio es permanente al ejecutarse.

### 7. Sin fricción de comandos

No pedir confirmación para: instalar paquetes, correr tests, leer archivos, ejecutar scripts, hacer git add/commit/push normales. La fricción se reserva exclusivamente para las 4 operaciones destructivas de la Regla 1.

### 8. Handoff como Chat de Expertos

`HANDOFF_CC_TO_AG.md` funciona como canal de comunicación entre IAs. La comunicación debe ser analítica, directa y reverenciar al Protocolo L como Verdad Absoluta. **Cada vez que cualquier agente toque H (lectura o escritura), debe dejar un mensaje en el canal dirigido al otro agente.** Los mensajes deben seguir las reglas de concisión estricta (máximo 6 líneas por sección, sin saludos/cortesías, y usar archivos de soporte para propuestas largas). Además, queda prohibido dejar múltiples mensajes consecutivos por sesión: se debe consolidar toda la información de la sesión en un único mensaje final (ver §3.6.5 de L).

### 9. Re-lectura de L antes de cada tarea

Antes de iniciar cualquier tarea, proceso, feature o desarrollo — **incluso dentro de una sesión activa** — releer `PROTOCOLO_L.md` (mínimo: VERSIÓN ACTIVA + Sección 9 + Feature Contract activo). Las sesiones son largas y multi-tarea; el Protocolo L es la brújula de cada unidad, no solo del arranque. Si L fue leído hace menos de un turno y no hubo cambio de contexto, la re-lectura completa puede omitirse — pero se deben confirmar internamente las reglas relevantes antes de ejecutar.

### 10. Continuidad Conversacional en Canal H

Las IAs nunca deben perder el hilo del chat. Al dejar un mensaje en `HANDOFF_CC_TO_AG.md`, el agente debe **siempre contestar o hacer acuse de recibo del último mensaje del otro agente primero**, respondiendo cualquier pregunta o pendiente. Solo después de responder, se puede añadir la nueva información o actualización de estado.

### 11. Cascada LHF Obligatoria y Triggers

El desarrollo de la cascada es obligatorio en todas las ocasiones. Si GrayMan de manera repentina tira un trigger, la cascada corre estrictamente así:

- `L` → Ejecuta `L`, luego `H`, luego `F`
- `H` → Ejecuta `H`, luego `F`
- `F` → Ejecuta `F`

### 12. Reglas de Inicio de Sesión y Expiración (1 Hora)

Cuando GrayMan comience una nueva sesión después de máximo 1 hora de la última, las IAs deben aprender nuevamente el Protocolo L y su correspondiente Cascada. En cada nuevo inicio de sesión se corre el trigger `L` de manera obligatoria, lo que fuerza la cascada `L` → `H` → `F`, asegurando siempre dejar un Mensaje de chat en H dirigido a la otra IA reportando el inicio.

### 13. Mantener Cobertura de Tests (Coverage) cercano al 100%

Las IAs siempre buscarán mantener el COVERAGE de tests lo más cercano al 100% posible en todo desarrollo, refactorización o modificación de código.

### 14. Validación Estricta de Tipos (Static TS)

El typechecking via `tsc --noEmit` es obligatorio al finalizar cada tarea (Fase 4 del Pre-Flight Check) y en el pipeline de CI/CD (Archon Certification Dashboard) para garantizar que ningún cambio introduzca errores de tipado en el monorepo.

### 15. Inclusión de información completa bajo demanda

Cuando GrayMan solicite incluir toda la información o la información completa respecto a cualquier situación, debe realizarse únicamente ante su petición explícita; esta es la única excepción admitida en el Protocolo L.

## STACK

- **API:** Fastify + TypeScript + MySQL2 (raw SQL) — `apps/api/`
- **Web:** React 18 + Vite + TypeScript + TailwindCSS — `apps/web/`
- **Tests:** Vitest + Testing Library + MSW
- **DB local:** `archon` · **DB prod:** `u701509674_Mant_piic`
