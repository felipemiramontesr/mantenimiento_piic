import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import api from './client';
import { beginMfaSetup, confirmMfaSetup, verifyMfaChallenge } from './mfa';

/** FC185 F3 — cliente tipado de `/v1/auth/mfa/setup` + `/confirm`. */

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('api/mfa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('beginMfaSetup postea a /auth/mfa/setup sin token explícito (sesión real vía interceptor)', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { success: true, data: { secretBase32: 'SECRET', otpauthUri: 'otpauth://totp/x' } },
    });

    const result = await beginMfaSetup();

    expect(api.post).toHaveBeenCalledWith('/auth/mfa/setup', undefined, undefined);
    expect(result).toEqual({ secretBase32: 'SECRET', otpauthUri: 'otpauth://totp/x' });
  });

  it('beginMfaSetup adjunta el Authorization explícito cuando se pasa un setupToken', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { success: true, data: { secretBase32: 'SECRET', otpauthUri: 'otpauth://totp/x' } },
    });

    await beginMfaSetup('setup-token-123');

    expect(api.post).toHaveBeenCalledWith('/auth/mfa/setup', undefined, {
      headers: { Authorization: 'Bearer setup-token-123' },
    });
  });

  it('confirmMfaSetup postea el código y regresa los backupCodes desenvueltos', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { success: true, data: { backupCodes: ['AAAAA-11111', 'BBBBB-22222'] } },
    });

    const result = await confirmMfaSetup('123456');

    expect(api.post).toHaveBeenCalledWith('/auth/mfa/confirm', { code: '123456' }, undefined);
    expect(result).toEqual(['AAAAA-11111', 'BBBBB-22222']);
  });

  it('confirmMfaSetup adjunta el Authorization explícito cuando se pasa un setupToken', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { success: true, data: { backupCodes: [] } },
    });

    await confirmMfaSetup('123456', 'setup-token-123');

    expect(api.post).toHaveBeenCalledWith(
      '/auth/mfa/confirm',
      { code: '123456' },
      { headers: { Authorization: 'Bearer setup-token-123' } }
    );
  });

  it('verifyMfaChallenge postea mfaToken+code y regresa la respuesta cruda (misma forma que /login)', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { success: true, token: 'session-token', user: { id: 501, username: 'archie' } },
    });

    const result = await verifyMfaChallenge('mfa-token-1', '123456');

    expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify', {
      mfaToken: 'mfa-token-1',
      code: '123456',
    });
    expect(result).toEqual({
      success: true,
      token: 'session-token',
      user: { id: 501, username: 'archie' },
    });
  });
});
