# Archon ERP — Claude Code Project Instructions

## ACCIÓN OBLIGATORIA AL INICIAR SESIÓN

**Antes de cualquier otra acción**, leer el protocolo maestro completo:

```
Protocolos/PROTOCOLO_L.md
```

Este archivo es la única fuente de verdad del proyecto. Contiene:

- Reglas de arquitectura, seguridad y estilo (obligatorio cumplir)
- Lógica de negocio crítica e inmutable (Sección 9)
- Pipeline de commit y push (Sección 6)
- La versión activa del proyecto (header del archivo)
- El Feature Contract activo si hay uno en curso

## DESPUÉS DE LEER EL PROTOCOLO

1. Ejecutar `git log --oneline -10` y `git status` para entender el estado actual
2. Leer `MEMORY.md` del memory system para contexto de sesiones anteriores
3. Solo entonces responder o actuar sobre el request del usuario

## STACK

- **API:** Fastify + TypeScript + MySQL2 (raw SQL) — `apps/api/`
- **Web:** React 18 + Vite + TypeScript + TailwindCSS — `apps/web/`
- **Tests:** Vitest + Testing Library + MSW
- **DB local:** `archon` · **DB prod:** `u701509674_Mant_piic`
