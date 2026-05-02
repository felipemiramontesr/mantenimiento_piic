import React, { useState } from 'react';
import { Navigation } from 'lucide-react';
import { BRANDING_NAME } from '../../constants/versionConstants';
import RouteManagementCards, { RoutePanel } from '../../components/Routes/RouteManagementCards';
import RouteAssignmentForm from '../../components/Routes/RouteAssignmentForm';
import RouteLogTable, { RouteLog } from '../../components/Routes/RouteLogTable';
import ForensicJournalTable from '../../components/Routes/ForensicJournalTable';

/**
 * 🚀 ARCHON ROUTES MODULE (v.36.6.2)
 * Version: 38.1.0 - Sovereign Forensic Standard
 * Purpose: Central command for Route Dispatch & Logistics.
 */
const RoutesModule: React.FC = (): React.JSX.Element => {
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

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Panel: Operational Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <Navigation size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                Administrar Rutas
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Despacho Logístico, Control de Tránsito & Auditoría Forense
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Symmetrical placeholder */}
          </div>
        </div>
      </header>

      {/* 📊 BODY MODULAR (Action Cards) */}
      <section className="archon-workspace-chassis">
        <div className="flex flex-col gap-12 pb-[60vh]">
          <RouteManagementCards
            activePanel={activePanel}
            onPanelChange={(p): void => {
              setActivePanel(p);
              scrollToPanel();
            }}
            onAction={handleAction}
          />

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

      {/* 📜 FOOTER (Sovereign Standards) */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">{BRANDING_NAME} ArchonCore Alpha Engine 38.9.0</p>
      </footer>
    </main>
  );
};

export default RoutesModule;
