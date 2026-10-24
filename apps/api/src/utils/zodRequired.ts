/**
 * FC220 F1 — zod 4 retiró `required_error`. Este ayudante conserva su semántica exacta: el mensaje
 * propio solo cuando el campo falta (`input === undefined`); cualquier otro error (tipo, rango,
 * enum) devuelve `undefined` y zod usa su mensaje por omisión, como hacía zod 3.
 */
export default function requiredMessage(message: string): {
  error: (issue: { readonly input?: unknown }) => string | undefined;
} {
  return { error: (issue) => (issue.input === undefined ? message : undefined) };
}
