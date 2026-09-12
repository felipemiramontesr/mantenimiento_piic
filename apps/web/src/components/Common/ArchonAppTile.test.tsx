import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Wrench } from 'lucide-react';
import ArchonAppTile from './ArchonAppTile';

/**
 * FC172 F1 — System_Settings_App_Launcher_Tiles.
 * Cobertura del primitivo `ArchonAppTile`: estados, accesibilidad, clicks y badges.
 */
describe('ArchonAppTile', () => {
  it('Scenario 1 — status="active" con onClick: click ejecuta la acción', () => {
    const onClick = vi.fn();
    render(
      <ArchonAppTile
        id="doctor"
        title="Consola Forense"
        description="Diagnóstico en vivo"
        icon={Wrench}
        status="active"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Consola Forense/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('responde a Enter y Espacio en teclado cuando es interactivo', () => {
    const onClick = vi.fn();
    render(
      <ArchonAppTile
        id="doctor"
        title="Consola Forense"
        description="Diagnóstico en vivo"
        icon={Wrench}
        status="active"
        onClick={onClick}
      />
    );
    const tile = screen.getByRole('button', { name: /Consola Forense/i });
    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('un tercer key (ej. Escape) no dispara onClick', () => {
    const onClick = vi.fn();
    render(
      <ArchonAppTile
        id="doctor"
        title="Consola Forense"
        description="Diagnóstico en vivo"
        icon={Wrench}
        status="active"
        onClick={onClick}
      />
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /Consola Forense/i }), {
      key: 'Escape',
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Scenario 2 — status="coming_soon": muestra el badge "Próximamente" y NO es interactivo', () => {
    const onClick = vi.fn();
    render(
      <ArchonAppTile
        id="routes"
        title="Rutas y Checkpoints"
        description="Configuración de itinerarios"
        icon={Wrench}
        status="coming_soon"
        onClick={onClick}
      />
    );
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    fireEvent.click(screen.getByTestId('app-tile-routes'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('status="disabled" muestra el badge "Deshabilitado" y NO es interactivo aunque tenga onClick', () => {
    const onClick = vi.fn();
    render(
      <ArchonAppTile
        id="x"
        title="X"
        description="Y"
        icon={Wrench}
        status="disabled"
        onClick={onClick}
      />
    );
    expect(screen.getByText('Deshabilitado')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('status="active" SIN onClick tampoco es interactivo (no hay acción que ejecutar)', () => {
    render(<ArchonAppTile id="x" title="X" description="Y" icon={Wrench} status="active" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('un badge explícito sobrescribe el badge por defecto del status', () => {
    render(
      <ArchonAppTile
        id="x"
        title="X"
        description="Y"
        icon={Wrench}
        status="coming_soon"
        badge="Beta"
      />
    );
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Próximamente')).toBeNull();
  });

  it('usa dataTestId explícito cuando se provee, en vez del default app-tile-{id}', () => {
    render(
      <ArchonAppTile
        id="x"
        title="X"
        description="Y"
        icon={Wrench}
        status="coming_soon"
        dataTestId="custom-tile"
      />
    );
    expect(screen.getByTestId('custom-tile')).toBeInTheDocument();
    expect(screen.queryByTestId('app-tile-x')).toBeNull();
  });
});
