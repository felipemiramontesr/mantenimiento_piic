import { AxiosError } from 'axios';
import api from './client';
import { BotChallenge, encodeSolution, findSolution } from '../utils/botChallengeSolver';

/**
 * FC199 F3 — reto anti-bot de la API: pedirlo (`GET /public/bot-challenge`), resolverlo en un Web
 * Worker y entregar el `altcha_payload`. Si el navegador no tiene Worker, se resuelve en el hilo
 * principal (tarda lo mismo, solo que la UI comparte el hilo).
 */

/** Resuelve en un worker; si no hay `Worker` disponible, en el hilo principal. */
function solveNumber(challenge: BotChallenge): Promise<number | null> {
  if (typeof Worker === 'undefined') {
    return findSolution(challenge.salt, challenge.challenge, challenge.maxnumber);
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../utils/botChallenge.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<{ number: number | null }>): void => {
      worker.terminate();
      resolve(event.data.number);
    };
    worker.onerror = (event): void => {
      worker.terminate();
      reject(new Error(event.message || 'No se pudo resolver la verificación'));
    };
    worker.postMessage({
      salt: challenge.salt,
      challenge: challenge.challenge,
      maxnumber: challenge.maxnumber,
    });
  });
}

/** Pide un reto nuevo, lo resuelve y responde el `altcha_payload` de un solo uso. */
export async function obtainBotChallengePayload(): Promise<string> {
  const { data } = await api.get<BotChallenge>('/public/bot-challenge');
  const number = await solveNumber(data);
  if (number === null) throw new Error('No se pudo resolver la verificación');
  return encodeSolution(data, number);
}

/** ¿La API pidió el reto o lo rechazó? (400 `BOT_CHALLENGE_REQUIRED` / `BOT_CHALLENGE_FAILED`). */
export function isBotChallengeError(err: unknown): boolean {
  const data = (err as AxiosError<{ error?: string; code?: string }>).response?.data;
  const code = data?.error ?? data?.code;
  return code === 'BOT_CHALLENGE_REQUIRED' || code === 'BOT_CHALLENGE_FAILED';
}
