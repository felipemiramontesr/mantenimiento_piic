import { describe, it, expect, vi } from 'vitest';
import { Truck, Wrench } from 'lucide-react';
import { render, screen, fireEvent } from '../../test/testUtils';
import ArchonManagementCard, { ArchonCardVariant } from './ArchonManagementCard';

/**
 * FC162 F3 — ArchonManagementCard.tsx had zero test coverage. Covers all 7
 * chromatic variants (incl. the yellow-text branch and the unknown-variant
 * fallback), the vertical/horizontal layout split, the reverseArrow
 * direction, the isActive ring, and the click callback.
 */

const BASE_PROPS = {
  headerTitle: 'Flota',
  HeaderIcon: Truck,
  actionTitle: 'Gestionar Flota',
  description: 'Administra tus unidades',
  PayloadIcon: Wrench,
  buttonText: 'Ir a Flota',
  isActive: false,
  onClick: vi.fn(),
};

describe('ArchonManagementCard', () => {
  it('renders the vertical layout by default with header/payload/action', () => {
    render(<ArchonManagementCard {...BASE_PROPS} variant="navy" testId="card-flota" />);
    expect(screen.getByText('Flota')).toBeInTheDocument();
    expect(screen.getByText('Gestionar Flota')).toBeInTheDocument();
    expect(screen.getByText('Administra tus unidades')).toBeInTheDocument();
    expect(screen.getByTestId('card-flota')).toBeInTheDocument();
  });

  it('renders the horizontal layout without the actionTitle/description block', () => {
    render(<ArchonManagementCard {...BASE_PROPS} variant="navy" layout="horizontal" />);
    expect(screen.getByText('Flota')).toBeInTheDocument();
    expect(screen.queryByText('Gestionar Flota')).not.toBeInTheDocument();
  });

  it('renders each of the 7 chromatic variants without throwing', () => {
    const variants: ArchonCardVariant[] = [
      'navy',
      'emerald',
      'red',
      'yellow',
      'sky',
      'violet',
      'blue',
    ];
    variants.forEach((variant) => {
      const { unmount } = render(<ArchonManagementCard {...BASE_PROPS} variant={variant} />);
      unmount();
    });
  });

  it('yellow variant uses navy text on the action button, others use white', () => {
    const { container: yellowContainer } = render(
      <ArchonManagementCard {...BASE_PROPS} variant="yellow" />
    );
    expect(yellowContainer.querySelector('button')?.className).toContain('text-pinnacle-navy');

    const { container: navyContainer } = render(
      <ArchonManagementCard {...BASE_PROPS} variant="navy" />
    );
    expect(navyContainer.querySelector('button')?.className).toContain('text-white');
  });

  it('reverseArrow renders the button text after a left arrow instead of before a right arrow', () => {
    render(<ArchonManagementCard {...BASE_PROPS} variant="navy" reverseArrow />);
    expect(screen.getByText('Ir a Flota')).toBeInTheDocument();
  });

  it('isActive adds the active ring class to the action button', () => {
    const { container } = render(<ArchonManagementCard {...BASE_PROPS} variant="navy" isActive />);
    expect(container.querySelector('button')?.className).toContain('ring-1');
  });

  it('clicking the card calls onClick', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ArchonManagementCard {...BASE_PROPS} variant="navy" onClick={onClick} />
    );
    fireEvent.click(container.firstElementChild as Element);
    expect(onClick).toHaveBeenCalled();
  });

  it('Enter key on the card calls onClick (ClickableCardWrapper keyboard path, FC163 F1-REG Gate3)', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ArchonManagementCard {...BASE_PROPS} variant="navy" onClick={onClick} />
    );
    fireEvent.keyDown(container.firstElementChild as Element, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  // ── R4-C Fc165 F2 Slice 2.3C Batch 1 — unc branches ──

  it('falls back to the navy palette for an out-of-catalog variant (backend/type drift)', () => {
    const { container } = render(
      <ArchonManagementCard
        {...BASE_PROPS}
        variant={'chartreuse' as unknown as ArchonCardVariant}
      />
    );
    expect(container.firstElementChild?.className).toContain('[--card-accent:#0f2a44]');
  });

  it('Space key on the card calls onClick (ClickableCardWrapper keyboard path)', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ArchonManagementCard {...BASE_PROPS} variant="navy" onClick={onClick} />
    );
    fireEvent.keyDown(container.firstElementChild as Element, { key: ' ' });
    expect(onClick).toHaveBeenCalled();
  });

  it('an unrelated key on the card does not call onClick', () => {
    const onClick = vi.fn();
    const { container } = render(
      <ArchonManagementCard {...BASE_PROPS} variant="navy" onClick={onClick} />
    );
    fireEvent.keyDown(container.firstElementChild as Element, { key: 'a' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
