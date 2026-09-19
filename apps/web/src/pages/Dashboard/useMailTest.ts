import { useCallback, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  describeMailTestRequestError,
  describeMailTestResult,
  type MailTestOutcome,
  type MailTestResponse,
} from './mailDiagnosticMessages';

/**
 * FC188 F2 — envío del correo de prueba de Ω. `POST /cosmology/mail/test` con cuerpo `{}`: el
 * destinatario NO viaja en la petición (el API usa el correo registrado de la propia cuenta, anti-
 * relay); `maskedEmail` solo se usa para el texto de confirmación. La petición nunca lanza: cualquier
 * resultado, incluido un error HTTP, vuelve como un `MailTestOutcome` listo para mostrar.
 */

async function requestMailTest(maskedEmail: string): Promise<MailTestOutcome> {
  try {
    const response = await api.post<MailTestResponse>('/cosmology/mail/test', {});
    return describeMailTestResult(response.data, maskedEmail);
  } catch (error) {
    return describeMailTestRequestError(error);
  }
}

export interface UseMailTest {
  sending: boolean;
  outcome: MailTestOutcome | null;
  sendTest: () => Promise<void>;
}

/** Estado de envío + último resultado. Guardia de sesión única (FC070/I10): un resultado que llega
 *  después de un login/logout se descarta. */
export default function useMailTest(maskedEmail: string): UseMailTest {
  const { getSessionEpoch } = useAuth();
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<MailTestOutcome | null>(null);

  const sendTest = useCallback(async (): Promise<void> => {
    const epochAtStart = getSessionEpoch();
    setSending(true);
    setOutcome(null);
    const result = await requestMailTest(maskedEmail);
    setSending(false);
    if (getSessionEpoch() !== epochAtStart) return; // stale — un login/logout aterrizó primero
    setOutcome(result);
  }, [getSessionEpoch, maskedEmail]);

  return { sending, outcome, sendTest };
}
