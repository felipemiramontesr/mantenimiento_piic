import { useEffect, useRef, useCallback } from 'react';

/** FC184 F1 — canal `BroadcastChannel` compartido por todas las pestañas del mismo origen. Solo
 *  viaja la INTENCIÓN (`LOGIN`/`LOGOUT`, Cond.R-184 R1) — nunca el token de acceso, que permanece
 *  confinado a la memoria de cada pestaña (`tokenStore.ts`). */
export const SESSION_CHANNEL_NAME = 'archon_session';

export type SessionBroadcastEventType = 'LOGIN' | 'LOGOUT';

interface SessionBroadcastMessage {
  readonly type: SessionBroadcastEventType;
}

function createChannel(): BroadcastChannel | null {
  // Degradación elegante (scope FC184 F1): entornos sin BroadcastChannel (SSR, navegadores muy
  // antiguos, algunos runtimes de test) simplemente no sincronizan entre pestañas — no rompen.
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(SESSION_CHANNEL_NAME);
}

/** Suscribe `onMessage` a eventos de OTRAS pestañas y devuelve `broadcast`, una función estable
 *  (misma identidad entre renders) para emitir un evento propio. `BroadcastChannel` nunca entrega
 *  al remitente su propio mensaje (comportamiento nativo de la API) — no hace falta filtrarlo. */
export default function useSessionBroadcast(
  onMessage: (type: SessionBroadcastEventType) => void
): (type: SessionBroadcastEventType) => void {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const channel = createChannel();
    channelRef.current = channel;
    if (!channel) return undefined;

    const handleMessage = (event: MessageEvent<SessionBroadcastMessage>): void => {
      onMessageRef.current(event.data.type);
    };
    channel.addEventListener('message', handleMessage);

    return (): void => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  return useCallback((type: SessionBroadcastEventType): void => {
    channelRef.current?.postMessage({ type } satisfies SessionBroadcastMessage);
  }, []);
}
