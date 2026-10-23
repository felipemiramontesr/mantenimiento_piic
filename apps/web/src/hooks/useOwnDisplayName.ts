import { useEffect, useState } from 'react';
import { fetchOwnActorCard } from '../pages/Social/arcsialCoreApi';

/** FC212 F2 (T3) — lo que muestra la cabecera del menú mientras carga o si la lectura falla. */
export const DISPLAY_NAME_FALLBACK = 'Archonauta';

/**
 * FC212 F2 (QA-3, D21, DEBT-PRIV-001) — nombre visible del actor USER de Arcsial de la sesión, leído
 * de `GET /v1/social/actors/me`. Nunca el usuario de acceso ni el correo: sin sesión, cargando, sin
 * actor o con error, responde `Archonauta`. Se vuelve a leer cuando cambia la sesión.
 */
export default function useOwnDisplayName(sessionUserId: string | undefined): string {
  const [displayName, setDisplayName] = useState<string | null>(null);
  useEffect(() => {
    setDisplayName(null);
    if (sessionUserId === undefined) return undefined;
    let active = true;
    fetchOwnActorCard()
      .then((card) => {
        if (active) setDisplayName(card.displayName.trim() || null);
      })
      .catch(() => undefined);
    return (): void => {
      active = false;
    };
  }, [sessionUserId]);
  return displayName ?? DISPLAY_NAME_FALLBACK;
}
