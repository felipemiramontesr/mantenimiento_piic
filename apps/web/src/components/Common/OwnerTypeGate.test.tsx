import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OwnerTypeGate from './OwnerTypeGate';

/**
 * 🔱 Archon Test: OwnerTypeGate (Archon Master F2-G)
 * Renders children only when ownerType matches; renders fallback otherwise.
 */

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

const setOwnerType = (ownerType: 'FLOTILLA' | 'PRIVATE' | 'CENTER' | null): void => {
  mockUseAuth.mockReturnValue({ ownerType });
};

describe('OwnerTypeGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when ownerType matches', () => {
    setOwnerType('FLOTILLA');
    render(
      <OwnerTypeGate type="FLOTILLA">
        <div data-testid="flotilla-content">Flotilla Panel</div>
      </OwnerTypeGate>
    );
    expect(screen.getByTestId('flotilla-content')).toBeInTheDocument();
  });

  it('renders nothing when ownerType does not match', () => {
    setOwnerType('PRIVATE');
    render(
      <OwnerTypeGate type="FLOTILLA">
        <div data-testid="flotilla-content">Flotilla Panel</div>
      </OwnerTypeGate>
    );
    expect(screen.queryByTestId('flotilla-content')).not.toBeInTheDocument();
  });

  it('renders fallback when ownerType does not match', () => {
    setOwnerType('CENTER');
    render(
      <OwnerTypeGate type="FLOTILLA" fallback={<div data-testid="fallback">No access</div>}>
        <div data-testid="flotilla-content">Flotilla Panel</div>
      </OwnerTypeGate>
    );
    expect(screen.queryByTestId('flotilla-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders nothing when ownerType is null (internal user)', () => {
    setOwnerType(null);
    render(
      <OwnerTypeGate type="PRIVATE">
        <div data-testid="private-content">VIM Panel</div>
      </OwnerTypeGate>
    );
    expect(screen.queryByTestId('private-content')).not.toBeInTheDocument();
  });

  it('renders CENTER children for CENTER owner', () => {
    setOwnerType('CENTER');
    render(
      <OwnerTypeGate type="CENTER">
        <div data-testid="center-content">Centro Panel</div>
      </OwnerTypeGate>
    );
    expect(screen.getByTestId('center-content')).toBeInTheDocument();
  });

  it('renders PRIVATE children for PRIVATE owner', () => {
    setOwnerType('PRIVATE');
    render(
      <OwnerTypeGate type="PRIVATE">
        <div data-testid="private-panel">Privado Panel</div>
      </OwnerTypeGate>
    );
    expect(screen.getByTestId('private-panel')).toBeInTheDocument();
  });
});
