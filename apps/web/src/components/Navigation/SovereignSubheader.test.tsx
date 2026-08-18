import { describe, it, expect } from 'vitest';
import { useEffect, type ReactNode, type FC } from 'react';
import { render, screen } from '../../test/testUtils';
import { SovereignLayoutProvider, useSovereignLayout } from '../../context/SovereignLayoutContext';
import SovereignSubheader from './SovereignSubheader';

/**
 * FC162 F3 — SovereignSubheader.tsx had zero test coverage. Covers the
 * collapsed (no subheaderActions) state and the rendered-slot state, driven
 * through the real SovereignLayoutProvider via setSectionData.
 */

const SetSubheaderActions: FC<{ actions?: ReactNode }> = ({ actions }) => {
  const { setSectionData } = useSovereignLayout();
  useEffect(() => {
    setSectionData('Título', 'Descripción', actions);
  }, [actions, setSectionData]);
  return null;
};

describe('SovereignSubheader', () => {
  it('renders a collapsed empty shell when subheaderActions is unset', () => {
    const { container } = render(
      <SovereignLayoutProvider>
        <SovereignSubheader />
      </SovereignLayoutProvider>
    );
    expect(container.querySelector('.sovereign-subheader')).toBeNull();
    expect(container.querySelector('.h-0')).not.toBeNull();
  });

  it('renders the provided subheaderActions slot', () => {
    render(
      <SovereignLayoutProvider>
        <SetSubheaderActions actions={<button type="button">Filtrar</button>} />
        <SovereignSubheader />
      </SovereignLayoutProvider>
    );
    expect(screen.getByText('Filtrar')).toBeInTheDocument();
  });
});
