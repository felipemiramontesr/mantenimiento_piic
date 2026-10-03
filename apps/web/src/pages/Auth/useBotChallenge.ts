import { useCallback, useEffect, useRef } from 'react';
import { obtainBotChallengePayload } from '../../api/botChallenge';

/**
 * FC199 F3 — reto anti-bot resuelto en SEGUNDO PLANO desde que se abre el formulario: cuando la
 * persona envía, la prueba de trabajo ya está hecha. Cada payload sirve UNA vez (la API lo consume),
 * así que `take()` entrega el actual y deja resolviendo el siguiente. El reto vence a los 5 min.
 *
 * FC203 F2 (A3-DEF1 · Invariante 3) — antes, un formulario abierto más de 4 min tiraba el reto viejo
 * y enviaba uno recién emitido, que la API rechazaba por "demasiado rápido" (piso de 1500 ms,
 * `SIGNUP_MIN_FILL_MS`). Ahora: (1) el reto de fondo se renueva cada 3 min, así que siempre hay uno
 * vigente y con antigüedad de sobra; (2) si aun así toca enviar uno nuevo, `take()` espera a que
 * cumpla el piso (más un margen por la latencia) antes de entregarlo. El piso de la API no se baja.
 */

/** Renovación preventiva del reto de fondo: muy por debajo de los 5 min de vigencia. */
export const REFRESH_AFTER_MS = 3 * 60 * 1000;

/** Piso de la API (`SIGNUP_MIN_FILL_MS`) + 1 s de margen: la API mide desde que EMITE el reto. */
export const SUBMIT_FLOOR_MS = 1500 + 1000;

interface PendingChallenge {
  readonly payload: Promise<string>;
  readonly startedAt: number;
}

function startChallenge(): PendingChallenge {
  const payload = obtainBotChallengePayload();
  // Un fallo en segundo plano no debe romper la página: `take()` lo verá y pedirá otro.
  payload.catch(() => undefined);
  return { payload, startedAt: Date.now() };
}

/** Espera lo que le falte al reto para cumplir el piso de antigüedad (0 si ya lo cumple). */
function waitForFloor(startedAt: number): Promise<void> {
  const remaining = SUBMIT_FLOOR_MS - (Date.now() - startedAt);
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, remaining);
  });
}

/** Entrega el payload del reto y, si falla, el de uno nuevo; ambos con el piso cumplido. */
async function deliver(chosen: PendingChallenge): Promise<string> {
  try {
    const payload = await chosen.payload;
    await waitForFloor(chosen.startedAt);
    return payload;
  } catch {
    const retry = startChallenge();
    const payload = await retry.payload;
    await waitForFloor(retry.startedAt);
    return payload;
  }
}

/** Reto listo para el próximo envío: `take()` entrega un payload de un solo uso y prepara otro. */
export default function useBotChallenge(): { take: () => Promise<string> } {
  const pending = useRef<PendingChallenge | null>(null);

  useEffect(() => {
    pending.current = startChallenge();
    const refresh = setInterval(() => {
      pending.current = startChallenge();
    }, REFRESH_AFTER_MS);
    return (): void => clearInterval(refresh);
  }, []);

  const take = useCallback(async (): Promise<string> => {
    const { current } = pending;
    const usable = current && Date.now() - current.startedAt < REFRESH_AFTER_MS;
    const chosen = usable ? current : startChallenge();
    pending.current = startChallenge();
    return deliver(chosen);
  }, []);

  return { take };
}
