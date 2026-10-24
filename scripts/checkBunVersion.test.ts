import { describe, expect, it } from 'vitest';
import { bunVersionMismatch, declaredBunVersion } from './checkBunVersion';

/** FC221 F1 (T1, B) — guardia local: la versión de Bun de la máquina = `packageManager`. */

describe('declaredBunVersion', () => {
  it('lee la versión de "bun@x.y.z"', () => {
    expect(declaredBunVersion('{"packageManager":"bun@1.4.4"}')).toBe('1.4.4');
  });

  it.each([
    '{}',
    '{"packageManager":"npm@10.0.0"}',
    '{"packageManager":"bun@latest"}',
    '{"packageManager":3}',
  ])('sin una versión exacta de Bun (%s) responde null', (json) => {
    expect(declaredBunVersion(json)).toBeNull();
  });
});

describe('bunVersionMismatch', () => {
  it('misma versión ⇒ sin problema', () => {
    expect(bunVersionMismatch('1.4.4', '1.4.4')).toBeNull();
  });

  it('otra versión ⇒ el motivo y el comando para alinearla', () => {
    expect(bunVersionMismatch('1.4.4', '1.3.14')).toBe(
      'Esta máquina corre Bun 1.3.14 y package.json declara 1.4.4. Instala Bun 1.4.4 (https://bun.sh/docs/installation)'
    );
  });

  it('sin declaración ⇒ problema', () => {
    expect(bunVersionMismatch(null, '1.4.4')).toBe(
      'package.json no declara "packageManager": "bun@x.y.z"'
    );
  });
});
