import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/testUtils';
import RoutesModule from './RoutesModule';

// Mock context dependencies
vi.mock('../../context/FleetContext', async () => {
  const actual = await vi.importActual('../../context/FleetContext');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFleet: (): any => ({
      units: [],
      refreshUnits: vi.fn(),
      loading: false,
    }),
  };
});

describe('RoutesModule Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the routes module correctly', () => {
    const { container } = render(<RoutesModule />);
    expect(container).toBeInTheDocument();
  });
});
