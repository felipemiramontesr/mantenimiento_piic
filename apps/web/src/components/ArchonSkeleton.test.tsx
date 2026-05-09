import { describe, it, expect } from 'vitest';
import { render } from '../test/testUtils';
import { ArchonSkeleton, ArchonCardSkeleton, ArchonTableSkeleton } from './ArchonSkeleton';

describe('ArchonSkeleton Components', () => {
  it('renders ArchonSkeleton with defaults', (): void => {
    const { container } = render(<ArchonSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('20px');
  });

  it('renders ArchonSkeleton with custom props', (): void => {
    const { container } = render(
      <ArchonSkeleton width={200} height={40} borderRadius="8px" className="custom" />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('40px');
    expect(el.style.borderRadius).toBe('8px');
  });

  it('renders ArchonCardSkeleton', (): void => {
    const { container } = render(<ArchonCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders ArchonTableSkeleton with default rows', (): void => {
    const { container } = render(<ArchonTableSkeleton />);
    const rows = container.querySelectorAll('.flex.space-x-4');
    expect(rows.length).toBe(5);
  });

  it('renders ArchonTableSkeleton with custom rows', (): void => {
    const { container } = render(<ArchonTableSkeleton rows={3} />);
    const rows = container.querySelectorAll('.flex.space-x-4');
    expect(rows.length).toBe(3);
  });
});
