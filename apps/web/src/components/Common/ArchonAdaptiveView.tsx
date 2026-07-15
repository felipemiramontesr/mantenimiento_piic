import React, { useState } from 'react';
import { Table, LayoutGrid, CalendarDays, PieChart } from 'lucide-react';

/**
 * 🔱 Archon Component: ArchonAdaptiveView (FC 041 Fase A)
 * Contenedor adaptativo de listados — alterna entre Tabla, Tarjetas,
 * Calendario y Gráficos con persistencia de preferencia en localStorage.
 *
 * Dominio cerrado (Regla 22): {TABLE, CARDS, CALENDAR, CHARTS}. Todo valor
 * persistido fuera del dominio o no provisto por el anfitrión cae a TABLE
 * (fail-safe — lección FC 071: jamás confiar en datos externos sin fallback).
 * T2 InitialView: preferencia válida > default por viewport (móvil→CARDS).
 */

export type AdaptiveViewKind = 'TABLE' | 'CARDS' | 'CALENDAR' | 'CHARTS';

export interface ArchonAdaptiveViewProps {
  /** Sufijo de la clave localStorage — un scope por módulo anfitrión. */
  storageKey: string;
  /** Vistas provistas por el anfitrión; TABLE es obligatoria. */
  views: Partial<Record<AdaptiveViewKind, React.ReactNode>> & { TABLE: React.ReactNode };
}

const STORAGE_PREFIX = 'archon_adaptive_view_';
const MOBILE_QUERY = '(max-width: 767px)'; // < md de Tailwind

const VIEW_META: Record<AdaptiveViewKind, { label: string; Icon: typeof Table }> = {
  TABLE: { label: 'Tabla', Icon: Table },
  CARDS: { label: 'Tarjetas', Icon: LayoutGrid },
  CALENDAR: { label: 'Calendario', Icon: CalendarDays },
  CHARTS: { label: 'Gráficos', Icon: PieChart },
};

const VIEW_ORDER: AdaptiveViewKind[] = ['TABLE', 'CARDS', 'CALENDAR', 'CHARTS'];

export function resolveInitialView(
  stored: string | null,
  isMobile: boolean,
  available: AdaptiveViewKind[]
): AdaptiveViewKind {
  if (stored !== null && available.includes(stored as AdaptiveViewKind)) {
    return stored as AdaptiveViewKind; // T2: preferencia válida gana siempre
  }
  if (isMobile && available.includes('CARDS')) return 'CARDS'; // T2 fila ⊥⊤
  return 'TABLE'; // T2 fila ⊥⊥ + fallback de dominio cerrado
}

const ArchonAdaptiveView: React.FC<ArchonAdaptiveViewProps> = ({ storageKey, views }) => {
  const fullKey = `${STORAGE_PREFIX}${storageKey}`;
  const available = VIEW_ORDER.filter((kind) => views[kind] !== undefined);

  const [activeView, setActiveView] = useState<AdaptiveViewKind>(() => {
    const isMobile =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(MOBILE_QUERY).matches
        : false;
    return resolveInitialView(localStorage.getItem(fullKey), isMobile, available);
  });

  const selectView = (kind: AdaptiveViewKind): void => {
    setActiveView(kind);
    localStorage.setItem(fullKey, kind);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-end gap-1"
        role="group"
        aria-label="Formato de vista"
      >
        {available.map((kind) => {
          const { label, Icon } = VIEW_META[kind];
          const isActive = kind === activeView;
          return (
            <button
              key={kind}
              type="button"
              data-testid={`adaptive-view-${kind.toLowerCase()}`}
              aria-pressed={isActive}
              title={label}
              onClick={(): void => selectView(kind)}
              className={`flex items-center justify-center gap-2 px-3 h-11 min-w-11 rounded-[4px] text-archon-base font-black uppercase tracking-widest transition-all ${
                isActive
                  ? 'bg-pinnacle-navy text-white shadow-sm'
                  : 'bg-pinnacle-navy/5 text-pinnacle-navy/60 hover:bg-pinnacle-navy/10 hover:text-pinnacle-navy'
              }`}
            >
              <Icon size={14} strokeWidth={2.5} />
              <span className="hidden md:inline">{label}</span>
            </button>
          );
        })}
      </div>
      <div data-testid="adaptive-view-content">{views[activeView] ?? views.TABLE}</div>
    </div>
  );
};

export default ArchonAdaptiveView;
