import React, { useState, useEffect } from 'react';
import { MapPin, ShieldAlert, User, Clock, Gauge } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import RouteAssignmentForm from '../../components/Routes/RouteAssignmentForm';
import RouteLogTable, { RouteLog } from '../../components/Routes/RouteLogTable';
import ForensicJournalTable from '../../components/Routes/ForensicJournalTable';
import ArchonAdaptiveView from '../../components/Common/ArchonAdaptiveView';
import ArchonCardView, { CardMetricRow } from '../../components/Common/ArchonCardView';
import useRouteLogs from '../../hooks/useRouteLogs';
import { useUsers } from '../../context/UserContext';
import { useFleet } from '../../context/FleetContext';
import { formatDateTime } from '../../utils/dateUtils';

export type RoutePanel = 'LOGS' | 'DISPATCH' | 'JOURNAL';

// FC 078 F2(a) — receta v2: header+badge de estado, operador/misión,
// telemetría KM y hora de salida. Wrapper en el módulo (RouteLogTable.tsx
// NO se toca — mismo hook useRouteLogs, cache-first vía archonCache, así
// que alternar TABLE/CARDS no dispara doble-fetch real).
const renderRouteCardContent = (
  log: RouteLog,
  users: ReturnType<typeof useUsers>['users'],
  units: ReturnType<typeof useFleet>['units'],
  onEdit: (l: RouteLog) => void
): React.ReactNode => {
  const operator = users.find((u) => u.id === String(log.operator_id));
  const unit = units.find((u) => u.id === log.unit_id);
  const isFinished = !!log.end_time;
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-pinnacle-navy text-archon-md truncate">{log.unit_id}</span>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-[4px] text-archon-xs font-bold uppercase tracking-widest ${
            isFinished ? 'bg-emerald-500/10 text-emerald-700' : 'bg-sky-500/10 text-sky-700'
          }`}
        >
          {isFinished ? 'Finalizada' : 'En Ruta'}
        </span>
      </div>
      <div className="text-pinnacle-navy/70 text-archon-base truncate">
        {unit?.marca} {unit?.modelo}
      </div>
      <div className="text-pinnacle-navy/40 text-archon-sm uppercase tracking-widest truncate">
        {log.destination}
      </div>
      <div className="flex flex-col gap-1 pt-2 border-t border-pinnacle-navy/5">
        <CardMetricRow
          icon={<User size={12} />}
          label="Operador"
          value={operator?.fullName || 'Staff No Identificado'}
        />
        <CardMetricRow
          icon={<Clock size={12} />}
          label="Salida"
          value={formatDateTime(log.start_time)}
        />
        <CardMetricRow
          icon={<Gauge size={12} />}
          label="KM"
          value={
            log.end_km !== null && log.end_km !== undefined
              ? `${log.start_km?.toLocaleString() || '0'} → ${log.end_km.toLocaleString()}`
              : `${log.start_km?.toLocaleString() || '0'} (en curso)`
          }
        />
      </div>
      <button
        type="button"
        onClick={(): void => onEdit(log)}
        className="self-start px-3 py-1.5 rounded-[4px] bg-emerald-50 text-emerald-700 text-archon-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-colors"
      >
        Editar Ruta
      </button>
    </div>
  );
};

const RouteCardPanel: React.FC<{ onEdit: (l: RouteLog) => void }> = ({ onEdit }) => {
  const { logs } = useRouteLogs();
  const { users } = useUsers();
  const { units } = useFleet();

  return (
    <ArchonCardView<RouteLog>
      items={logs}
      keyExtractor={(log): string => log.uuid}
      renderCard={(log): React.ReactNode => renderRouteCardContent(log, users, units, onEdit)}
      emptyMessage="SIN RUTAS REGISTRADAS"
    />
  );
};

/**
 * 🚀 ARCHON ROUTES MODULE (v.38.3.0)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 * Refinement: Single Mutating Header Card (Mirror FleetModule DNA)
 */
const RoutesModule: React.FC = (): React.JSX.Element => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<RoutePanel>('LOGS');
  const [editingRoute, setEditingRoute] = useState<RouteLog | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const scrollToPanel = (): void => {
    if (panelRef.current?.scrollIntoView) {
      setTimeout((): void => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleEdit = (route: RouteLog): void => {
    setEditingRoute(route);
    setActivePanel('DISPATCH');
    scrollToPanel();
  };

  const handleReturnToLogs = (): void => {
    setEditingRoute(null);
    setActivePanel('LOGS');
  };

  useEffect(() => {
    const isEditing = activePanel === 'DISPATCH' || !!editingRoute;

    setSectionData(
      editingRoute ? `Rectificación: ${editingRoute.id}` : 'Administrar Rutas',
      editingRoute
        ? 'Protocolo de Rectificación Logística Archon'
        : 'Despacho Logístico, Control de Tránsito & Auditoría Forense',
      null,
      {
        variant: isEditing ? 'navy' : 'emerald',
        headerTitle: isEditing ? 'Cancelar' : 'Despacho de Ruta',
        HeaderIcon: isEditing ? ShieldAlert : MapPin,
        PayloadIcon: isEditing ? ShieldAlert : MapPin,
        actionTitle: isEditing ? 'Retorno' : 'Asignar',
        description: isEditing ? 'Cancelar Asignación' : 'Control de Tránsito',
        buttonText: isEditing ? 'Cerrar Formulario' : 'Iniciar Despacho',
        isActive: isEditing,
        onClick: () => {
          if (editingRoute) {
            handleReturnToLogs();
          } else {
            setActivePanel(activePanel === 'DISPATCH' ? 'LOGS' : 'DISPATCH');
            scrollToPanel();
          }
        },
      }
    );
  }, [editingRoute, activePanel, setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {activePanel === 'LOGS' && (
                <ArchonAdaptiveView
                  storageKey="routes-logs"
                  views={{
                    TABLE: <RouteLogTable onEdit={handleEdit} />,
                    CARDS: <RouteCardPanel onEdit={handleEdit} />,
                  }}
                />
              )}

              {activePanel === 'DISPATCH' && (
                <RouteAssignmentForm onClose={handleReturnToLogs} routeToEdit={editingRoute} />
              )}

              {activePanel === 'JOURNAL' && <ForensicJournalTable />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RoutesModule;
