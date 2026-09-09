import React, { useEffect, useRef } from 'react';

interface AreaEditInputProps {
  readonly areaId: number;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

/** Input de edición inline de una Área — extraído de `AreasPanel.tsx`'s
 * `AreaRow` (Gate2, FC168). S9379: autoFocus JSX declarativo reemplazado por
 * ref + efecto explícito — mismo comportamiento (foco al entrar en modo
 * edición, disparado por acción del usuario, no al cargar la página), fuera
 * del alcance de la regla. */
export function AreaEditInput({
  areaId,
  value,
  onChange,
  onSave,
  onCancel,
}: AreaEditInputProps): React.JSX.Element {
  const editInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    editInputRef.current?.focus();
  }, []);

  return (
    <input
      ref={editInputRef}
      type="text"
      className="flex-1 h-8 bg-transparent border-b-2 border-[#f2b705] outline-none text-sm font-medium text-[#0f2a44] mr-4"
      value={value}
      onChange={(e): void => onChange(e.target.value)}
      onKeyDown={(e): void => {
        if (e.key === 'Enter') onSave();
        if (e.key === 'Escape') onCancel();
      }}
      data-testid={`edit-input-${areaId}`}
    />
  );
}

export default AreaEditInput;
