import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ItinerantArcBanner from './ItinerantArcBanner';
import * as usePermissionsModule from '../../hooks/usePermissions';

/** FC182 F2 — same shape as `ArchonNetworkBanner.test.tsx`: null when not applicable, the
 *  sovereign copy when it is. */
describe('ItinerantArcBanner', () => {
  it('should not render anything for a non-itinerant user', () => {
    vi.spyOn(usePermissionsModule, 'default').mockReturnValue({
      hasPermission: () => true,
      hasAnyPermission: () => true,
      isOmnipotent: () => false,
      isOmegaStrict: () => false,
      isItinerantArc: () => false,
    });
    const { container } = render(<ItinerantArcBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the sovereign itinerant notice for an Arc without a Universo', () => {
    vi.spyOn(usePermissionsModule, 'default').mockReturnValue({
      hasPermission: () => true,
      hasAnyPermission: () => true,
      isOmnipotent: () => false,
      isOmegaStrict: () => false,
      isItinerantArc: () => true,
    });
    render(<ItinerantArcBanner />);
    expect(screen.getByText(/Arconauta Itinerante/i)).toBeInTheDocument();
    expect(screen.getByText(/Acceso exclusivo a Arcsial/i)).toBeInTheDocument();
  });
});
