import { describe, expect, it } from 'vitest';
import { countAtMismatch, formatCount } from './auditUsernameEmailAtMismatch';

/**
 * FC212 F1 — métrica de cuentas que quedarían fuera al buscar solo por correo cada identificador con `@`.
 * El descifrado se inyecta: aquí el «cifrado» es el texto con prefijo `enc:`.
 */

const decrypt = (cipher: string): string => {
  if (!cipher.startsWith('enc:')) throw new Error('cifrado ilegible');
  return cipher.slice(4);
};

describe('FC212 F1 · countAtMismatch', () => {
  it('cuenta solo las cuentas con @ cuyo correo es nulo, ilegible o distinto', () => {
    const count = countAtMismatch(
      [
        { username: 'GrayMan', email: 'enc:omega@piic.com.mx' },
        { username: 'ana@correo.com', email: 'enc:ana@correo.com' },
        { username: 'qa+arc@correo.com', email: 'enc:qa+arc2@correo.com' },
        { username: 'sin@correo.com', email: null },
        { username: 'roto@correo.com', email: 'basura' },
      ],
      decrypt
    );
    expect(count).toEqual({ active: 5, withAt: 4, atRisk: 3 });
  });

  it('sin cuentas: todo en cero', () => {
    expect(countAtMismatch([], decrypt)).toEqual({ active: 0, withAt: 0, atRisk: 0 });
  });
});

describe('FC212 F1 · formatCount', () => {
  it('con 0 en riesgo autoriza el despliegue y no imprime datos de cuentas', () => {
    const text = formatCount({ active: 3, withAt: 1, atRisk: 0 });
    expect(text).toContain('Cuentas activas: 3');
    expect(text).toContain('Con @ en el usuario: 1');
    expect(text).toContain('En riesgo (correo nulo o distinto): 0');
    expect(text).toContain('F1 se puede desplegar');
    expect(text).not.toContain('@correo');
  });

  it('con cuentas en riesgo frena el despliegue', () => {
    expect(formatCount({ active: 3, withAt: 2, atRisk: 2 })).toContain('F1 NO se despliega');
  });
});
