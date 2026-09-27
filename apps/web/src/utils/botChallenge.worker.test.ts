import { describe, it, expect, vi, afterEach } from 'vitest';
import { webCryptoSha256 } from './botChallengeSolver';

/** FC199 F3 — el worker recibe el reto, lo resuelve y responde `{ number }` por `postMessage`. */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('botChallenge.worker', () => {
  it('responde el número que resuelve el reto', async () => {
    const postMessage = vi.fn();
    vi.stubGlobal('postMessage', postMessage);
    await import('./botChallenge.worker');
    const salt = 'sal?expires=1&issued=1';
    const challenge = await webCryptoSha256(`${salt}12`);

    await (globalThis.onmessage as (e: MessageEvent) => Promise<void>)(
      new MessageEvent('message', { data: { salt, challenge, maxnumber: 50 } })
    );

    expect(postMessage).toHaveBeenCalledWith({ number: 12 });
  });
});
