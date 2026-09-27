import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { createHash } from 'node:crypto';
import consumeNonce from './botChallenge.repository';
import { botChallengeVerifier, BotChallenge, CHALLENGE_TTL_SECONDS } from './botChallenge.service';

/**
 * FC199 F3 — motor PoW propio (formato ALTCHA). Se resuelven retos REALES con dificultad baja por
 * entorno; el registro de un solo uso va mockeado (su SQL: botChallenge.repository.test.ts).
 */

vi.mock('./botChallenge.repository', () => ({ default: vi.fn() }));

/** Resuelve el reto como lo hace el navegador: prueba números hasta dar con el hash. */
function solve(challenge: BotChallenge): number {
  for (let n = 0; n <= challenge.maxnumber; n += 1) {
    const hash = createHash('sha256').update(`${challenge.salt}${n}`).digest('hex');
    if (hash === challenge.challenge) return n;
  }
  throw new Error('sin solución');
}

function encode(solution: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(solution)).toString('base64');
}

function solvedPayload(challenge: BotChallenge, overrides: Record<string, unknown> = {}): string {
  return encode({
    algorithm: challenge.algorithm,
    challenge: challenge.challenge,
    number: solve(challenge),
    salt: challenge.salt,
    signature: challenge.signature,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BOT_CHALLENGE_MAX_NUMBER = '50';
  (consumeNonce as Mock).mockResolvedValue(true);
});

afterEach(() => {
  delete process.env.BOT_CHALLENGE_MAX_NUMBER;
  vi.useRealTimers();
});

describe('issue', () => {
  it('reto con forma ALTCHA: SHA-256, hashes hex de 64 y sal con emisión y caducidad a 5 min', () => {
    const challenge = botChallengeVerifier.issue();

    expect(challenge).toMatchObject({ algorithm: 'SHA-256', maxnumber: 50 });
    expect(challenge.challenge).toMatch(/^[0-9a-f]{64}$/);
    expect(challenge.signature).toMatch(/^[0-9a-f]{64}$/);
    const params = new URLSearchParams(challenge.salt.split('?')[1]);
    const issued = Number(params.get('issued'));
    expect(Number(params.get('expires'))).toBe(Math.floor(issued / 1000) + CHALLENGE_TTL_SECONDS);
  });

  it('sin dificultad por entorno usa 20 000', () => {
    delete process.env.BOT_CHALLENGE_MAX_NUMBER;

    expect(botChallengeVerifier.issue().maxnumber).toBe(20_000);
  });
});

describe('verify', () => {
  it('solución correcta: válida y consume el reto UNA vez (anti-replay en MySQL)', async () => {
    const challenge = botChallengeVerifier.issue();

    expect(await botChallengeVerifier.verify(solvedPayload(challenge))).toBe(true);
    const expires = Number(new URLSearchParams(challenge.salt.split('?')[1]).get('expires'));
    expect(consumeNonce).toHaveBeenCalledWith(challenge.challenge, expires);
  });

  it('reto ya usado (replay): inválido', async () => {
    (consumeNonce as Mock).mockResolvedValue(false);

    expect(await botChallengeVerifier.verify(solvedPayload(botChallengeVerifier.issue()))).toBe(
      false
    );
  });

  it.each([
    ['número equivocado', (c: BotChallenge): Record<string, unknown> => ({ number: solve(c) + 1 })],
    ['firma falsa', (): Record<string, unknown> => ({ signature: 'f'.repeat(64) })],
    [
      'sal alterada (caducidad extendida)',
      (c: BotChallenge): Record<string, unknown> => ({ salt: `${c.salt}9` }),
    ],
    ['reto de otro servidor', (): Record<string, unknown> => ({ challenge: 'a'.repeat(64) })],
  ])('%s: inválido y sin tocar la DB', async (_label, override) => {
    const challenge = botChallengeVerifier.issue();

    expect(await botChallengeVerifier.verify(solvedPayload(challenge, override(challenge)))).toBe(
      false
    );
    expect(consumeNonce).not.toHaveBeenCalled();
  });

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['no es base64/JSON', '%%%'],
    ['JSON sin la forma', encode({ algorithm: 'MD5' })],
  ])('payload %s: inválido (fail-closed)', async (_label, payload) => {
    expect(await botChallengeVerifier.verify(payload)).toBe(false);
    expect(consumeNonce).not.toHaveBeenCalled();
  });

  it('vencido (más de 5 min): inválido', async () => {
    vi.useFakeTimers();
    const challenge = botChallengeVerifier.issue();
    const payload = solvedPayload(challenge);
    vi.advanceTimersByTime((CHALLENGE_TTL_SECONDS + 1) * 1000);

    expect(await botChallengeVerifier.verify(payload)).toBe(false);
  });

  it('piso de tiempo: antes de minAgeMs es inválido; después, válido', async () => {
    vi.useFakeTimers();
    const challenge = botChallengeVerifier.issue();
    const payload = solvedPayload(challenge);

    expect(await botChallengeVerifier.verify(payload, { minAgeMs: 1500 })).toBe(false);
    vi.advanceTimersByTime(1500);
    expect(await botChallengeVerifier.verify(payload, { minAgeMs: 1500 })).toBe(true);
  });
});
