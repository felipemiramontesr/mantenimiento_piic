import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import FleetRegistrationForm from './FleetRegistrationForm';
import useFleetForm from '../../hooks/useFleetForm';
import server from '../../test/server';

/**
 * 🔱 Archon Test Suite: FleetRegistrationForm
 * Implementation: 100% Component Logic Coverage (Pillar 2 - v.17.0.0)
 */

interface ConnectedFormProps {
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}

// Helper component to provide the controller
const ConnectedForm: React.FC<ConnectedFormProps> = (
  props: ConnectedFormProps
): React.JSX.Element => {
  const controller = useFleetForm();
  return <FleetRegistrationForm controller={controller} {...props} />;
};

describe('FleetRegistrationForm Component', () => {
  const mockProps = {
    onSuccess: vi.fn(async (): Promise<void> => {
      /* No-op */
    }),
    onCancel: vi.fn((): void => {
      /* No-op */
    }),
  };

  it('should render all form sections', (): void => {
    render(<ConnectedForm {...mockProps} />);
    expect(screen.getByText('Clasificación del Activo')).toBeInTheDocument();
    expect(screen.getByText('Identidad del Activo')).toBeInTheDocument();
  });

  it('should call onCancel when "Cancelar Registro" is clicked', (): void => {
    render(<ConnectedForm {...mockProps} />);
    fireEvent.click(screen.getByText('Cancelar Registro'));
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('should show "Transmitiendo..." when submitting', async (): Promise<void> => {
    server.use(
      http.post(
        '*/fleet',
        async (): Promise<Response> =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(HttpResponse.json({ success: true }));
            }, 100);
          })
      )
    );

    render(<ConnectedForm {...mockProps} />);
    fireEvent.click(screen.getByText(/Confirmar Registro/i));

    expect(screen.getByText(/Transmitiendo.../i)).toBeInTheDocument();
  });

  it('should call onSuccess and finish submission successfully', async (): Promise<void> => {
    render(<ConnectedForm {...mockProps} />);

    fireEvent.click(screen.getByText(/Confirmar Registro/i));

    await waitFor((): void => {
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });
});
