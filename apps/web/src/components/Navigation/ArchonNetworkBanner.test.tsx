import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArchonNetworkBanner from './ArchonNetworkBanner';
import * as useNetworkStatusModule from '../../hooks/useNetworkStatus';

describe('ArchonNetworkBanner', () => {
  it('should not render anything when online', () => {
    vi.spyOn(useNetworkStatusModule, 'default').mockReturnValue({ isOnline: true });
    const { container } = render(<ArchonNetworkBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the offline warning when offline', () => {
    vi.spyOn(useNetworkStatusModule, 'default').mockReturnValue({ isOnline: false });
    render(<ArchonNetworkBanner />);
    expect(screen.getByText(/modo sin conexión/i)).toBeInTheDocument();
  });
});
