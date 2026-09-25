import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as UserManagementService from '../services/authUserManagement.service';

/**
 * FC196 F1 — un token vencido, malformado o ausente en `GET /me` y `GET /users/:uuid/node` responde
 * 401 (manejador global de `@fastify/jwt`), nunca 500, y el servicio no se llama (Scenario 1). Un
 * fallo real del servicio con token válido sigue siendo 500 (Scenario 2). Tabla de verdad 1 del FC.
 */

vi.mock('../services/authSession.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/authSession.service')>()),
  getMe: vi.fn(),
}));
vi.mock('../services/authUserManagement.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/authUserManagement.service')>()),
  getUserNode: vi.fn(),
  resolveOwnerScope: vi.fn(),
}));

type Jwt = { sign: (_p: object, _o?: object) => string };

const ROUTES = [
  { label: 'GET /me', url: '/v1/auth/me', service: (): Mock => SessionService.getMe as Mock },
  {
    label: 'GET /users/:uuid/node',
    url: '/v1/auth/users/uuid-1/node',
    service: (): Mock => UserManagementService.getUserNode as Mock,
  },
];

describe('FC196 F1 — token inválido ⇒ 401, nunca 500', () => {
  const app = buildApp();
  let jwt: Jwt;
  let expiredToken: string;

  beforeAll(async () => {
    await app.ready();
    jwt = (app as unknown as { jwt: Jwt }).jwt;
    expiredToken = jwt.sign({ id: 1, permissions: ['*'], type: 'access' }, { expiresIn: '1ms' });
    await new Promise((r) => {
      setTimeout(r, 20);
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each(ROUTES)('$label', ({ url, service }) => {
    it.each([
      ['vencido', (): string => `Bearer ${expiredToken}`],
      ['malformado', (): string => 'Bearer not-a-jwt'],
      ['con firma ajena', (): string => `Bearer ${expiredToken.slice(0, -4)}abcd`],
    ])('token %s ⇒ 401 y el servicio no se llama', async (_label, header) => {
      const res = await app.inject({ method: 'GET', url, headers: { Authorization: header() } });

      expect(res.statusCode).toBe(401);
      expect(service()).not.toHaveBeenCalled();
    });

    it('sin token ⇒ 401', async () => {
      const res = await app.inject({ method: 'GET', url });

      expect(res.statusCode).toBe(401);
      expect(service()).not.toHaveBeenCalled();
    });

    it('token válido y fallo real del servicio ⇒ sigue siendo 500', async () => {
      service().mockRejectedValue(new Error('DB_DOWN'));
      (UserManagementService.resolveOwnerScope as Mock).mockResolvedValue(null);
      const token = jwt.sign({ id: 1, permissions: ['*'], type: 'access' });

      const res = await app.inject({
        method: 'GET',
        url,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(500);
      expect(service()).toHaveBeenCalled();
    });
  });
});
