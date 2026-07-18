import React from 'react';

/**
 * 🔱 Archon Component: ArchonCardView (FC 041 Fase B)
 * Vista de tarjetas responsivas táctiles para ArchonAdaptiveView — PWA-Ready.
 *
 * Genérico y sin lógica de negocio: el módulo anfitrión provee items,
 * keyExtractor y renderCard. Grid CSS responsivo (1→2→3 columnas), tarjetas
 * sin scroll horizontal interno (min-w-0 + overflow-hidden), objetivos
 * táctiles ≥44px. Tarjetas clickeables = <button> real (teclado + lector);
 * sin handler = <article> semántico.
 */

export interface ArchonCardViewProps<T> {
  items: T[];
  keyExtractor: (item: T) => string | number;
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
  emptyMessage?: string;
}

const CARD_BASE_CLASSES =
  'min-w-0 overflow-hidden min-h-[44px] w-full text-left bg-white ' +
  'border border-pinnacle-navy/10 rounded-[4px] p-4 shadow-sm transition-all';

/**
 * FC 078 F2(b) — Receta v2 de tarjeta (reciclaje de diseño, doctrina del AN):
 * header (identidad + badge de estado) → línea secundaria (identidad 2) →
 * 2-4 `CardMetricRow` (odómetro/rol, salud/próximo evento, etc.) →
 * `CardAlertBadge` opcional cuando hay alerta activa. Mismo recipiente para
 * Fleet/Users/Maintenance — solo cambian los datos de dominio.
 */
export interface CardMetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

export const CardMetricRow: React.FC<CardMetricRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-2 min-w-0">
    <span className="flex items-center gap-1.5 text-pinnacle-navy/40 text-archon-xs uppercase tracking-widest shrink-0">
      {icon}
      {label}
    </span>
    <span className="text-pinnacle-navy/80 text-archon-sm font-bold truncate text-right">
      {value}
    </span>
  </div>
);

export type CardAlertTone = 'critical' | 'warning';

const ALERT_TONE_CLASSES: Record<CardAlertTone, string> = {
  critical: 'bg-red-500/10 text-red-700 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-400/30',
};

export interface CardAlertBadgeProps {
  tone: CardAlertTone;
  children: React.ReactNode;
}

export const CardAlertBadge: React.FC<CardAlertBadgeProps> = ({ tone, children }) => (
  <div
    data-testid="card-alert-badge"
    className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] border text-archon-xs font-bold uppercase tracking-widest ${ALERT_TONE_CLASSES[tone]}`}
  >
    {children}
  </div>
);

function ArchonCardView<T>({
  items,
  keyExtractor,
  renderCard,
  onCardClick,
  emptyMessage = 'SIN REGISTROS DISPONIBLES',
}: ArchonCardViewProps<T>): React.ReactElement {
  if (items.length === 0) {
    return (
      <div
        data-testid="archon-card-view-empty"
        className="flex items-center justify-center py-12 text-pinnacle-navy/40 font-display font-black text-archon-md uppercase tracking-[0.2em]"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      data-testid="archon-card-view"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 touch-manipulation"
    >
      {items.map((item) =>
        onCardClick ? (
          <button
            key={keyExtractor(item)}
            type="button"
            data-testid="archon-card-item"
            onClick={(): void => onCardClick(item)}
            className={`${CARD_BASE_CLASSES} hover:border-pinnacle-yellow hover:shadow-md active:shadow-sm cursor-pointer`}
          >
            {renderCard(item)}
          </button>
        ) : (
          <article
            key={keyExtractor(item)}
            data-testid="archon-card-item"
            className={CARD_BASE_CLASSES}
          >
            {renderCard(item)}
          </article>
        )
      )}
    </div>
  );
}

export default ArchonCardView;
