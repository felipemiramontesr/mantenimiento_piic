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

/** ¿`data` tiene la forma exacta de un reto? */
function isSolveRequest(data: unknown): data is SolveRequest {
  const candidate = data as Partial<SolveRequest> | null;
  return (
    typeof candidate?.salt === 'string' &&
    typeof candidate.challenge === 'string' &&
    Number.isInteger(candidate.maxnumber)
  );
}

// Solo mensajes de su propia página (en un worker dedicado el `origin` llega vacío) y con la forma
// de un reto; cualquier otra cosa se ignora (Sonar S2819).
globalThis.onmessage = async (event: MessageEvent<unknown>): Promise<void> => {
  if (event.origin !== '' && event.origin !== globalThis.location.origin) return;
  if (!isSolveRequest(event.data)) return;
  const { salt, challenge, maxnumber } = event.data;
  globalThis.postMessage({ number: await findSolution(salt, challenge, maxnumber) });
};
