import React, { useState, useEffect } from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import RouteManagementCards, { RoutePanel } from '../../components/Routes/RouteManagementCards';
import RouteAssignmentForm from '../../components/Routes/RouteAssignmentForm';
import RouteLogTable, { RouteLog } from '../../components/Routes/RouteLogTable';
import ForensicJournalTable from '../../components/Routes/ForensicJournalTable';

/**
 * 🚀 ARCHON ROUTES MODULE (v.36.6.2)
 * Version: 38.1.0 - Sovereign Forensic Standard
 * Purpose: Central command for Route Dispatch & Logistics.
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */
const RoutesModule: React.FC = (): React.JSX.Element => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<RoutePanel>('LOGS');
  const [editingRoute, setEditingRoute] = useState<RouteLog | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const scrollToPanel = (): void => {
    const element = panelRef.current;
    if (element) {
      setTimeout(() => {
        const chassis = element.closest('.archon-workspace-chassis') as HTMLElement;
        if (chassis) {
          const chassisRect = chassis.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const relativeTop = elementRect.top - chassisRect.top + chassis.scrollTop;
          const targetPosition = relativeTop - 12;

          chassis.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        }
      }, 300);
    }
  };

  const handleAction = (action: 'DESPACHO' | 'BITACORA' | 'FORENSE'): void => {
    if (action === 'DESPACHO') {
      setEditingRoute(null);
      setActivePanel('DISPATCH');
      scrollToPanel();
    } else if (action === 'FORENSE') {
      setActivePanel('JOURNAL');
      scrollToPanel();
    } else {
      setActivePanel('LOGS');
      scrollToPanel();
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
    setSectionData(
      editingRoute ? `Rectificación: ${editingRoute.id}` : 'Administrar Rutas',
      editingRoute
        ? 'Protocolo de Rectificación Logística Archon'
        : 'Despacho Logístico, Control de Tránsito & Auditoría Forense',
      <RouteManagementCards
        activePanel={activePanel}
        onPanelChange={(p): void => {
          setActivePanel(p);
          scrollToPanel();
        }}
        onAction={handleAction}
      />
    );
  }, [editingRoute, activePanel, setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR (Action Cards) */}
      <section className="archon-workspace-chassis">
        <div className="flex flex-col gap-4 pb-[60vh]">
          {/* 📊 CONTENIDO DINÁMICO DE PANEL INTEGRADO */}
          <div ref={panelRef} className="scroll-mt-6">
            {activePanel === 'LOGS' && <RouteLogTable onEdit={handleEdit} />}

            {activePanel === 'DISPATCH' && (
              <RouteAssignmentForm onClose={handleReturnToLogs} routeToEdit={editingRoute} />
            )}

            {activePanel === 'JOURNAL' && <ForensicJournalTable />}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RoutesModule;
