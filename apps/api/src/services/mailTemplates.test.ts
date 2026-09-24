import { describe, it, expect } from 'vitest';
import {
  buildEmailVerificationEmail,
  buildMailTestEmail,
  buildPasswordResetEmail,
  buildMfaCodeEmail,
} from './mailTemplates';

/** FC187 F1 — una sola plantilla genera HTML y texto plano; todo dato dinámico se escapa. */

const URL_OK = 'https://mantenimiento.example.test/reset-password?token=abc123';

describe('FC187 F1 — buildPasswordResetEmail', () => {
  const email = buildPasswordResetEmail(URL_OK);

  it('asunto y marca', () => {
    expect(email.subject).toBe('Restablece tu contraseña — Archon ERP');
    expect(email.html).toContain('Archon ERP');
    expect(email.text).toContain('Archon ERP');
  });

  it('HTML y texto llevan el MISMO enlace, el botón y el aviso de 15 minutos', () => {
    expect(email.html).toContain(`href="${URL_OK}"`);
    expect(email.html).toContain('Restablecer contraseña');
    expect(email.html).toContain('caduca en 15 minutos');
    expect(email.text).toContain(`Restablecer contraseña: ${URL_OK}`);
    expect(email.text).toContain('caduca en 15 minutos');
  });

  it('el HTML es un documento completo con charset UTF-8', () => {
    expect(email.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(email.html).toContain('<meta charset="utf-8">');
  });

  it('el texto plano no contiene etiquetas HTML', () => {
    expect(email.text).not.toMatch(/<[a-z][^>]*>/i);
  });
});

describe('FC187 F1 — buildEmailVerificationEmail', () => {
  const email = buildEmailVerificationEmail(
    'https://mantenimiento.example.test/verify-email?token=xyz'
  );

  it('asunto, botón y avisos propios de la verificación', () => {
    expect(email.subject).toBe('Verifica tu correo — Archon ERP');
    expect(email.html).toContain('Verificar correo');
    expect(email.text).toContain('No compartas este enlace con nadie.');
  });

  it('comparte estructura con la de recuperación (misma plantilla)', () => {
    expect(email.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(email.text).toContain('verify-email?token=xyz');
  });
});

describe('FC187 F1 — escape de HTML', () => {
  it('escapa & < > " \' en el HTML y deja el texto plano intacto', () => {
    const hostile = 'https://x.test/?a=1&b=<script>alert("x")</script>&c=\'q\'';
    const email = buildPasswordResetEmail(hostile);

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&amp;b=&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(email.html).toContain('&#39;q&#39;');
    expect(email.text).toContain(hostile);
  });
});

describe('FC188 F1 — buildMailTestEmail (informativo, sin botón)', () => {
  const email = buildMailTestEmail({
    actorName: 'GrayMan',
    sentAtIso: '2026-09-18T18:00:00.000Z',
    mode: 'smtp',
  });

  it('asunto fijo y datos del disparo (quién, cuándo en UTC, transporte)', () => {
    expect(email.subject).toBe('[ARCHON] Correo de prueba del sistema');
    expect(email.text).toContain('Disparado por GrayMan el 2026-09-18T18:00:00.000Z (UTC).');
    expect(email.text).toContain('Transporte activo: smtp.');
    expect(email.html).toContain('GrayMan');
  });

  it('no lleva botón ni enlace (no hay acción que ofrecer)', () => {
    expect(email.html).not.toContain('<a ');
    expect(email.html).not.toContain('Si el botón no funciona');
    expect(email.text).not.toContain('http');
  });

  it('escapa el nombre del actor en el HTML', () => {
    const hostile = buildMailTestEmail({
      actorName: '<img src=x>',
      sentAtIso: '2026-09-18T18:00:00.000Z',
      mode: 'memory',
    });
    expect(hostile.html).not.toContain('<img src=x>');
    expect(hostile.html).toContain('&lt;img src=x&gt;');
  });
});

describe('FC195 F2 — buildMfaCodeEmail', () => {
  it('login: el código va en el asunto, en grande en el HTML y en el texto plano', () => {
    const email = buildMfaCodeEmail('ABCDEFGH', 'login');

    expect(email.subject).toBe('ABCDEFGH es tu código de verificación — Archon ERP');
    expect(email.html).toContain('Tu código para iniciar sesión');
    expect(email.html).toContain('letter-spacing:6px');
    expect(email.html).toContain('>ABCDEFGH</p>');
    expect(email.text.split('\n\n')).toContain('ABCDEFGH');
    expect(email.text).toContain('caduca en 10 minutos');
    expect(email.html).not.toContain('<a href');
  });

  it('setup: texto de activación', () => {
    const email = buildMfaCodeEmail('ABCDEFGH', 'setup');

    expect(email.html).toContain('Activa tu verificación por correo');
    expect(email.text).toContain('activar la verificación en dos pasos');
  });

  it('el código se escapa en el HTML', () => {
    expect(buildMfaCodeEmail('<b>', 'login').html).toContain('&lt;b&gt;');
  });
});
