import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import {
  describeMailTestRequestError,
  describeMailTestResult,
  maskEmail,
  type MailTestResponse,
} from './mailDiagnosticMessages';

/** FC188 F2 — cada resultado del contrato (Scenarios 1, 2 y filas de la T1) tiene su mensaje. */

const MASKED = 'fe•••@gmail.com';

function response(overrides: Partial<MailTestResponse>): MailTestResponse {
  return { success: true, mode: 'smtp', status: 'sent', ...overrides };
}

function httpError(status: number, data: unknown): AxiosError {
  const res = {
    status,
    data,
    headers: {},
    statusText: '',
    config: { headers: new AxiosHeaders() },
  };
  return new AxiosError('boom', 'ERR_BAD_REQUEST', undefined, undefined, res as AxiosResponse);
}

describe('FC188 F2 — maskEmail', () => {
  it('conserva 2 caracteres del usuario y el dominio completo', () => {
    expect(maskEmail('felipemiramontesr@gmail.com')).toBe('fe•••@gmail.com');
  });

  it('con un usuario de 1 carácter solo muestra ese carácter', () => {
    expect(maskEmail('a@piic.com.mx')).toBe('a•••@piic.com.mx');
  });

  it.each([[undefined], [null], [''], ['sin-arroba'], ['@dominio.com']])(
    'sin correo o con forma inválida (%s) devuelve el texto genérico',
    (value) => {
      expect(maskEmail(value)).toBe('tu correo registrado');
    }
  );
});

describe('FC188 F2 — describeMailTestResult', () => {
  it('sent (smtp) ⇒ éxito con el correo enmascarado y "revisa bandeja y spam"', () => {
    expect(describeMailTestResult(response({ messageId: '<m1>' }), MASKED)).toEqual({
      tone: 'success',
      message: `Correo de prueba enviado a ${MASKED} — revisa tu bandeja de entrada y spam`,
      mode: 'smtp',
    });
  });

  it('sent en modo memoria ⇒ advertencia: NO salió a ningún buzón', () => {
    const outcome = describeMailTestResult(response({ mode: 'memory' }), MASKED);
    expect(outcome.tone).toBe('warning');
    expect(outcome.message).toMatch(/NO salió a ningún buzón/);
    expect(outcome.mode).toBe('memory');
  });

  it('failed EAUTH ⇒ pide verificar usuario y contraseña del buzón en Hostinger', () => {
    const outcome = describeMailTestResult(response({ status: 'failed', reason: 'EAUTH' }), MASKED);
    expect(outcome.tone).toBe('error');
    expect(outcome.message).toBe(
      'Fallo de autenticación SMTP — verifica el usuario y contraseña del buzón en Hostinger'
    );
  });

  it.each(['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED', 'EDNS'])(
    'failed %s ⇒ error de conexión: verificar host y puerto SMTP',
    (reason) => {
      const outcome = describeMailTestResult(response({ status: 'failed', reason }), MASKED);
      expect(outcome.tone).toBe('error');
      expect(outcome.message).toBe(
        'Error de conexión — verifica el host y puerto SMTP en Hostinger'
      );
    }
  );

  it('failed con un código distinto ⇒ lo muestra tal cual', () => {
    const outcome = describeMailTestResult(
      response({ status: 'failed', reason: 'EENVELOPE' }),
      MASKED
    );
    expect(outcome.message).toBe('El servidor de correo rechazó el envío (código: EENVELOPE)');
  });

  it('failed sin código ⇒ "desconocido"', () => {
    const outcome = describeMailTestResult(response({ status: 'failed' }), MASKED);
    expect(outcome.message).toBe('El servidor de correo rechazó el envío (código: desconocido)');
  });

  it('disabled ⇒ advertencia: faltan variables SMTP_* en el panel', () => {
    const outcome = describeMailTestResult(
      response({ mode: 'disabled', status: 'disabled' }),
      MASKED
    );
    expect(outcome).toEqual({
      tone: 'warning',
      message: 'El correo transaccional está desactivado (faltan variables SMTP_* en el panel)',
      mode: 'disabled',
    });
  });
});

describe('FC188 F2 — describeMailTestRequestError', () => {
  it('400 EMAIL_NOT_CONFIGURED ⇒ la cuenta de Omega no tiene correo', () => {
    const outcome = describeMailTestRequestError(
      httpError(400, { success: false, code: 'EMAIL_NOT_CONFIGURED' })
    );
    expect(outcome).toEqual({
      tone: 'error',
      message: 'La cuenta de Omega no tiene un correo configurado para recibir pruebas',
    });
  });

  it('429 ⇒ advertencia de límite de 3 por hora (sin mode)', () => {
    const outcome = describeMailTestRequestError(
      httpError(429, { success: false, code: 'RATE_LIMIT_EXCEEDED' })
    );
    expect(outcome.tone).toBe('warning');
    expect(outcome.message).toMatch(/3 correos de prueba por hora/);
    expect(outcome.mode).toBeUndefined();
  });

  it.each([
    ['500 sin código en el cuerpo', httpError(500, {})],
    ['500 sin cuerpo', httpError(500, undefined)],
    ['sin respuesta (red caída)', new AxiosError('Network Error', 'ERR_NETWORK')],
    ['un error que no es de axios', new Error('inesperado')],
    ['un valor no-Error', 'texto suelto'],
  ])('%s ⇒ mensaje genérico de conexión con el API', (_label, error) => {
    const outcome = describeMailTestRequestError(error);
    expect(outcome.tone).toBe('error');
    expect(outcome.message).toMatch(/verifica la conexión con el API/);
  });
});
