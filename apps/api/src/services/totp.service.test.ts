import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  buildTotpUri,
  currentTotpStep,
  computeTotpCode,
  verifyTotpCode,
  generateBackupCodes,
  TOTP_STEP_SECONDS,
} from './totp.service';

/**
 * FC185 F1 — motor TOTP puro, sin colaboradores que mockear. Los casos de `computeTotpCode`
 * verifican contra los vectores de prueba publicados en RFC 6238 Apéndice B (secreto ASCII
 * '12345678901234567890', SHA1, X=30s) — el RFC publica códigos de 8 dígitos; como
 * `binCode mod 10^6` son exactamente los últimos 6 dígitos de `binCode mod 10^8` (10^6 divide a
 * 10^8), los últimos 6 dígitos de cada vector son el resultado esperado de nuestra truncación a 6.
 */

const RFC_SECRET_BASE32 = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

describe('FC185 F1 — base32Encode / base32Decode', () => {
  it('round-trips arbitrary bytes', () => {
    const original = Buffer.from([0, 1, 2, 253, 254, 255, 42, 17]);
    expect(base32Decode(base32Encode(original))).toEqual(original);
  });

  it('decode tolera minúsculas y separadores', () => {
    const encoded = base32Encode(Buffer.from('archon', 'ascii'));
    const messy = `${encoded.slice(0, 3).toLowerCase()}-${encoded.slice(3)}`;
    expect(base32Decode(messy)).toEqual(base32Decode(encoded));
  });
});

describe('FC185 F1 — generateTotpSecret / buildTotpUri', () => {
  it('genera un secreto Base32 de 160 bits (32 caracteres, sin padding)', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('dos secretos generados nunca coinciden (aleatoriedad real, no un stub)', () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });

  it('construye la URI otpauth:// canónica con issuer/algorithm/digits/period', () => {
    const uri = buildTotpUri('JBSWY3DPEHPK3PXP', 'grayman@piic.com.mx');
    expect(uri).toBe(
      'otpauth://totp/Archon%3Agrayman%40piic.com.mx?secret=JBSWY3DPEHPK3PXP&issuer=Archon&algorithm=SHA1&digits=6&period=30'
    );
  });
});

describe('FC185 F1 — computeTotpCode (vectores RFC 6238 Apéndice B, SHA1)', () => {
  it.each([
    [59, '287082'], // T=1, RFC 8-digit: 94287082
    [1111111109, '081804'], // T=37037036, RFC 8-digit: 07081804
    [1111111111, '050471'], // T=37037037, RFC 8-digit: 14050471
    [1234567890, '005924'], // T=41152263, RFC 8-digit: 89005924
    [2000000000, '279037'], // T=66666666, RFC 8-digit: 69279037
  ])('T=%i segundos produce los últimos 6 dígitos del vector RFC (%s)', (unixSeconds, expected) => {
    const step = currentTotpStep(unixSeconds * 1000);
    expect(computeTotpCode(RFC_SECRET_BASE32, step)).toBe(expected);
  });
});

describe('FC185 F1 — currentTotpStep', () => {
  it('trunca al paso de 30s (floor), no redondea', () => {
    expect(currentTotpStep(0)).toBe(0);
    expect(currentTotpStep((TOTP_STEP_SECONDS - 1) * 1000)).toBe(0);
    expect(currentTotpStep(TOTP_STEP_SECONDS * 1000)).toBe(1);
  });
});

describe('FC185 F1 — verifyTotpCode (ventana de deriva ±1 paso, 90s)', () => {
  const secret = generateTotpSecret();
  const nowMs = 1_700_000_000_000;
  const nowStep = currentTotpStep(nowMs);

  it('Scenario 2 — acepta el código del paso actual', () => {
    const code = computeTotpCode(secret, nowStep);
    expect(verifyTotpCode(secret, code, { nowMs })).toEqual({ valid: true, matchedStep: nowStep });
  });

  it('acepta el código del paso anterior (deriva de reloj -30s)', () => {
    const code = computeTotpCode(secret, nowStep - 1);
    expect(verifyTotpCode(secret, code, { nowMs })).toEqual({
      valid: true,
      matchedStep: nowStep - 1,
    });
  });

  it('acepta el código del paso siguiente (deriva de reloj +30s)', () => {
    const code = computeTotpCode(secret, nowStep + 1);
    expect(verifyTotpCode(secret, code, { nowMs })).toEqual({
      valid: true,
      matchedStep: nowStep + 1,
    });
  });

  it('rechaza un código 2 pasos fuera de la ventana (60s de deriva)', () => {
    const code = computeTotpCode(secret, nowStep + 2);
    expect(verifyTotpCode(secret, code, { nowMs })).toEqual({ valid: false, matchedStep: null });
  });

  it('rechaza un código que no son 6 dígitos', () => {
    expect(verifyTotpCode(secret, '12a456', { nowMs })).toEqual({
      valid: false,
      matchedStep: null,
    });
    expect(verifyTotpCode(secret, '12345', { nowMs })).toEqual({ valid: false, matchedStep: null });
  });

  it('R6 (340_AN, anti-replay) — rechaza reusar el código de un step ya consumido', () => {
    const code = computeTotpCode(secret, nowStep);
    expect(verifyTotpCode(secret, code, { nowMs, lastUsedStep: nowStep })).toEqual({
      valid: false,
      matchedStep: null,
    });
  });

  it('R6 — un lastUsedStep anterior no bloquea un código de un step posterior válido', () => {
    const code = computeTotpCode(secret, nowStep);
    expect(verifyTotpCode(secret, code, { nowMs, lastUsedStep: nowStep - 5 })).toEqual({
      valid: true,
      matchedStep: nowStep,
    });
  });
});

describe('FC185 F1 — generateBackupCodes (invariante 3: single-use, 8 códigos)', () => {
  it('genera 8 códigos únicos con formato XXXXX-XXXXX sin caracteres ambiguos', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    codes.forEach((code) => {
      expect(code).toMatch(
        /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/
      );
    });
  });

  it('respeta un count explícito', () => {
    expect(generateBackupCodes(3)).toHaveLength(3);
  });
});
