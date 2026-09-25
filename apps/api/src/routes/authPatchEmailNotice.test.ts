import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import * as UserManagementService from '../services/authUserManagement.service';
import { notifyPreviousAddress } from '../services/emailChange.service';

/**
 * FC196 F2 — PATCH /users/:id: si el correo cambió, la ruta avisa al buzón anterior DESPUÉS del
 * commit con el `MailTransport` del API. Un aviso que no sale nunca cambia la respuesta (200) ni
 * revierte el cambio (Invariante 4): queda como advertencia.
 */

vi.mock('../services/authUserManagement.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/authUserManagement.service')>()),
  updateUser: vi.fn(),
}));
vi.mock('../services/emailChange.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/emailChange.service')>()),
  notifyPreviousAddress: vi.fn(),
}));

const CHANGE = { previous: 'arc.viejo@piic.com.mx', next: 'arc.nuevo@piic.com.mx' };

describe('PATCH /v1/auth/users/:id — aviso de cambio de correo (FC196 F2)', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    token = jwt.sign({ id: 7, roleId: 0, permissions: ['*'], type: 'access' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const patch = (): Promise<LightMyRequestResponse> =>
    app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/30',
      headers: { Authorization: `Bearer ${token}` },
      payload: { data: { email: CHANGE.next }, reason: 'Cambio de correo' },
    });

  it('Scenario 5 — correo cambiado: avisa al buzón anterior con el transporte del API', async () => {
    (UserManagementService.updateUser as Mock).mockResolvedValue({ ok: true, emailChange: CHANGE });
    (notifyPreviousAddress as Mock).mockResolvedValue('sent');

    const res = await patch();

    expect(res.statusCode).toBe(200);
    expect(notifyPreviousAddress).toHaveBeenCalledWith(
      expect.objectContaining({ change: CHANGE, targetUserId: 30, adminId: 7 })
    );
    expect((notifyPreviousAddress as Mock).mock.calls[0][0].transport).toBe(app.mailTransport);
  });

  it.each([['failed'], ['disabled']])(
    'Invariante 4 — aviso %s: igual responde 200 (queda como advertencia)',
    async (status) => {
      (UserManagementService.updateUser as Mock).mockResolvedValue({
        ok: true,
        emailChange: CHANGE,
      });
      (notifyPreviousAddress as Mock).mockResolvedValue(status);
      const warn = vi.spyOn(app.log, 'warn');

      const res = await patch();

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });
      warn.mockRestore();
    }
  );

  it('sin cambio de correo: no hay aviso', async () => {
    (UserManagementService.updateUser as Mock).mockResolvedValue({ ok: true });

    const res = await patch();

    expect(res.statusCode).toBe(200);
    expect(notifyPreviousAddress).not.toHaveBeenCalled();
  });
});
