import React, { useState } from 'react';
import { Navigation } from 'lucide-react';
import { BRANDING_NAME } from '../../constants/versionConstants';
import RouteManagementCards, { RoutePanel } from '../../components/Routes/RouteManagementCards';
import RouteAssignmentForm from '../../components/Routes/RouteAssignmentForm';
import RouteLogTable, { RouteLog } from '../../components/Routes/RouteLogTable';

/**
 * 🚀 ARCHON ROUTES MODULE (v.36.6.2)
 * Version: 37.1.2 - Sovereign Senior Standard
 * Purpose: Central command for Route Dispatch & Logistics.
 * Update: Integrated Form Architecture for Design Cohesion.
 */
const RoutesModule: React.FC = (): React.JSX.Element => {
  const [activePanel, setActivePanel] = useState<RoutePanel>('LOGS');
  const [editingRoute, setEditingRoute] = useState<RouteLog | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const scrollToPanel = (): void => {
    const element = panelRef.current;
    if (element) {
      setTimeout(() => {
        // Dynamic Phase-Transition Scroll (v.38.6.0)
        const chassis = element.closest('.archon-workspace-chassis');
        const cards = chassis?.querySelector('.archon-grid-2') as HTMLElement;

        if (chassis && cards) {
          // Logic: Find the exact bottom of the cards and add half of the 48px gap (24px)
          const cardsBottom = cards.offsetTop + cards.offsetHeight;
          const targetPosition = cardsBottom + 24;

          chassis.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });
        }
      }, 300);
    }
  };

  const handleAction = (action: 'DESPACHO' | 'BITACORA'): void => {
    if (action === 'DESPACHO') {
      setEditingRoute(null);
      setActivePanel('DISPATCH');
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
              Despacho Logístico, Control de Tránsito & Histórico de Operaciones
            </p>
          </div>

          {/* Right Panel: Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-0.03em',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#0f2a44',
              }}
            >
              Archon
            </h1>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '4px',
                border: '2px solid #f2b705',
                backgroundColor: '#0f2a44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path
                  d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
                  stroke="#f2b705"
                  strokeWidth="16"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* 📊 BODY MODULAR (Action Cards) */}
      <section className="archon-workspace-chassis">
        <div className="flex flex-col gap-12">
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
          </div>
        </div>
      </section>

      {/* 📜 FOOTER (Sovereign Standards) */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">{BRANDING_NAME} ArchonCore Alpha Engine 38.6.0</p>
      </footer>
    </main>
  );
};

export default RoutesModule;
