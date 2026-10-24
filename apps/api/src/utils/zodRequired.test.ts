import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import requiredMessage from './zodRequired';

/** FC220 F1 — reemplazo de `required_error` de zod 3 con la misma semántica en zod 4. */
describe('requiredMessage', () => {
  const schema = z.object({ amount: z.number(requiredMessage('amount es requerido')).positive() });

  it('campo ausente ⇒ el mensaje propio', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('amount es requerido');
  });

  it('tipo equivocado ⇒ el mensaje por omisión de zod, no el propio', () => {
    const result = schema.safeParse({ amount: 'diez' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).not.toBe('amount es requerido');
  });

  it('valor válido ⇒ pasa', () => {
    expect(schema.safeParse({ amount: 10 }).success).toBe(true);
  });
});
