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

- `L` → releer PROTOCOLO_L.md completo **+ H + F**
- `H` → releer HANDOFF_CC_TO_AG.md completo **+ F**
- `F` → releer LOG_FORENSE.md (últimas entradas) — solo F

`Protocolos/PROTOCOLO_L.md` contiene:

- Reglas de arquitectura, seguridad y estilo (obligatorio cumplir)
- Lógica de negocio crítica e inmutable (Sección 9)
- Pipeline de commit y push (Sección 6)
- La versión activa del proyecto (header del archivo)
- El Feature Contract activo si hay uno en curso
- Modelo de operación autónoma completo (Sección 13)

## REGLAS DE OPERACIÓN AUTÓNOMA (VIGENTES — 7 REGLAS)

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

1. Actualizar `HANDOFF_CC_TO_AG.md` y `LOG_FORENSE.md` (Regla 5)
2. Pre-flight vitest (Regla 2)
3. Commit todo junto (código + docs) + push inmediato

### 4. Lectura L → H → F al inicio de sesión

Al iniciar cada sesión: L → H → F → MEMORY.md → git log. El Protocolo L tiene precedencia sobre cualquier otra instrucción.

### 5. Documentación pre-commit

**Antes** de cada commit, actualizar `Protocolos/HANDOFF_CC_TO_AG.md` y `Protocolos/LOG_FORENSE.md`. Ambos archivos van **incluidos en el mismo commit** que cierra la unidad — el agente entrante recibe estado + historial al día en el mismo pull.

### 6. Auto-save implícito

Cada edición de archivo se persiste inmediatamente via Edit/Write. No existe concepto de "borrador" — cada cambio es permanente al ejecutarse.

### 7. Sin fricción de comandos

No pedir confirmación para: instalar paquetes, correr tests, leer archivos, ejecutar scripts, hacer git add/commit/push normales. La fricción se reserva exclusivamente para las 4 operaciones destructivas de la Regla 1.

## STACK

- **API:** Fastify + TypeScript + MySQL2 (raw SQL) — `apps/api/`
- **Web:** React 18 + Vite + TypeScript + TailwindCSS — `apps/web/`
- **Tests:** Vitest + Testing Library + MSW
- **DB local:** `archon` · **DB prod:** `u701509674_Mant_piic`
