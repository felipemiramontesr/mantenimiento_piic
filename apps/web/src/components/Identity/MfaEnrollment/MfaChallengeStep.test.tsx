import type { FormEvent } from 'react';
import { render, screen, fireEvent, RenderResult } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MfaChallengeStep from './MfaChallengeStep';

/** FC185 F4 — pantalla de desafío de login (código TOTP o de respaldo, countdown, volver). */

function renderStep(overrides: Partial<Parameters<typeof MfaChallengeStep>[0]> = {}): RenderResult {
  const defaultProps = {
    code: '',
    onCodeChange: vi.fn(),
    loading: false,
    error: null,
    onSubmit: vi.fn((e: FormEvent) => e.preventDefault()),
    useBackupCode: false,
    onToggleBackupCode: vi.fn(),
    secondsRemaining: 300,
    onBack: vi.fn(),
  };
  return render(<MfaChallengeStep {...defaultProps} {...overrides} />);
}

describe('MfaChallengeStep', () => {
  it('el input recibe foco automáticamente al montar', () => {
    renderStep();
    expect(document.activeElement).toBe(document.getElementById('mfa-challenge-code'));
  });

  it('modo TOTP: filtra a solo dígitos y limita a 6 caracteres (maxLength)', () => {
    const onCodeChange = vi.fn();
    renderStep({ onCodeChange });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveAttribute('maxLength', '6');

    fireEvent.change(input, { target: { value: '12a3b4' } });
    expect(onCodeChange).toHaveBeenCalledWith('1234');
  });

  it('modo backup: acepta mayúsculas/guion y permite hasta 11 caracteres', () => {
    const onCodeChange = vi.fn();
    renderStep({ useBackupCode: true, onCodeChange });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveAttribute('maxLength', '11');

    fireEvent.change(input, { target: { value: 'aaaaa-11111' } });
    expect(onCodeChange).toHaveBeenCalledWith('AAAAA-11111');
  });

  it('el toggle cambia el texto de instrucción y de la propia etiqueta del link', () => {
    const { rerender } = renderStep({ useBackupCode: false });
    expect(screen.getByText(/código de tu app autenticadora/i)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-challenge-toggle-backup')).toHaveTextContent(
      /código de respaldo/i
    );

    rerender(
      <MfaChallengeStep
        code=""
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
        useBackupCode
        onToggleBackupCode={vi.fn()}
        secondsRemaining={300}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByText(/uno de tus códigos de respaldo/i)).toBeInTheDocument();
    expect(screen.getByTestId('mfa-challenge-toggle-backup')).toHaveTextContent(
      /código de la app/i
    );
  });

  it('llama a onToggleBackupCode / onBack al hacer click', () => {
    const onToggleBackupCode = vi.fn();
    const onBack = vi.fn();
    renderStep({ onToggleBackupCode, onBack });

    fireEvent.click(screen.getByTestId('mfa-challenge-toggle-backup'));
    expect(onToggleBackupCode).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('mfa-challenge-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('el botón de verificar está deshabilitado sin código, habilitado con al menos 1 carácter', () => {
    const { rerender } = renderStep({ code: '' });
    expect(screen.getByTestId('mfa-challenge-submit')).toBeDisabled();

    rerender(
      <MfaChallengeStep
        code="1"
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
        useBackupCode={false}
        onToggleBackupCode={vi.fn()}
        secondsRemaining={300}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('mfa-challenge-submit')).not.toBeDisabled();
  });

  it('muestra el banner de error cuando se pasa un mensaje', () => {
    renderStep({ error: 'Código incorrecto.' });
    expect(screen.getByTestId('mfa-challenge-error')).toHaveTextContent('Código incorrecto.');
  });

  it('el countdown muestra mm:ss y cambia a rojo cuando quedan ≤30s', () => {
    const { rerender } = renderStep({ secondsRemaining: 125 });
    expect(screen.getByTestId('mfa-challenge-countdown')).toHaveTextContent('2:05');
    expect(screen.getByTestId('mfa-challenge-countdown').className).not.toContain('text-red-600');

    rerender(
      <MfaChallengeStep
        code=""
        onCodeChange={vi.fn()}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
        useBackupCode={false}
        onToggleBackupCode={vi.fn()}
        secondsRemaining={9}
        onBack={vi.fn()}
      />
    );
    expect(screen.getByTestId('mfa-challenge-countdown')).toHaveTextContent('0:09');
    expect(screen.getByTestId('mfa-challenge-countdown').className).toContain('text-red-600');
  });

  it('llama a onSubmit al enviar el formulario', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    renderStep({ code: '123456', onSubmit });
    fireEvent.submit(screen.getByTestId('mfa-challenge-step'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
