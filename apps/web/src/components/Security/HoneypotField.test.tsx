import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HoneypotField, { HONEYPOT_FIELD, readHoneypot } from './HoneypotField';

/** FC201 F2 · HP3 — campo trampa compartido por signup y login. */
describe('HoneypotField', () => {
  it('queda fuera de la vista, sin foco por teclado, oculto a lectores y sin autocompletar', () => {
    render(<HoneypotField id="t-website" testId="t-honeypot" />);

    const input = screen.getByTestId('t-honeypot');
    expect(input).toHaveAttribute('name', HONEYPOT_FIELD);
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveValue('');
    expect(input.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('readHoneypot devuelve lo escrito en la trampa', () => {
    const { container } = render(
      <form>
        <HoneypotField id="t-website" testId="t-honeypot" />
      </form>
    );
    const form = container.querySelector('form') as HTMLFormElement;
    (screen.getByTestId('t-honeypot') as HTMLInputElement).value = 'http://spam';

    expect(readHoneypot(form)).toBe('http://spam');
  });

  it('readHoneypot devuelve "" si el formulario no tiene la trampa', () => {
    const { container } = render(<form />);

    expect(readHoneypot(container.querySelector('form') as HTMLFormElement)).toBe('');
  });
});
