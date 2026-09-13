import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * FC172 F1 — System_Settings_App_Launcher_Tiles.
 * Primitivo reutilizable estilo Odoo App-Launcher: ícono + título +
 * descripción + badge de estado, en una tarjeta clickeable (solo cuando
 * `status='active'` y hay `onClick`). Usado inicialmente en
 * `SystemSettingsModule.tsx` (Universo FMS + Consola Soberana), pensado
 * para reutilizarse en cualquier futura grilla de capacidades/apps.
 */

export type ArchonAppTileStatus = 'active' | 'coming_soon' | 'disabled';

export interface ArchonAppTileProps {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly badge?: string;
  readonly status: ArchonAppTileStatus;
  readonly onClick?: () => void;
  readonly dataTestId?: string;
}

const DEFAULT_BADGE: Record<ArchonAppTileStatus, string | null> = {
  active: null,
  coming_soon: 'Próximamente',
  disabled: 'Deshabilitado',
};

function tileClassName(interactive: boolean): string {
  if (!interactive) {
    return 'relative flex flex-col gap-2 p-4 min-h-[96px] rounded-[4px] border border-slate-100 bg-slate-50/60 text-left cursor-default opacity-70';
  }
  return 'group relative flex flex-col gap-2 p-4 min-h-[96px] rounded-[4px] border border-pinnacle-navy/10 bg-white text-left cursor-pointer transition-all duration-200 hover:border-pinnacle-yellow hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-pinnacle-yellow';
}

interface TileBadgeProps {
  readonly text: string;
}

function TileBadge({ text }: TileBadgeProps): React.JSX.Element {
  return (
    <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-pinnacle-navy/5 text-pinnacle-navy/50">
      {text}
    </span>
  );
}

/**
 * Tarjeta-tile de capacidad/app, estilo Odoo App-Launcher (FC172).
 * S6819 (SonarCloud) — usa `<button>` nativo en vez de `role="button"` sobre
 * un `<div>`: un `<button disabled>` ya es focuseable-cero, teclado-inerte y
 * 0-click de forma nativa, así que no hace falta `tabIndex`/`aria-disabled`/
 * manejo manual de Enter-Espacio — el navegador lo hace gratis y de forma
 * más accesible.
 */
export default function ArchonAppTile({
  id,
  title,
  description,
  icon: Icon,
  badge,
  status,
  onClick,
  dataTestId,
}: ArchonAppTileProps): React.JSX.Element {
  const interactive = status === 'active' && Boolean(onClick);
  const resolvedBadge = badge ?? DEFAULT_BADGE[status];

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      className={tileClassName(interactive)}
      data-testid={dataTestId ?? `app-tile-${id}`}
    >
      <div className="w-10 h-10 rounded-[4px] bg-pinnacle-navy/5 flex items-center justify-center transition-colors group-hover:bg-pinnacle-yellow/10">
        <Icon size={20} className="text-pinnacle-navy" />
      </div>
      <div>
        <h4 className="text-sm font-black text-pinnacle-navy">{title}</h4>
        <p className="text-xs text-pinnacle-navy/60">{description}</p>
      </div>
      {resolvedBadge && <TileBadge text={resolvedBadge} />}
    </button>
  );
}
