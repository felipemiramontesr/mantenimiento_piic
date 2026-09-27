import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as ThrottleRepository from './authThrottle.repository';
import {
  LOGIN_WINDOW_SECONDS,
  checkLoginThrottle,
  consumeMailQuota,
  loginDelaySeconds,
  recordLoginOutcome,
  throttleKey,
} from './authThrottle.service';

/**
 * FC199 F2 — freno progresivo del login (par usuario|IP) y cuota de correos por destinatario, con el
 * repositorio mockeado en el límite del módulo (el SQL se prueba en authThrottle.repository.test.ts).
 */

vi.mock('./authThrottle.repository', () => ({
  hitCounter: vi.fn(),
  readCounter: vi.fn(),
  clearCounter: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('throttleKey', () => {
  it('HMAC-SHA256 en hex: 64 caracteres, determinista y sin el identificador en claro', () => {
    const key = throttleKey('mail', 'omega@piic.com.mx');

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(throttleKey('mail', 'omega@piic.com.mx')).toBe(key);
    expect(key).not.toContain('omega');
  });

  it('el ámbito separa llaves: el mismo identificador en otro ámbito da otra llave', () => {
    expect(throttleKey('mail', 'x')).not.toBe(throttleKey('login-pair', 'x'));
  });
});

describe('loginDelaySeconds — progresión acotada (Cond.R-199 P3)', () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [6, 2],
    [7, 4],
    [10, 32],
    [11, 60],
    [50, 60],
  ])('%i fallos → %i s', (failures, seconds) => {
    expect(loginDelaySeconds(failures)).toBe(seconds);
  });
});

describe('checkLoginThrottle', () => {
  it('sin contador: permite', async () => {
    (ThrottleRepository.readCounter as Mock).mockResolvedValue(null);

    expect(await checkLoginThrottle('grayman', '203.0.113.1')).toEqual({ allowed: true });
    expect(ThrottleRepository.readCounter).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]{64}$/),
      LOGIN_WINDOW_SECONDS
    );
  });

  it('por debajo del umbral: permite aunque el último intento fue hace 0 s', async () => {
    (ThrottleRepository.readCounter as Mock).mockResolvedValue({
      counter: 4,
      secondsSinceLast: 0,
    });

    expect(await checkLoginThrottle('grayman', '203.0.113.1')).toEqual({ allowed: true });
  });

  it('7 fallos y hace 1 s: espera 3 s más (4 − 1) con 429', async () => {
    (ThrottleRepository.readCounter as Mock).mockResolvedValue({
      counter: 7,
      secondsSinceLast: 1,
    });

    expect(await checkLoginThrottle('grayman', '203.0.113.1')).toEqual({
      allowed: false,
      retryAfterSeconds: 3,
    });
  });

  it('ya esperó lo exigido: permite (nunca es un bloqueo permanente)', async () => {
    (ThrottleRepository.readCounter as Mock).mockResolvedValue({
      counter: 30,
      secondsSinceLast: 60,
    });

    expect(await checkLoginThrottle('grayman', '203.0.113.1')).toEqual({ allowed: true });
  });

  it('la llave es el par usuario|IP: otra IP del mismo usuario usa otra llave (Ω no queda fuera)', async () => {
    (ThrottleRepository.readCounter as Mock).mockResolvedValue(null);

    await checkLoginThrottle('grayman', '203.0.113.1');
    await checkLoginThrottle('grayman', '198.51.100.7');

    const [first, second] = (ThrottleRepository.readCounter as Mock).mock.calls.map((c) => c[0]);
    expect(first).not.toBe(second);
  });
});

describe('recordLoginOutcome', () => {
  it('fallo de credenciales: suma al par en la ventana de login', async () => {
    await recordLoginOutcome('GrayMan ', '203.0.113.1', true);

    expect(ThrottleRepository.hitCounter).toHaveBeenCalledWith(
      throttleKey('login-pair', 'grayman|203.0.113.1'),
      LOGIN_WINDOW_SECONDS
    );
    expect(ThrottleRepository.clearCounter).not.toHaveBeenCalled();
  });

  it('acierto: limpia el par (mayúsculas y espacios del usuario no crean otra llave)', async () => {
    await recordLoginOutcome('grayman', '203.0.113.1', false);

    expect(ThrottleRepository.clearCounter).toHaveBeenCalledWith(
      throttleKey('login-pair', 'grayman|203.0.113.1')
    );
    expect(ThrottleRepository.hitCounter).not.toHaveBeenCalled();
  });
});

describe('consumeMailQuota — 5 correos por destinatario en 24 h', () => {
  it.each([
    [1, true],
    [5, true],
    [6, false],
  ])('envío número %i → cabe: %s', async (sent, fits) => {
    (ThrottleRepository.hitCounter as Mock).mockResolvedValue(sent);

    expect(await consumeMailQuota('Arc.User@Piic.com.mx')).toBe(fits);
    expect(ThrottleRepository.hitCounter).toHaveBeenCalledWith(
      throttleKey('mail', 'arc.user@piic.com.mx'),
      24 * 60 * 60
    );
  });
});
