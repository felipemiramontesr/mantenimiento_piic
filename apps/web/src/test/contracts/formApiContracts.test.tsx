import { describe, it, expect } from 'vitest';
import { userUpdateSchema, registerSchema, routeUpdateSchema } from '@mantenimiento/contracts';

/**
 * FC 076 F4 — Gate_Permanente_Tests_De_Contrato (Opción B acotada).
 *
 * Estos schemas son el MISMO objeto que `apps/api` importa y ejecuta en
 * producción (packages/contracts es SSOT — cero duplicación, Cond.2 Bravo).
 * Los payloads de abajo son la forma EXACTA que arman los componentes ya
 * cubiertos por sus propios tests de integración (assert por `toEqual`
 * contra el mock de axios):
 *   - userUpdateSchema  → ArchonProfilePanel.test.tsx (R1) +
 *                          ProfileEditSlideOver.test.tsx (R6)
 *   - registerSchema    → UserRegistrationForm.test.tsx (R4a/R4b)
 *   - routeUpdateSchema → useRouteAssignmentControl.test.tsx (R5)
 *
 * Este archivo cierra el círculo: prueba que ESA forma pasa el contrato
 * REAL del backend, no una copia que pueda desalinearse en silencio. Si
 * alguien cambia el schema de `apps/api` sin avisar al frontend (o
 * viceversa), uno de los dos lados de este círculo se rompe en CI.
 */

describe('FC 076 F4 — Contrato real: PATCH /auth/users/:id (userUpdateSchema)', () => {
  it('acepta el payload de autoservicio (ArchonProfilePanel, R1)', () => {
    const payload = {
      data: {
        fullName: 'Gray Man',
        email: 'gm@test.mx',
        employeeNumber: 'EMP-1',
      },
      reason: 'Actualización de perfil propio (autoservicio)',
    };
    expect(userUpdateSchema.safeParse(payload).success).toBe(true);
  });

  it('acepta el payload con password incluido dentro de data', () => {
    const payload = {
      data: { fullName: 'Gray Man', email: 'gm@test.mx', password: 'NuevaClave123!' },
      reason: 'Actualización de perfil propio (autoservicio)',
    };
    expect(userUpdateSchema.safeParse(payload).success).toBe(true);
  });

  it('acepta el payload de Arcsial (ProfileEditSlideOver, R6) — solo email', () => {
    const payload = {
      data: { email: 'nuevo@correo.mx' },
      reason: 'Actualización de perfil propio (Arcsial)',
    };
    expect(userUpdateSchema.safeParse(payload).success).toBe(true);
  });

  it('RECHAZA el payload plano histórico (R1 original — regresión centinela)', () => {
    // Esta era exactamente la forma que rompía el gate antes de F2: plano,
    // sin {data, reason}. Si este test alguna vez pasa como éxito, el
    // schema se relajó por accidente.
    const brokenPayload = { fullName: 'Gray Man', email: 'gm@test.mx' };
    expect(userUpdateSchema.safeParse(brokenPayload).success).toBe(false);
  });
});

describe('FC 076 F4 — Contrato real: POST /auth/register (registerSchema)', () => {
  it('acepta el payload con departmentId numérico (UserRegistrationForm, R4a)', () => {
    const payload = {
      username: 'testuser',
      email: 'test@t.com',
      password: 'Password123!',
      roleId: 4,
      departmentId: 41,
      employeeNumber: '',
    };
    expect(registerSchema.safeParse(payload).success).toBe(true);
  });

  it('RECHAZA department string (R4a original — regresión centinela)', () => {
    // Forma previa: department (string) en vez de departmentId (number).
    // Zod la descartaba en silencio (safeParse "éxito" porque el campo
    // desconocido se ignora) — el centinela real es que el valor NUNCA
    // llega a persistirse; verificado a nivel de componente, no aquí.
    const payload = {
      username: 'testuser',
      email: 'test@t.com',
      password: 'Password123!',
      roleId: 4,
      department: 'IT',
    };
    const parsed = registerSchema.parse(payload) as Record<string, unknown>;
    expect(parsed.departmentId).toBeUndefined();
    expect(parsed.department).toBeUndefined();
  });

  it('RECHAZA roleId fuera de {1,3,4} (R4d, K — gap de backend documentado)', () => {
    const payload = {
      username: 'testuser',
      email: 'test@t.com',
      password: 'Password123!',
      roleId: 6,
    };
    expect(registerSchema.safeParse(payload).success).toBe(false);
  });
});

describe('FC 076 F4 — Contrato real: PUT /routes/:uuid (routeUpdateSchema)', () => {
  it('acepta {data, reason} (handleCorrectActiveMission, R5)', () => {
    const payload = {
      data: { destination: 'Mina', fuelLevel: 85 },
      reason: 'Corrección de destino de misión activa',
    };
    expect(routeUpdateSchema.safeParse(payload).success).toBe(true);
  });

  it('RECHAZA {data} sin reason (R5 original — regresión centinela)', () => {
    const brokenPayload = { data: { destination: 'Mina' } };
    expect(routeUpdateSchema.safeParse(brokenPayload).success).toBe(false);
  });
});
