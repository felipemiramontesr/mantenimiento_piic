import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/testUtils';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';
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
    const { container } = render(
      <SovereignLayoutProvider>
        <RoutesModule />
      </SovereignLayoutProvider>
    );
    expect(container).toBeInTheDocument();
  });
});
