import { describe, it, expect } from 'vitest';
import { buildEmailVerificationEmail, buildPasswordResetEmail } from './mailTemplates';

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
