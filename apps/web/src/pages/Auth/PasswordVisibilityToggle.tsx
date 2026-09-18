import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordVisibilityToggleProps {
  readonly visible: boolean;
  readonly onToggle: () => void;
  readonly targetId: string;
}

/** FC184 F3 (Scenario 4) — botón de ojo abrir/cerrar, posicionado absoluto dentro del contenedor
 *  relativo del input. Compartido por Login y Signup para no duplicar el mismo botón dos veces. */
export default function PasswordVisibilityToggle({
  visible,
  onToggle,
  targetId,
}: PasswordVisibilityToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-controls={targetId}
      data-testid={`${targetId}-toggle-visibility`}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-pinnacle-navy/40 hover:text-pinnacle-navy/70 transition-colors"
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
