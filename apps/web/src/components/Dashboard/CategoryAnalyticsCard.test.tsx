import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
import CategoryAnalyticsCard from './CategoryAnalyticsCard';

/**
 * FC162 F3 — CategoryAnalyticsCard.tsx had zero test coverage. Covers the
 * time-metric formatter (hours vs days threshold at 48h), the availability
 * dot color thresholds (90/75 breakpoints), and the details callback.
 */

const BASE_DATA = {
  count: 12,
  availablePercent: 95,
  maintenanceCount: 2,
  avgMtbf: 30,
  avgMttr: 96,
};

describe('CategoryAnalyticsCard', () => {
  it('renders the title, count, and formatted MTBF/MTTR', () => {
    render(
      <CategoryAnalyticsCard
        title="Vehículos"
        categoryKey="vehiculo"
        accentColor="#0f2a44"
        data={BASE_DATA}
        onViewDetails={vi.fn()}
      />
    );
    expect(screen.getByText('Vehículos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('30h')).toBeInTheDocument(); // < 48h stays in hours
    expect(screen.getByText('4d')).toBeInTheDocument(); // 96h / 24 = 4d
  });

  it('formats a 0-hour metric as "0h"', () => {
    render(
      <CategoryAnalyticsCard
        title="Maquinaria"
        categoryKey="maquinaria"
        accentColor="#f59e0b"
        data={{ ...BASE_DATA, avgMtbf: 0 }}
        onViewDetails={vi.fn()}
      />
    );
    expect(screen.getByText('0h')).toBeInTheDocument();
  });

  it('shows the emerald availability dot at >=90%', () => {
    const { container } = render(
      <CategoryAnalyticsCard
        title="Vehículos"
        categoryKey="vehiculo"
        accentColor="#0f2a44"
        data={{ ...BASE_DATA, availablePercent: 95 }}
        onViewDetails={vi.fn()}
      />
    );
    expect(container.querySelector('.bg-emerald-500')).not.toBeNull();
  });

  it('shows the amber availability dot between 75 and 89%', () => {
    const { container } = render(
      <CategoryAnalyticsCard
        title="Vehículos"
        categoryKey="vehiculo"
        accentColor="#0f2a44"
        data={{ ...BASE_DATA, availablePercent: 80 }}
        onViewDetails={vi.fn()}
      />
    );
    expect(container.querySelector('.bg-amber-500')).not.toBeNull();
  });

  it('shows the red availability dot below 75%', () => {
    const { container } = render(
      <CategoryAnalyticsCard
        title="Vehículos"
        categoryKey="vehiculo"
        accentColor="#0f2a44"
        data={{ ...BASE_DATA, availablePercent: 50 }}
        onViewDetails={vi.fn()}
      />
    );
    expect(container.querySelector('.bg-red-500')).not.toBeNull();
  });

  it('clicking VER DETALLES calls onViewDetails with the categoryKey', () => {
    const onViewDetails = vi.fn();
    render(
      <CategoryAnalyticsCard
        title="Herramientas"
        categoryKey="herramienta"
        accentColor="#8b5cf6"
        data={BASE_DATA}
        onViewDetails={onViewDetails}
      />
    );
    fireEvent.click(screen.getByText('VER DETALLES'));
    expect(onViewDetails).toHaveBeenCalledWith('herramienta');
  });
});
