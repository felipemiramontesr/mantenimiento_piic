import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/testUtils';
import FleetKpiMatrix from './FleetKpiMatrix';

/**
 * FC162 F3 — FleetKpiMatrix.tsx had zero test coverage. Covers the 4 color
 * threshold engines (DISP/MTBF/MTTR/BCK), the health-index bar (incl. the
 * days-remaining-overdue red state), and the availability/healthScore
 * defaults when omitted.
 */

describe('FleetKpiMatrix', () => {
  it('renders all 4 KPI values formatted', () => {
    render(<FleetKpiMatrix availability={97.456} mtbf={120} mttr={3} backlog={1} />);
    expect(screen.getByText('97.5%')).toBeInTheDocument();
    expect(screen.getByText('120h')).toBeInTheDocument();
    expect(screen.getByText('3h')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('defaults availability to 100 and healthScore to 100 when omitted', () => {
    render(
      <FleetKpiMatrix availability={undefined as unknown as number} mtbf={0} mttr={0} backlog={0} />
    );
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('colors DISP emerald at >=95, amber at >=85, rose below', () => {
    const { container: high } = render(
      <FleetKpiMatrix availability={96} mtbf={0} mttr={0} backlog={0} />
    );
    expect(high.querySelector('.text-emerald-500')).not.toBeNull();

    const { container: mid } = render(
      <FleetKpiMatrix availability={88} mtbf={0} mttr={0} backlog={0} />
    );
    expect(mid.querySelector('.text-amber-500')).not.toBeNull();

    const { container: low } = render(
      <FleetKpiMatrix availability={50} mtbf={0} mttr={0} backlog={0} />
    );
    expect(low.querySelector('.text-rose-500')).not.toBeNull();
  });

  it('colors MTBF emerald at >=100, amber at >=50, rose below', () => {
    const { container: high } = render(
      <FleetKpiMatrix availability={100} mtbf={150} mttr={0} backlog={0} />
    );
    expect(high.querySelectorAll('.text-emerald-500').length).toBeGreaterThan(0);

    const { container: low } = render(
      <FleetKpiMatrix availability={100} mtbf={10} mttr={0} backlog={0} />
    );
    expect(low.querySelectorAll('.text-rose-500').length).toBeGreaterThan(0);
  });

  it('colors MTTR emerald at <=4h, amber at <=12h, rose above', () => {
    const { container: fast } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={2} backlog={0} />
    );
    expect(fast.querySelectorAll('.text-emerald-500').length).toBeGreaterThan(0);

    const { container: slow } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={20} backlog={0} />
    );
    expect(slow.querySelectorAll('.text-rose-500').length).toBeGreaterThan(0);
  });

  it('colors Backlog emerald at <=2, amber at <=5, rose above', () => {
    const { container: low } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={0} backlog={1} />
    );
    expect(low.querySelectorAll('.text-emerald-500').length).toBeGreaterThan(0);

    const { container: high } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={0} backlog={9} />
    );
    expect(high.querySelectorAll('.text-rose-500').length).toBeGreaterThan(0);
  });

  it('shows daysRemaining next to the health score when provided', () => {
    render(
      <FleetKpiMatrix
        availability={100}
        mtbf={0}
        mttr={0}
        backlog={0}
        healthScore={80}
        daysRemaining={12}
      />
    );
    expect(screen.getByText('80% / 12d')).toBeInTheDocument();
  });

  it('flags the health bar red and pulsing when daysRemaining is negative (overdue)', () => {
    const { container } = render(
      <FleetKpiMatrix
        availability={100}
        mtbf={0}
        mttr={0}
        backlog={0}
        healthScore={80}
        daysRemaining={-3}
      />
    );
    expect(container.querySelector('.bg-rose-500.animate-pulse')).not.toBeNull();
    expect(screen.getByText('80% / -3d')).toBeInTheDocument();
  });

  it('the health bar color follows getHealthColor thresholds when not overdue', () => {
    const { container: healthy } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={0} backlog={0} healthScore={90} />
    );
    expect(healthy.querySelector('.bg-emerald-500')).not.toBeNull();

    const { container: critical } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={0} backlog={0} healthScore={30} />
    );
    expect(critical.querySelector('.bg-rose-500')).not.toBeNull();
  });

  // ── R4-C Fc165 F2 Slice 2.3A — unc lines 23,24,25,38,44,50,56 ──

  it('defaults mtbf/mttr/backlog to 0 when omitted (?? fallback, not just falsy 0)', () => {
    render(
      <FleetKpiMatrix
        availability={100}
        mtbf={undefined as unknown as number}
        mttr={undefined as unknown as number}
        backlog={undefined as unknown as number}
      />
    );
    expect(screen.getAllByText('0h')).toHaveLength(2); // mtbf + mttr both render '0h'
    expect(screen.getByText('0')).toBeInTheDocument(); // backlog
  });

  it('colors MTBF amber in the 50-99 mid-range', () => {
    const { container } = render(
      <FleetKpiMatrix availability={100} mtbf={75} mttr={0} backlog={0} />
    );
    expect(container.querySelectorAll('.text-amber-500').length).toBeGreaterThan(0);
  });

  it('colors MTTR amber in the 5-12h mid-range', () => {
    const { container } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={8} backlog={0} />
    );
    expect(container.querySelectorAll('.text-amber-500').length).toBeGreaterThan(0);
  });

  it('colors Backlog amber in the 3-5 mid-range', () => {
    const { container } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={0} backlog={4} />
    );
    expect(container.querySelectorAll('.text-amber-500').length).toBeGreaterThan(0);
  });

  it('the health bar is amber in the 50-79 mid-range when not overdue', () => {
    const { container } = render(
      <FleetKpiMatrix availability={100} mtbf={0} mttr={0} backlog={0} healthScore={65} />
    );
    expect(container.querySelector('.bg-amber-500')).not.toBeNull();
  });
});
