import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import MfaBackupCodesStep from './MfaBackupCodesStep';

/**
 * FC185 F3 — paso 2 del asistente: despliegue único de los 8 códigos de respaldo, con
 * confirmación explícita obligatoria antes de continuar (invariante 3 del FC).
 */

const CODES = [
  'AAAAA-11111',
  'BBBBB-22222',
  'CCCCC-33333',
  'DDDDD-44444',
  'EEEEE-55555',
  'FFFFF-66666',
  'GGGGG-77777',
  'HHHHH-88888',
];

describe('MfaBackupCodesStep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra los 8 códigos', () => {
    render(<MfaBackupCodesStep codes={CODES} onDone={vi.fn()} />);
    const grid = screen.getByTestId('mfa-backup-codes-grid');
    CODES.forEach((code) => {
      expect(grid).toHaveTextContent(code);
    });
  });

  it('Continuar queda deshabilitado hasta marcar la casilla de confirmación', () => {
    render(<MfaBackupCodesStep codes={CODES} onDone={vi.fn()} />);
    expect(screen.getByTestId('mfa-backup-continue')).toBeDisabled();

    fireEvent.click(screen.getByTestId('mfa-backup-acknowledge'));
    expect(screen.getByTestId('mfa-backup-continue')).not.toBeDisabled();
  });

  it('llama a onDone solo después de confirmar y hacer click en Continuar', () => {
    const onDone = vi.fn();
    render(<MfaBackupCodesStep codes={CODES} onDone={onDone} />);

    fireEvent.click(screen.getByTestId('mfa-backup-continue'));
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('mfa-backup-acknowledge'));
    fireEvent.click(screen.getByTestId('mfa-backup-continue'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('copiar todos usa el clipboard con los 8 códigos separados por salto de línea', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MfaBackupCodesStep codes={CODES} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mfa-backup-copy'));

    expect(writeText).toHaveBeenCalledWith(CODES.join('\n'));
    expect(await screen.findByText('Copiados')).toBeInTheDocument();
  });

  it('si el clipboard falla no revienta ni marca "Copiados"', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MfaBackupCodesStep codes={CODES} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mfa-backup-copy'));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByText('Copiados')).not.toBeInTheDocument();
  });

  it('descargar genera un archivo .txt con los códigos (createObjectURL + click)', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<MfaBackupCodesStep codes={CODES} onDone={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mfa-backup-download'));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
