import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/testUtils';
import FleetGridView from './FleetGridView';
import { FleetUnit } from '../../types/fleet';

describe('FleetGridView Component', () => {
  const mockProps = {
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    units: [] as FleetUnit[],
    onOpenGallery: vi.fn(),
  };

  it('renders correctly', () => {
    render(<FleetGridView {...mockProps} />);
    // Just a basic check that it rendered without crashing
    expect(screen.queryByText('Registrar')).not.toBeInTheDocument();
  });
});
