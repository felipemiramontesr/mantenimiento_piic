import { useState, useCallback } from 'react';

export interface FieldValidity {
  readonly valid: boolean;
  readonly touched: boolean;
  readonly markTouched: () => void;
}

/** FC184 F2 — validez reactiva de un campo controlado + bandera "touched" (evita mostrar el error
 *  antes de que el usuario interactúe con el campo). Genérico: el mismo hook cubre RFC y CP hoy y
 *  cualquier otro campo con validación puramente sincrónica (p. ej. `confirmPassword` en F3). */
export default function useFieldValidity(
  value: string,
  validator: (v: string) => boolean
): FieldValidity {
  const [touched, setTouched] = useState(false);
  const markTouched = useCallback((): void => setTouched(true), []);
  return { valid: validator(value), touched, markTouched };
}
