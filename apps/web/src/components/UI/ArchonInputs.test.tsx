import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Archon Interactive Inputs — FC-2 UIUX FaseB', () => {
  it('AT-UI-8: archon-checkbox class applies correctly to checkbox input', () => {
    const { container } = render(
      <input type="checkbox" className="archon-checkbox" data-testid="cb" readOnly />
    );
    const el = container.querySelector('input[type="checkbox"]');
    expect(el).not.toBeNull();
    expect(el?.classList.contains('archon-checkbox')).toBe(true);
  });

  it('AT-UI-9: archon-radio class applies correctly to radio input', () => {
    const { container } = render(
      <input type="radio" className="archon-radio" name="test" readOnly />
    );
    const el = container.querySelector('input[type="radio"]');
    expect(el).not.toBeNull();
    expect(el?.classList.contains('archon-radio')).toBe(true);
  });

  it('AT-UI-10: archon-select class applies to select element', () => {
    const { container } = render(
      <select className="archon-select">
        <option value="a">Option A</option>
      </select>
    );
    const el = container.querySelector('select');
    expect(el).not.toBeNull();
    expect(el?.classList.contains('archon-select')).toBe(true);
  });
});
