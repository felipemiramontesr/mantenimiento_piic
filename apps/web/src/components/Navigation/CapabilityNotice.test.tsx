import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import CapabilityNotice from './CapabilityNotice';

/**
 * FC193 F3 — aviso amable tras el rebote de `CapabilityRoute`: muestra el nombre de catálogo del módulo,
 * se cierra limpiando el estado de navegación y un valor desconocido no muestra nada.
 */

const renderWith = (state: unknown): void => {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/dashboard', state }]}>
      <CapabilityNotice />
    </MemoryRouter>
  );
};

describe('CapabilityNotice (FC193 F3)', () => {
  it.each([
    ['CRM', 'Gestión de Relaciones'],
    ['RASTREO', 'Rastreo y Rutas'],
    ['MANTENIMIENTO', 'Mantenimiento de Activos'],
    ['FINANZAS', 'Finanzas y TCO'],
    ['RRHH', 'Recursos Humanos'],
  ])('%s ⇒ "El módulo %s no está activo en tu universo."', (code, label) => {
    renderWith({ capabilityNotice: code });

    expect(screen.getByTestId('capability-notice')).toHaveTextContent(
      `El módulo ${label} no está activo en tu universo.`
    );
  });

  it.each([
    ['sin estado de navegación', null],
    ['estado sin aviso', { otra: 'cosa' }],
    ['código desconocido', { capabilityNotice: 'NO_EXISTE' }],
    ['código vacío', { capabilityNotice: '' }],
    ['propiedad heredada de Object (no es un código)', { capabilityNotice: 'constructor' }],
  ])('%s ⇒ no renderiza nada', (_case, state) => {
    renderWith(state);

    expect(screen.queryByTestId('capability-notice')).not.toBeInTheDocument();
  });

  it('cerrar el aviso limpia el estado de navegación (un refresh no lo vuelve a mostrar)', () => {
    renderWith({ capabilityNotice: 'FINANZAS' });

    fireEvent.click(screen.getByLabelText('Cerrar notificación'));

    expect(screen.queryByTestId('capability-notice')).not.toBeInTheDocument();
  });
});
