import React from 'react';
import { computePasswordStrength } from './passwordStrength';

interface PasswordStrengthMeterProps {
  readonly password: string;
}

const LEVEL_COLOR: readonly string[] = [
  'bg-red-600',
  'bg-red-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-green-600',
];

/** Barra de 4 segmentos + etiqueta + sugerencia — FC184 F3 (Scenario 3). No se muestra con la
 *  contraseña vacía (nada que medir todavía). */
export default function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps): React.JSX.Element | null {
  if (password.length === 0) return null;
  const { level, label, suggestion } = computePasswordStrength(password);
  const filledSegments = level === 0 ? 1 : level;

  return (
    <div className="mt-1" data-testid="signup-password-strength">
      <div className="flex gap-1 h-1.5">
        {[0, 1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={`flex-1 rounded-full ${
              segment < filledSegments ? LEVEL_COLOR[level] : 'bg-pinnacle-navy/10'
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-bold text-pinnacle-navy/60 mt-1">
        {label} — <span className="font-normal opacity-80">{suggestion}</span>
      </p>
    </div>
  );
}
