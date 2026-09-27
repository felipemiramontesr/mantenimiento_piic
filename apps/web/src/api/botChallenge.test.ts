import { describe, it, expect, vi, afterEach } from 'vitest';
import api from './client';
import { isBotChallengeError, obtainBotChallengePayload } from './botChallenge';
import { webCryptoSha256 } from '../utils/botChallengeSolver';

/** FC199 F3 — pedir, resolver (worker o hilo principal) y entregar el `altcha_payload`. */

vi.mock('./client', () => ({ default: { get: vi.fn() } }));

async function givenChallenge(secret: number, maxnumber = 50): Promise<Record<string, unknown>> {
  const salt = 'sal?expires=9999999999&issued=1';
  const data = {
    algorithm: 'SHA-256',
    challenge: await webCryptoSha256(`${salt}${secret}`),
    maxnumber,
    salt,
    signature: 'f'.repeat(64),
  };
  (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data });
  return data;
}

interface FakeWorker {
  onmessage: ((e: { data: { number: number } }) => void) | null;
  onerror: ((e: { message: string }) => void) | null;
  postMessage: (message: unknown) => void;
  terminate: () => void;
}

/** Sustituye `Worker` por uno falso que, al recibir el reto, ejecuta `respond`. */
function stubWorker(respond: (worker: FakeWorker) => void): unknown[] {
  const posted: unknown[] = [];
  const worker: FakeWorker = {
    onmessage: null,
    onerror: null,
    postMessage: (message) => {
      posted.push(message);
      respond(worker);
    },
    terminate: () => undefined,
  };
  vi.stubGlobal(
    'Worker',
    // eslint-disable-next-line prefer-arrow-callback -- `new Worker()` exige una función construible
    vi.fn(function FakeWorkerConstructor() {
      return worker;
    })
  );
  return posted;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('obtainBotChallengePayload', () => {
  it('sin Worker (jsdom): resuelve en el hilo principal y codifica la solución', async () => {
    vi.stubGlobal('Worker', undefined);
    const data = await givenChallenge(23);

    const payload = await obtainBotChallengePayload();

    expect(api.get).toHaveBeenCalledWith('/public/bot-challenge');
    expect(JSON.parse(atob(payload))).toEqual({ ...data, maxnumber: undefined, number: 23 });
  });

  it('con Worker: delega la búsqueda y usa el número que responde', async () => {
    const posted = stubWorker((worker) => worker.onmessage?.({ data: { number: 41 } }));
    await givenChallenge(41);

    const payload = await obtainBotChallengePayload();

    expect(JSON.parse(atob(payload)).number).toBe(41);
    expect(posted[0]).toMatchObject({ maxnumber: 50 });
  });

  it('el worker falla: rechaza (el formulario muestra error, no se queda colgado)', async () => {
    stubWorker((worker) => worker.onerror?.({ message: 'boom' }));
    await givenChallenge(1);

    await expect(obtainBotChallengePayload()).rejects.toThrow('boom');
  });

  it('reto sin solución en el rango: rechaza', async () => {
    vi.stubGlobal('Worker', undefined);
    const salt = 'sal?expires=9999999999&issued=1';
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { algorithm: 'SHA-256', challenge: 'a'.repeat(64), maxnumber: 5, salt, signature: 'f' },
    });

    await expect(obtainBotChallengePayload()).rejects.toThrow('No se pudo resolver');
  });
});

describe('isBotChallengeError', () => {
  it.each([
    [{ response: { data: { error: 'BOT_CHALLENGE_REQUIRED' } } }, true],
    [{ response: { data: { code: 'BOT_CHALLENGE_FAILED' } } }, true],
    [{ response: { data: { error: 'L4' } } }, false],
    [new Error('red'), false],
  ])('%j → %s', (err, expected) => {
    expect(isBotChallengeError(err)).toBe(expected);
  });
});
