import React from 'react';

/**
 * FC199 F3 (signup) · FC201 F2 HP3 (login) — campo trampa: una persona no lo ve ni lo llena; un bot
 * que rellena cada campo del formulario, sí. Mismo nombre neutro en ambos formularios (B2).
 */
export const HONEYPOT_FIELD = 'website_url';

interface HoneypotFieldProps {
  readonly id: string;
  readonly testId: string;
}

/** Campo invisible: fuera de pantalla, sin foco por teclado y oculto a lectores de pantalla. */
export default function HoneypotField({ id, testId }: HoneypotFieldProps): React.JSX.Element {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden">
      <label htmlFor={id}>Sitio web</label>
      <input
        id={id}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
        data-testid={testId}
      />
    </div>
  );
}

/** Lo que el formulario trae en el campo trampa (`''` si no existe o no es texto). */
export function readHoneypot(form: HTMLFormElement): string {
  const value = new FormData(form).get(HONEYPOT_FIELD);
  return typeof value === 'string' ? value : '';
}
