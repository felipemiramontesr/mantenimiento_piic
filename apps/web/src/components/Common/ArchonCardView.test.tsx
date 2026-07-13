import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchonCardView from './ArchonCardView';

/**
 * 🔱 FC 041 Fase B — Vista_Tarjetas_PWA
 * Grid responsivo táctil sin scroll horizontal interno, estado vacío es-MX,
 * tarjetas clickeables accesibles (button real) solo cuando hay handler.
 */

interface Unit {
  id: number;
  name: string;
}

const UNITS: Unit[] = [
  { id: 1, name: 'PIIC-101' },
  { id: 2, name: 'PIIC-201' },
  { id: 3, name: 'PIIC-301' },
];

const renderCards = (props?: {
  items?: Unit[];
  onCardClick?: (item: Unit) => void;
  emptyMessage?: string;
}): void => {
  render(
    <ArchonCardView<Unit>
      items={props?.items ?? UNITS}
      keyExtractor={(u): number => u.id}
      renderCard={(u): React.ReactNode => <span>{u.name}</span>}
      onCardClick={props?.onCardClick}
      emptyMessage={props?.emptyMessage}
    />
  );
};

describe('ArchonCardView (FC 041 Fase B)', () => {
  it('renders one card per item with its content', () => {
    renderCards();
    expect(screen.getAllByTestId('archon-card-item')).toHaveLength(3);
    expect(screen.getByText('PIIC-101')).toBeInTheDocument();
    expect(screen.getByText('PIIC-301')).toBeInTheDocument();
  });

  it('shows the default empty state in es-MX when there are no items', () => {
    renderCards({ items: [] });
    expect(screen.getByText('SIN REGISTROS DISPONIBLES')).toBeInTheDocument();
    expect(screen.queryAllByTestId('archon-card-item')).toHaveLength(0);
  });

  it('shows a custom empty message when provided', () => {
    renderCards({ items: [], emptyMessage: 'NO HAY UNIDADES ACTIVAS' });
    expect(screen.getByText('NO HAY UNIDADES ACTIVAS')).toBeInTheDocument();
  });

  it('fires onCardClick with the clicked item', () => {
    const onCardClick = vi.fn();
    renderCards({ onCardClick });
    fireEvent.click(screen.getByText('PIIC-201'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).toHaveBeenCalledWith(UNITS[1]);
  });

  it('renders clickable cards as real buttons (accesibilidad táctil)', () => {
    renderCards({ onCardClick: vi.fn() });
    const cards = screen.getAllByTestId('archon-card-item');
    cards.forEach((card) => {
      expect(card.tagName).toBe('BUTTON');
      expect(card).toHaveAttribute('type', 'button');
    });
  });

  it('renders non-clickable cards as articles, not buttons', () => {
    renderCards();
    screen.getAllByTestId('archon-card-item').forEach((card) => {
      expect(card.tagName).toBe('ARTICLE');
    });
  });

  it('uses a responsive grid container without internal horizontal scroll', () => {
    renderCards();
    const grid = screen.getByTestId('archon-card-view');
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('grid-cols-1');
    screen.getAllByTestId('archon-card-item').forEach((card) => {
      expect(card.className).toContain('overflow-hidden');
      expect(card.className).toContain('min-w-0');
    });
  });
});
