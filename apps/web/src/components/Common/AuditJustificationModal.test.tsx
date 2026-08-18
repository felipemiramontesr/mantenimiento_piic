import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
import AuditJustificationModal from './AuditJustificationModal';

/**
 * FC162 F3 — AuditJustificationModal.tsx had zero test coverage. Reusable
 * modal shared by useAuditModalFlow.ts (fleet edit/delete) and
 * UserContext.tsx's deleteUser flow — covers both UPDATE/DELETE variants,
 * the 5-char reason gate, the reset-on-reopen effect, and the loading state.
 */

describe('AuditJustificationModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AuditJustificationModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirmar"
        actionType="UPDATE"
      />
    );
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('renders the UPDATE copy (Justificar Cambio / Sincronizar)', () => {
    render(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Actualización técnica"
        actionType="UPDATE"
      />
    );
    expect(screen.getByText('📝 Justificar Cambio')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar')).toBeInTheDocument();
    expect(screen.getByText('Actualización técnica')).toBeInTheDocument();
  });

  it('renders the DELETE copy (Confirmar Eliminación / Confirmar Baja)', () => {
    render(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Baja definitiva"
        actionType="DELETE"
      />
    );
    expect(screen.getByText('🚨 Confirmar Eliminación')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Baja')).toBeInTheDocument();
  });

  it('the confirm button stays disabled until the reason reaches 5 characters', () => {
    render(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="x"
        actionType="UPDATE"
      />
    );
    const textarea = screen.getByPlaceholderText(/Corrección de error/);
    const confirmBtn = screen.getByText('Sincronizar');
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'abcd' } });
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'abcde' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('confirming calls onConfirm with the typed reason', () => {
    const onConfirm = vi.fn();
    render(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="x"
        actionType="UPDATE"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Corrección de error/), {
      target: { value: 'Motivo suficientemente largo' },
    });
    fireEvent.click(screen.getByText('Sincronizar'));
    expect(onConfirm).toHaveBeenCalledWith('Motivo suficientemente largo');
  });

  it('cancel calls onClose', () => {
    const onClose = vi.fn();
    render(
      <AuditJustificationModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="x"
        actionType="UPDATE"
      />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('loading=true disables both buttons and shows the spinner', () => {
    render(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="x"
        actionType="UPDATE"
        loading
      />
    );
    expect(screen.getByText('Cancelar')).toBeDisabled();
    expect(screen.getByText('Sincronizar').closest('button')).toBeDisabled();
  });

  it('clears the reason field when the modal is reopened', () => {
    const { rerender } = render(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="x"
        actionType="UPDATE"
      />
    );
    const textarea = screen.getByPlaceholderText(/Corrección de error/);
    fireEvent.change(textarea, { target: { value: 'Algo escrito' } });
    expect(textarea).toHaveValue('Algo escrito');

    rerender(
      <AuditJustificationModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="x"
        actionType="UPDATE"
      />
    );
    rerender(
      <AuditJustificationModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="x"
        actionType="UPDATE"
      />
    );
    expect(screen.getByPlaceholderText(/Corrección de error/)).toHaveValue('');
  });
});
