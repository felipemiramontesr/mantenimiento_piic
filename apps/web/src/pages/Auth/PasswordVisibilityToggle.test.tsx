import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PasswordVisibilityToggle from './PasswordVisibilityToggle';

describe('PasswordVisibilityToggle', () => {
  it('muestra el ícono/label de "Mostrar" cuando visible=false', () => {
    render(<PasswordVisibilityToggle visible={false} onToggle={vi.fn()} targetId="pw" />);
    expect(screen.getByRole('button', { name: /mostrar contraseña/i })).toBeInTheDocument();
  });

  it('muestra el ícono/label de "Ocultar" cuando visible=true', () => {
    render(<PasswordVisibilityToggle visible onToggle={vi.fn()} targetId="pw" />);
    expect(screen.getByRole('button', { name: /ocultar contraseña/i })).toBeInTheDocument();
  });

  it('llama a onToggle al hacer click', () => {
    const onToggle = vi.fn();
    render(<PasswordVisibilityToggle visible={false} onToggle={onToggle} targetId="pw" />);
    fireEvent.click(screen.getByTestId('pw-toggle-visibility'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('es un <button type="button"> (no dispara submit del formulario que lo contiene)', () => {
    render(<PasswordVisibilityToggle visible={false} onToggle={vi.fn()} targetId="pw" />);
    expect(screen.getByTestId('pw-toggle-visibility')).toHaveAttribute('type', 'button');
  });
});
