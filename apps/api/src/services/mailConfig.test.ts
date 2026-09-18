import { describe, it, expect } from 'vitest';
import { loadMailConfig } from './mailConfig';
import type { MailEnv } from './mailConfig';

/**
 * FC187 F1 — `loadMailConfig` es pura: cada caso pasa su propio objeto de entorno, sin tocar
 * `process.env` ni abrir sockets. Regla D1b: test ⇒ memory (primero) · SMTP completo ⇒ smtp ·
 * otro caso ⇒ disabled, decidido por PRESENCIA de SMTP_*, no por NODE_ENV==='production'.
 */

const HOST = 'smtp.example.test';
const USER = 'buzon@example.test';
const SECRET_VALUE = 'not-a-real-value';
const FULL_ENV: MailEnv = {
  SMTP_HOST: HOST,
  SMTP_PORT: '465',
  SMTP_USER: USER,
  SMTP_PASS: SECRET_VALUE,
};

describe('FC187 F1 — loadMailConfig: modo memory (R10)', () => {
  it('NODE_ENV=test ⇒ memory, incluso con SMTP_* completo (un .env local nunca abre sockets)', () => {
    expect(loadMailConfig({ ...FULL_ENV, NODE_ENV: 'test' })).toEqual({ mode: 'memory' });
  });

  it('VITEST=true ⇒ memory', () => {
    expect(loadMailConfig({ ...FULL_ENV, VITEST: 'true' })).toEqual({ mode: 'memory' });
  });
});

describe('FC187 F1 — loadMailConfig: modo smtp', () => {
  it('SMTP completo en 465 ⇒ TLS implícito, remitente = SMTP_USER, nombre por defecto, sin replyTo', () => {
    const config = loadMailConfig(FULL_ENV);
    expect(config).toEqual({
      mode: 'smtp',
      host: HOST,
      port: 465,
      secure: true,
      user: USER,
      pass: SECRET_VALUE,
      fromName: 'Archon ERP',
      fromAddress: USER,
    });
    expect(config).not.toHaveProperty('replyTo');
  });

  it('cualquier puerto distinto de 465 ⇒ secure=false (STARTTLS obligatorio lo aplica el transporte)', () => {
    const config = loadMailConfig({ ...FULL_ENV, SMTP_PORT: '587' });
    expect(config).toMatchObject({ mode: 'smtp', port: 587, secure: false });
  });

  it('SMTP_FROM_NAME y SMTP_REPLY_TO opcionales se respetan', () => {
    const config = loadMailConfig({
      ...FULL_ENV,
      SMTP_FROM_NAME: 'Archon — PIIC',
      SMTP_REPLY_TO: 'soporte@example.test',
    });
    expect(config).toMatchObject({
      mode: 'smtp',
      fromName: 'Archon — PIIC',
      replyTo: 'soporte@example.test',
    });
  });

  it('recorta espacios de host/puerto/usuario pero conserva la contraseña tal cual', () => {
    const config = loadMailConfig({
      SMTP_HOST: `  ${HOST}  `,
      SMTP_PORT: ' 465 ',
      SMTP_USER: `  ${USER} `,
      SMTP_PASS: ' con espacios ',
    });
    expect(config).toMatchObject({ host: HOST, port: 465, user: USER, pass: ' con espacios ' });
  });

  it('se decide por PRESENCIA de SMTP_*, no por NODE_ENV: SMTP completo sin NODE_ENV ⇒ smtp', () => {
    expect(loadMailConfig(FULL_ENV).mode).toBe('smtp');
    expect(loadMailConfig({ ...FULL_ENV, NODE_ENV: 'production' }).mode).toBe('smtp');
  });
});

describe('FC187 F1 — loadMailConfig: modo disabled (nunca lanza, nunca revela valores)', () => {
  it('sin ninguna variable ⇒ disabled y nombra las 4 obligatorias', () => {
    const config = loadMailConfig({});
    expect(config).toEqual({
      mode: 'disabled',
      reason: 'faltan variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS',
    });
  });

  it('en producción sin SMTP_* ⇒ disabled (no cae en memory)', () => {
    expect(loadMailConfig({ NODE_ENV: 'production' }).mode).toBe('disabled');
  });

  it('configuración incompleta ⇒ solo nombra las que faltan', () => {
    const config = loadMailConfig({ SMTP_HOST: HOST, SMTP_PORT: '465' });
    expect(config).toEqual({ mode: 'disabled', reason: 'faltan variables SMTP_USER, SMTP_PASS' });
  });

  it('una contraseña de solo espacios cuenta como faltante', () => {
    const config = loadMailConfig({ ...FULL_ENV, SMTP_PASS: '   ' });
    expect(config).toEqual({ mode: 'disabled', reason: 'faltan variables SMTP_PASS' });
  });

  it.each(['abc', '0', '70000', '25.5', '-1'])('puerto inválido "%s" ⇒ disabled', (port) => {
    expect(loadMailConfig({ ...FULL_ENV, SMTP_PORT: port })).toEqual({
      mode: 'disabled',
      reason: 'SMTP_PORT no es un puerto válido (1-65535)',
    });
  });

  it('SMTP_USER que no es un correo ⇒ disabled', () => {
    expect(loadMailConfig({ ...FULL_ENV, SMTP_USER: 'no-es-correo' })).toEqual({
      mode: 'disabled',
      reason: 'SMTP_USER no es una dirección de correo válida',
    });
  });

  it('SMTP_REPLY_TO presente pero inválido ⇒ disabled; vacío es válido', () => {
    expect(loadMailConfig({ ...FULL_ENV, SMTP_REPLY_TO: 'nope' })).toEqual({
      mode: 'disabled',
      reason: 'SMTP_REPLY_TO no es una dirección de correo válida',
    });
    expect(loadMailConfig({ ...FULL_ENV, SMTP_REPLY_TO: '  ' }).mode).toBe('smtp');
  });

  it('la razón nunca contiene host, usuario ni contraseña', () => {
    const cases: MailEnv[] = [
      { ...FULL_ENV, SMTP_PORT: 'abc' },
      { ...FULL_ENV, SMTP_USER: 'no-es-correo' },
      { ...FULL_ENV, SMTP_REPLY_TO: 'nope' },
      { SMTP_HOST: HOST, SMTP_PASS: SECRET_VALUE },
    ];
    cases.forEach((env) => {
      const config = loadMailConfig(env);
      expect(config.mode).toBe('disabled');
      const serialized = JSON.stringify(config);
      expect(serialized).not.toContain(SECRET_VALUE);
      expect(serialized).not.toContain(HOST);
    });
  });
});
