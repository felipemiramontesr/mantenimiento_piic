/** FC184 F2 — Signup_Client_Side_RFC_And_Postal_Validation. Patrones portados LITERALMENTE de
 *  `apps/api/src/routes/publicSignup.ts` (Cond.R-177 R3, ya auditados) para que el mensaje de
 *  error reactivo del formulario coincida exactamente con lo que el backend aceptará — el backend
 *  sigue siendo la autoridad final, esto es solo ergonomía (defense-in-depth, no un reemplazo). */
export const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-V1-9][A-Z\d]{2}$/;
export const POSTAL_CODE_REGEX = /^\d{5}$/;

/** `true` si `value` cumple el formato canónico de RFC SAT (persona física 13 / moral 12). */
export function isValidRfc(value: string): boolean {
  return RFC_REGEX.test(value);
}

/** `true` si `value` es un Código Postal fiscal válido (5 dígitos numéricos exactos). */
export function isValidPostalCode(value: string): boolean {
  return POSTAL_CODE_REGEX.test(value);
}
