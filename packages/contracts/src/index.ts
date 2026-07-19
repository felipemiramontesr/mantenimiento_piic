import { z } from 'zod';

/**
 * FC 076 F4 — SSOT de schemas Zod compartidos entre apps/api y apps/web.
 * Opción B ACOTADA (convergencia Alfa v1.1, Cond.2 Bravo): SOLO las 3 rutas
 * cuyos contratos rompió y arregló este FC (R1/R4/R5) — no refactoriza el
 * 100% del backend. El schema vive en este único lugar; apps/api lo importa
 * 1:1 (Cond.1 Bravo, sin cambio semántico) y apps/web lo usa para validar,
 * en tests, que el payload real que construyen sus formularios pasa el
 * contrato real — no una copia que pueda desalinearse en silencio.
 */

/** PATCH /v1/auth/users/:id — auth.ts (R1: ArchonProfilePanel, R6: ProfileEditSlideOver) */
export const userUpdateSchema = z.object({
  data: z.object({
    fullName: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    roleId: z.number().int().optional(),
    profilePictureUrl: z.string().optional(),
    employeeNumber: z.string().optional(),
    departmentId: z.number().int().optional(),
    is_active: z.boolean().optional(),
  }),
  reason: z.string().min(5),
});

// FC 082 F0c — registerSchema eliminado: POST /v1/auth/register murió con las
// bandas de roles {1,3,4} (084_AN §1a); el alta renace en F3 (Contrato §C).

/** PUT /v1/routes/:uuid — fleetRoutes.ts (R5: handleCorrectActiveMission) */
export const routeUpdateSchema = z.object({
  data: z.record(z.any()),
  reason: z.string().min(5),
});
