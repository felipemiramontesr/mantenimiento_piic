FEATURE CONTRACT
══════════════════════════════════════════════════════
Feature : UPA_Core_Engine_And_Test_Harness
Agente Driver: CC (Claude Code)
Fecha : 2026-06-06

SCOPE
─────
Qué hace : Implementar el Test Harness (Vitest) y el motor lógico puro del Proceso Universal Archon (UPA) descrito en Protocolos/UPA.md.
Qué NO hace : NO conectar con la UI. NO crear migraciones de DB en esta sesión (solo types/interfaces in-memory para el motor matemático).

RESOLUCIÓN DE PUNTOS DE IMPLEMENTACIÓN (FC-1 a FC-4)
────────────────────────────────────────────────────
FC-1 (Deduplicación): La clave de lookup será el "último work_order cerrado de ese vehículo". Si en ese WO no está la tarea X, se inyecta. Si está y fue exitosa, se purga.
FC-2 (N_A_STRUCTURAL Reversibilidad): Es inmutable a nivel de flujo de taller. Si el vehículo se modifica físicamente, se requiere actualizar el expediente del vehículo (admin panel) para resetear los flags N_A.
FC-3 (Timeout 24h Etapa 5): Se implementará conceptualmente como un Job Asíncrono (Cron) que barrerá órdenes en awaiting_auth con `TIMESTAMPDIFF(HOUR) > 24` (excluyendo fines de semana). Por ahora, en el Test Harness, simular la transición mediante una función pura `checkStage5Timeout(order, currentTime)`.
FC-4 (Minería Hard Stop): Se ha añadido `fleet_type` (Urban/Mining) a los requerimientos del Hard Stop en UPA.md para asegurar que la inyección de Stage 1 nunca omita seguridad minera silenciosamente.

INPUT / OUTPUT
──────────────
Entrada : `vehicleProfile` (con odometer, brand, fuel, fleet_type), `orderHistory` (último WO).
Salida : `Task[]` atómico de ~77 registros (para la apertura de orden), boolean flags para transiciones.
DB Delta : Ninguno en esta fase (solo tipos lógicos).

ACCEPTANCE CRITERIA (Gherkin)
──────────────────────────────
Scenario 1 — Tolerancia Simétrica (Regla 3):
Given un odómetro de 11,400 km
When se calcula la cascada
Then inyecta el Paquete Básico (10k)

Scenario 2 — Deduplicación Histórica (Regla 3 / FC-1):
Given un odómetro de 21,400 km
And el último WO cerrado ejecutó exitosamente el Paquete 10k
When se calcula la cascada (10k + 20k)
Then purga el 10k e inyecta solo las exclusivas del 20k

Scenario 3 — Hard Stop Integral (Regla 4 / FC-4):
Given un vehículo sin `fleet_type`
When intenta iniciar el UPA
Then lanza Validation Error estricto

Scenario 4 — Diferido Permanente vs Temporal (Regla 5):
Given historial con `DEFERRED_FINANCIAL` y `N_A_STRUCTURAL`
When se evalúan históricos para Stage 4
Then solo retorna `DEFERRED_FINANCIAL`

TESTS REQUERIDOS
─────────────────
[ ] Unit : `upaEngine.test.ts` (100% branch coverage en `cascadeEngine`)
[ ] Unit : Pruebas de fronteras matemáticas (8499, 8500, 10000, 11500, 11501).

ARCHIVOS A TOCAR
─────────────────
Crear : `apps/api/src/services/upaEngine.ts`
Crear : `apps/api/src/services/upaEngine.test.ts`
Prohibido: Migraciones de DB o componentes de UI en este commit.

FIRMA DE GRAYMAN: [x] Aprobado por delegación EAL6+ Autónoma.
══════════════════════════════════════════════════════
