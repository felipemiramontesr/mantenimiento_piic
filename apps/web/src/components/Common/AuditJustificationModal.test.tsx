import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuditJustificationModal from './AuditJustificationModal';

describe('AuditJustificationModal (Sovereign Security)', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  it('renders correctly for UPDATE action', () => {
    render(
      <AuditJustificationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Modificar Odómetro"
        actionType="UPDATE"
      />
    );

    expect(screen.getByText(/Justificar Cambio/i)).toBeDefined();
    expect(screen.getByText(/Modificar Odómetro/i)).toBeDefined();
  });

  it('renders correctly for DELETE action', () => {
    render(
      <AuditJustificationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Eliminar Activo"
        actionType="DELETE"
      />
    );

    expect(screen.getByText(/Confirmar Eliminación/i)).toBeDefined();
    expect(screen.getByText(/Confirmar Baja/i)).toBeDefined();
  });

  it('enables confirm button only when reason is long enough', () => {
    render(
      <AuditJustificationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Title"
        actionType="UPDATE"
      />
    );

    const input = screen.getByPlaceholderText(/Ej: Corrección de error/i);
    const confirmBtn = screen.getByRole('button', { name: /Sincronizar/i });

    expect(confirmBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Valid reason here' } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(mockOnConfirm).toHaveBeenCalledWith('Valid reason here');
  });

  it('calls onClose when Cancel is clicked', () => {
    render(
      <AuditJustificationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Title"
        actionType="UPDATE"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('returns null if not open', () => {
    const { container } = render(
      <AuditJustificationModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Test Title"
        actionType="UPDATE"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
