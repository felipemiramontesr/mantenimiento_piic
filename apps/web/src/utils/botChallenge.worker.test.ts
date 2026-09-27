import { describe, it, expect, vi, afterEach } from 'vitest';
import { webCryptoSha256 } from './botChallengeSolver';

/** FC199 F3 — el worker recibe el reto, lo resuelve y responde `{ number }` por `postMessage`;
 *  ignora mensajes de otro origen o sin la forma de un reto (Sonar S2819). */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

type Handler = (e: MessageEvent) => Promise<void>;

async function loadWorker(): Promise<{ handler: Handler; postMessage: ReturnType<typeof vi.fn> }> {
  const postMessage = vi.fn();
  vi.stubGlobal('postMessage', postMessage);
  await import('./botChallenge.worker');
  return { handler: globalThis.onmessage as Handler, postMessage };
}

const OWN = globalThis.location.origin;

describe('botChallenge.worker', () => {
  it('responde el número que resuelve el reto', async () => {
    const { handler, postMessage } = await loadWorker();
    const salt = 'sal?expires=1&issued=1';
    const challenge = await webCryptoSha256(`${salt}12`);

    await handler(new MessageEvent('message', { data: { salt, challenge, maxnumber: 50 } }));

    expect(postMessage).toHaveBeenCalledWith({ number: 12 });
  });

  it.each([
    [
      'otro origen',
      { origin: 'https://evil.example', data: { salt: 's', challenge: 'c', maxnumber: 5 } },
    ],
    ['sin forma de reto', { origin: '', data: { salt: 's' } }],
    ['datos nulos', { origin: OWN, data: null }],
  ])('ignora el mensaje: %s', async (_label, init) => {
    const { handler, postMessage } = await loadWorker();

    await handler(new MessageEvent('message', init));

    expect(postMessage).not.toHaveBeenCalled();
  });
});
