import React, { useState, useEffect } from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import RouteAssignmentForm from '../../components/Routes/RouteAssignmentForm';
import RouteLogTable, { RouteLog } from '../../components/Routes/RouteLogTable';
import ForensicJournalTable from '../../components/Routes/ForensicJournalTable';

export type RoutePanel = 'LOGS' | 'DISPATCH' | 'JOURNAL';

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
              {activePanel === 'LOGS' && <RouteLogTable onEdit={handleEdit} />}

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
