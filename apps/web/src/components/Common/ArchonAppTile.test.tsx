import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Wrench } from 'lucide-react';
import ArchonAppTile from './ArchonAppTile';

/**
 * FC172 F1 — System_Settings_App_Launcher_Tiles.
 * Cobertura del primitivo `ArchonAppTile`: estados, accesibilidad, clicks y badges.
 * Nota S6819 (fix SonarCloud): el tile es un `<button>` nativo, por lo que los
 * estados no-interactivos se expresan como `disabled` (el rol "button" sigue
 * presente en el árbol de accesibilidad) en vez de la ausencia del rol.
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
    const tile = screen.getByRole('button', { name: /Consola Forense/i });
    expect(tile).toBeEnabled();
    fireEvent.click(tile);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Scenario 2 — status="coming_soon": muestra el badge "Próximamente" y el botón queda deshabilitado', () => {
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
    const tile = screen.getByTestId('app-tile-routes');
    expect(tile).toBeDisabled();
    fireEvent.click(tile);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('status="disabled" muestra el badge "Deshabilitado" y el botón queda deshabilitado aunque tenga onClick', () => {
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
    expect(screen.getByRole('button', { name: /X/i })).toBeDisabled();
  });

  it('status="active" SIN onClick tampoco es interactivo (no hay acción que ejecutar)', () => {
    render(<ArchonAppTile id="x" title="X" description="Y" icon={Wrench} status="active" />);
    expect(screen.getByRole('button', { name: /X/i })).toBeDisabled();
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
