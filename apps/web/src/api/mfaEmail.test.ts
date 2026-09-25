import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import api from './client';
import { beginEmailMfaSetup, confirmEmailMfaSetup, resendEmailMfaCode } from './mfa';

/** FC195 F3 — cliente tipado de `/v1/auth/mfa/email/*`. */

vi.mock('./client', () => ({
  default: { post: vi.fn() },
}));

describe('api/mfa — 2FA por correo (FC195)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('beginEmailMfaSetup postea a /auth/mfa/email/setup con el setupToken explícito', async () => {
    (api.post as Mock).mockResolvedValue({
      data: { data: { emailSetupToken: 'est', maskedEmail: 'ar•••@piic.com.mx' } },
    });

    const result = await beginEmailMfaSetup('setup-1');

    expect(api.post).toHaveBeenCalledWith('/auth/mfa/email/setup', undefined, {
      headers: { Authorization: 'Bearer setup-1' },
    });
    expect(result).toEqual({ emailSetupToken: 'est', maskedEmail: 'ar•••@piic.com.mx' });
  });

  it('confirmEmailMfaSetup envía el token del reto y el código; responde los respaldos', async () => {
    (api.post as Mock).mockResolvedValue({ data: { data: { backupCodes: ['AAAAA-11111'] } } });

    const codes = await confirmEmailMfaSetup('est', 'ABCDEFGH');

    expect(api.post).toHaveBeenCalledWith(
      '/auth/mfa/email/verify-setup',
      { emailSetupToken: 'est', code: 'ABCDEFGH' },
      undefined
    );
    expect(codes).toEqual(['AAAAA-11111']);
  });

  it('resendEmailMfaCode manda el token del reto y regresa el token nuevo', async () => {
    const data = { token: 'new', maskedEmail: 'ar•••@piic.com.mx', codeSent: true, resendsLeft: 1 };
    (api.post as Mock).mockResolvedValue({ data: { data } });

    const result = await resendEmailMfaCode('old');

    expect(api.post).toHaveBeenCalledWith('/auth/mfa/email/resend', { token: 'old' });
    expect(result).toEqual(data);
  });
});
