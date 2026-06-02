# DECISIONS LOG — Archon ERP

Registro de decisiones arquitectónicas y de ingeniería que modifican esquemas de DB o contratos de API.

---

## [V.78.101.0] — 2026-05-30 — Finance Module Phase 1

### Decisión: Backfill de historial de mantenimiento → financial_transactions

**Contexto:** Al lanzar el módulo Finanzas en Fase 1 (dev/testing), el ledger `financial_transactions` está vacío. Ya existen costos reales en `fleet_maintenance_extensions.cost` de registros históricos.

**Decisión tomada:** Ejecutar `backfill_finance_from_maintenance.sql` en ambiente de desarrollo para poblar el ledger con registros `source=AUTO` vinculados por `source_uuid` al `fleet_movements.uuid` de origen.

**Alternativas evaluadas:**

- Mantener ledger vacío hasta producción → rechazado porque el área de finanzas no puede evaluar el módulo sin datos reales.
- Integrar el backfill directo en la migración 085 → rechazado porque el backfill es ONE-TIME y no idempotente de forma segura en un entorno multiambiente.

**Impacto en producción:** NINGUNO aún. El script de backfill NO se ejecuta automáticamente.

**Acción requerida pre go-live:** Antes del lanzamiento a producción:

1. Truncar `financial_transactions` en producción.
2. Validar y limpiar el dataset de costos históricos con el cliente.
3. Re-ejecutar solo el subconjunto de registros validados.
4. Esta nota debe estar en el Feature Contract de go-live (hardening phase).

---

### Decisión: computePeriod usa métodos UTC

**Contexto:** `new Date('YYYY-MM-DD')` en JavaScript se parsea como UTC midnight. Usar `getMonth()` (local time) en el servidor de producción en Hostinger (zona horaria desconocida) puede producir un mes incorrecto para fechas al inicio del mes.

**Decisión tomada:** `computePeriod` usa `getUTCFullYear()` y `getUTCMonth()` para garantizar determinismo independiente de la zona horaria del servidor.

---

### Decisión: Export CSV nativo sin dependencias nuevas

**Contexto:** El área de finanzas necesita exportar reportes. Las opciones eran CSV nativo, jsPDF (~300KB), o print-to-PDF.

**Decisión tomada:** CSV desde la API con `Content-Type: text/csv`. Cero dependencias nuevas de producción. Excel lo abre automáticamente. Si se requiere PDF en el futuro, se implementará vía `window.print()` con CSS @media print (también sin dependencias).

---

### Decisión: financial:write asignado a todos los roles (Fase 1)

**Contexto:** El cliente aún no ha definido qué roles deben tener acceso de escritura financiera.

**Decisión tomada:** Asignar `financial:write` y `financial:report` a todos los roles para la fase de pruebas. Se revocarán permisos en el hardening previo al go-live según instrucción del cliente.

**Referencia:** Migración 086 + confirmación verbal de GrayMan (2026-05-30).
