import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as ThrottleRepository from './authThrottle.repository';
import { botChallengeVerifier } from './botChallenge.service';
import {
  LOGIN_WINDOW_SECONDS,
  checkLoginThrottle,
  evaluateLoginChallenge,
  isLoginChallengeRequired,
  loginAccountRef,
  consumeMailQuota,
  loginDelaySeconds,
  recordLoginOutcome,
  throttleKey,
} from './authThrottle.service';

/**
 * FC199 F2 — freno progresivo del login (par usuario|IP) y cuota de correos por destinatario, con el
 * repositorio mockeado en el límite del módulo (el SQL se prueba en authThrottle.repository.test.ts).
 */

vi.mock('./botChallenge.service', () => ({ botChallengeVerifier: { verify: vi.fn() } }));
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

  it('sin JWT_SECRET (solo dev): usa la llave de desarrollo, distinta de la de producción', () => {
    const withSecret = throttleKey('mail', 'x');
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const devKey = throttleKey('mail', 'x');
      expect(devKey).toMatch(/^[0-9a-f]{64}$/);
      expect(devKey).not.toBe(withSecret);
    } finally {
      process.env.JWT_SECRET = saved;
    }
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

const ATTEMPT = { username: 'GrayMan ', ip: '203.0.113.1', accountRef: 'id:1' };

describe('recordLoginOutcome', () => {
  it('fallo: suma al par, a la CUENTA y a la IP', async () => {
    await recordLoginOutcome(ATTEMPT, 'failed');

    const keys = (ThrottleRepository.hitCounter as Mock).mock.calls.map((c) => c[0]);
    expect(keys).toEqual([
      throttleKey('login-pair', 'grayman|203.0.113.1'),
      throttleKey('login-account', 'id:1'),
      throttleKey('login-ip', '203.0.113.1'),
    ]);
    expect(ThrottleRepository.clearCounter).not.toHaveBeenCalled();
  });

  it('acierto: limpia el par y la cuenta, pero NO la IP (un barrido no se borra con una cuenta válida)', async () => {
    await recordLoginOutcome(ATTEMPT, 'passed');

    const keys = (ThrottleRepository.clearCounter as Mock).mock.calls.map((c) => c[0]);
    expect(keys).toEqual([
      throttleKey('login-pair', 'grayman|203.0.113.1'),
      throttleKey('login-account', 'id:1'),
    ]);
    expect(ThrottleRepository.hitCounter).not.toHaveBeenCalled();
  });

  it('sin evaluar (lo cortó el reto): no suma ni limpia nada', async () => {
    await recordLoginOutcome(ATTEMPT, 'untested');

    expect(ThrottleRepository.hitCounter).not.toHaveBeenCalled();
    expect(ThrottleRepository.clearCounter).not.toHaveBeenCalled();
  });
});

describe('loginAccountRef — una sola llave por cuenta (424_AN)', () => {
  it('cuenta existente: su id, sin importar si entró con usuario o correo', () => {
    expect(loginAccountRef(1, 'grayman')).toBe('id:1');
    expect(loginAccountRef(1, 'omega@piic.com.mx')).toBe('id:1');
  });

  it('cuenta inexistente: el identificador normalizado', () => {
    expect(loginAccountRef(null, ' Fantasma ')).toBe('name:fantasma');
  });
});

describe('isLoginChallengeRequired / evaluateLoginChallenge (FAIL_GE3)', () => {
  it('sin contadores en la ventana (cuenta ni IP): no exige reto', async () => {
    (ThrottleRepository.readCounter as Mock).mockResolvedValue(null);
    expect(await isLoginChallengeRequired('id:1', '203.0.113.1')).toBe(false);
  });

  /** Contadores por llave: cuenta `id:1` e IP `203.0.113.1`. */
  function givenFailures(account: number, byIp: number): void {
    (ThrottleRepository.readCounter as Mock).mockImplementation(async (key: string) => {
      if (key === throttleKey('login-account', 'id:1'))
        return { counter: account, secondsSinceLast: 0 };
      if (key === throttleKey('login-ip', '203.0.113.1'))
        return { counter: byIp, secondsSinceLast: 0 };
      return null;
    });
  }

  it.each([
    [0, 0, false],
    [2, 2, false],
    [3, 0, true],
    [0, 3, true],
  ])('cuenta %i fallos, IP %i fallos → reto exigido: %s', async (account, byIp, required) => {
    givenFailures(account, byIp);

    expect(await isLoginChallengeRequired('id:1', '203.0.113.1')).toBe(required);
  });

  it('sin sospecha: no pide reto aunque no haya payload', async () => {
    givenFailures(2, 0);

    expect(await evaluateLoginChallenge('id:1', '203.0.113.1', undefined)).toBeNull();
    expect(botChallengeVerifier.verify).not.toHaveBeenCalled();
  });

  it('con sospecha y sin payload: BOT_CHALLENGE_REQUIRED', async () => {
    givenFailures(3, 0);

    expect(await evaluateLoginChallenge('id:1', '203.0.113.1', undefined)).toBe(
      'BOT_CHALLENGE_REQUIRED'
    );
  });

  it('con sospecha y payload inválido o repetido: BOT_CHALLENGE_FAILED (fail-closed)', async () => {
    givenFailures(3, 0);
    (botChallengeVerifier.verify as Mock).mockResolvedValue(false);

    expect(await evaluateLoginChallenge('id:1', '203.0.113.1', 'x')).toBe('BOT_CHALLENGE_FAILED');
  });

  it('con sospecha y reto resuelto: sigue a la contraseña', async () => {
    givenFailures(3, 0);
    (botChallengeVerifier.verify as Mock).mockResolvedValue(true);

    expect(await evaluateLoginChallenge('id:1', '203.0.113.1', 'ok')).toBeNull();
    expect(botChallengeVerifier.verify).toHaveBeenCalledWith('ok');
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
