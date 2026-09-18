import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PasswordStrengthMeter from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('no renderiza nada con la contraseña vacía', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra la etiqueta "Muy débil" para una contraseña corta', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByTestId('signup-password-strength')).toHaveTextContent('Muy débil');
  });

  it('muestra la etiqueta "Muy fuerte" para una contraseña larga y diversa', () => {
    render(<PasswordStrengthMeter password="Abcdefghij123!" />);
    expect(screen.getByTestId('signup-password-strength')).toHaveTextContent('Muy fuerte');
  });

  it('actualiza la etiqueta al re-renderizar con una contraseña distinta', () => {
    const { rerender } = render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByTestId('signup-password-strength')).toHaveTextContent('Muy débil');

    rerender(<PasswordStrengthMeter password="Abcdefghij123!" />);
    expect(screen.getByTestId('signup-password-strength')).toHaveTextContent('Muy fuerte');
  });
});
