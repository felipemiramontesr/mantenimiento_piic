import { useCallback, useEffect, useRef } from 'react';
import { obtainBotChallengePayload } from '../../api/botChallenge';

/**
 * FC199 F3 — reto anti-bot resuelto en SEGUNDO PLANO desde que se abre el formulario: cuando la
 * persona envía, la prueba de trabajo ya está hecha. Cada payload sirve UNA vez (la API lo consume),
 * así que `take()` entrega el actual y deja resolviendo el siguiente. El reto vence a los 5 min; si
 * el que hay tiene más de 4, `take()` pide uno nuevo.
 */

const REFRESH_AFTER_MS = 4 * 60 * 1000;

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

/** Reto listo para el próximo envío: `take()` entrega un payload de un solo uso y prepara otro. */
export default function useBotChallenge(): { take: () => Promise<string> } {
  const pending = useRef<PendingChallenge | null>(null);

  useEffect(() => {
    pending.current = startChallenge();
  }, []);

  const take = useCallback(async (): Promise<string> => {
    const { current } = pending;
    const usable = current && Date.now() - current.startedAt < REFRESH_AFTER_MS;
    const chosen = usable ? current : startChallenge();
    pending.current = startChallenge();
    try {
      return await chosen.payload;
    } catch {
      return (await startChallenge().payload) as string;
    }
  }, []);

  return { take };
}
