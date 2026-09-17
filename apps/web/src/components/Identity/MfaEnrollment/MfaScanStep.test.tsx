import type { FormEvent } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MfaScanStep from './MfaScanStep';

/**
 * FC185 F3 — paso 1 del asistente de enrolamiento: QR + secreto manual + código de confirmación.
 */

const OTPAUTH_URI = 'otpauth://totp/Archon:grayman?secret=JBSWY3DPEHPK3PXP&issuer=Archon';
const SECRET = 'JBSWY3DPEHPK3PXP';

describe('MfaScanStep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza un <svg> real (QR nativo) y el secreto en texto plano para ingreso manual', () => {
    const { container } = render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code=""
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
      />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId('mfa-manual-secret')).toHaveTextContent(SECRET);
  });

  it('el input de código solo acepta dígitos, máximo 6', () => {
    const onCodeChange = vi.fn();
    render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code=""
        onCodeChange={onCodeChange}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), {
      target: { value: '12a3b4' },
    });
    expect(onCodeChange).toHaveBeenCalledWith('1234');
  });

  it('el botón de activar queda deshabilitado hasta que el código tiene 6 dígitos', () => {
    const { rerender } = render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code="123"
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId('mfa-confirm-submit')).toBeDisabled();

    rerender(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code="123456"
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByTestId('mfa-confirm-submit')).not.toBeDisabled();
  });

  it('muestra el banner de error cuando se pasa un mensaje', () => {
    render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code="123456"
        onCodeChange={vi.fn()}
        loading={false}
        error="Código incorrecto."
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Código incorrecto.')).toBeInTheDocument();
  });

  it('llama a onSubmit al enviar el formulario', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code="123456"
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={onSubmit}
      />
    );
    fireEvent.submit(screen.getByTestId('mfa-scan-step'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('copiar la clave manual usa el clipboard y muestra confirmación temporal', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code=""
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('mfa-copy-secret'));

    expect(writeText).toHaveBeenCalledWith(SECRET);
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('si el clipboard falla (permiso denegado, etc.) no revienta ni marca "Copiado"', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <MfaScanStep
        otpauthUri={OTPAUTH_URI}
        secretBase32={SECRET}
        code=""
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('mfa-copy-secret'));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByText('Copiado')).not.toBeInTheDocument();
  });
});
