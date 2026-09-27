/**
 * FC199 F3 — Web Worker del reto anti-bot: resuelve la prueba de trabajo fuera del hilo de la UI.
 * Vite lo empaqueta como un archivo propio del sitio (mismo origen, `worker-src 'self'`).
 */
import { findSolution } from './botChallengeSolver';

interface SolveRequest {
  salt: string;
  challenge: string;
  maxnumber: number;
}

globalThis.onmessage = async (event: MessageEvent<SolveRequest>): Promise<void> => {
  const { salt, challenge, maxnumber } = event.data;
  globalThis.postMessage({ number: await findSolution(salt, challenge, maxnumber) });
};
