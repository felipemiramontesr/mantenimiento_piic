import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';

/**
 * FC195 F3 — piezas compartidas del 2FA por correo entre el enrolamiento (`MfaEmailEnrollment`) y
 * el reto de login (`useMfaChallenge`): formato del código, espera entre reenvíos y mensajes de
 * error. Los límites reales (TTL, intentos, reenvíos) los impone el backend; esto es UX.
 */

/** 8 caracteres del alfabeto de respaldo (sin 0/1/O/I), igual que el backend (D-Ω4). */
export const EMAIL_CODE_LENGTH = 8;
/** Espera mínima entre envíos que el backend exige (60 s). */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Lo que el usuario teclea o pega → solo caracteres válidos, en mayúsculas, máximo 8. */
export function normalizeEmailCodeInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^2-9A-HJ-NP-Z]/g, '')
    .slice(0, EMAIL_CODE_LENGTH);
}

/** El backend responde `message` en español; si no hay (red caída), el texto de respaldo. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const axiosError = err as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? fallback;
}

/** Cuenta regresiva de la espera entre reenvíos: arranca al enviar y baja a 0. */
export function useResendCooldown(): { secondsLeft: number; startCooldown: () => void } {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return (): void => clearTimeout(timer);
  }, [secondsLeft]);

  const startCooldown = useCallback((): void => setSecondsLeft(RESEND_COOLDOWN_SECONDS), []);
  return { secondsLeft, startCooldown };
}
