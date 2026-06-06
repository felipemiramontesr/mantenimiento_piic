# Archon ERP — Claude Code Project Instructions

## ACCIÓN OBLIGATORIA AL INICIAR SESIÓN

**Antes de cualquier otra acción**, leer en este orden:

1. `Protocolos/PROTOCOLO_L.md` — protocolo maestro (única fuente de verdad)
2. Todos los archivos en `Protocolos/` — protocolos derivados y handoffs
3. `MEMORY.md` del memory system — contexto de sesiones anteriores
4. `git log --oneline -10` y `git status` — estado actual del repo

Solo entonces responder o actuar sobre el request del usuario.

`Protocolos/PROTOCOLO_L.md` contiene:

- Reglas de arquitectura, seguridad y estilo (obligatorio cumplir)
- Lógica de negocio crítica e inmutable (Sección 9)
- Pipeline de commit y push (Sección 6)
- La versión activa del proyecto (header del archivo)
- El Feature Contract activo si hay uno en curso

## REGLAS DE OPERACIÓN AUTÓNOMA (VIGENTES)

### 1. Permisos y autonomía

Ejecutar todos los comandos sin solicitar permiso por cada uno. Las únicas excepciones que **siempre** requieren confirmación explícita del usuario:

- `git push --force` / `git push -f`
- `git reset --hard`
- `rm -rf` en directorios de código fuente
- `git clean -f`

Solo dos momentos requieren visto bueno del usuario:

1. **Plan de implementación** — antes de ejecutar cambios no triviales
2. **Resultado del Protocolo L** — verificación de pre-flight antes del commit

### 2. Coverage como requisito de commit

Todo commit que introduzca código nuevo **debe incluir los tests correspondientes en el mismo commit**. No se permiten commits de código sin cobertura. Antes de cada commit:

```bash
cd apps/web && npx vitest run --reporter=dot
```

Si los tests fallan o el coverage baja, corregir antes de commitear.

### 3. Push automático después de cada commit

Después de cada commit exitoso, hacer push inmediato a `origin/main`. El PO trackea el flujo desde GitHub en tiempo real. Excepción: si el usuario indica explícitamente que no haga push.

### 4. Protocolo L siempre activo

Trabajar siempre bajo Protocolo L y todos los protocolos en `Protocolos/`. Si hay conflicto entre estas instrucciones y el Protocolo L, el Protocolo L tiene precedencia.

### 5. Documentación de protocolos post-commit

Después de cada commit o modificación del sistema, actualizar los archivos relevantes en `Protocolos/` — especialmente `Protocolos/HANDOFF_CC_TO_AG.md` — para que AG (Antigravity) tenga una base sólida si los tokens de CC se agotan o CC se atasca.

## STACK

- **API:** Fastify + TypeScript + MySQL2 (raw SQL) — `apps/api/`
- **Web:** React 18 + Vite + TypeScript + TailwindCSS — `apps/web/`
- **Tests:** Vitest + Testing Library + MSW
- **DB local:** `archon` · **DB prod:** `u701509674_Mant_piic`
