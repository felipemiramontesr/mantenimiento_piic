import React, { useState } from 'react';
import { Navigation } from 'lucide-react';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';
import RouteManagementCards, { RoutePanel } from '../../components/Routes/RouteManagementCards';
import RouteAssignmentDrawer from '../../components/Routes/RouteAssignmentDrawer';
import RouteLogTable, { RouteLog } from '../../components/Routes/RouteLogTable';

/**
 * 🚀 ARCHON ROUTES MODULE (v.36.5.4)
 * Architecture: Sovereign Instrumental Node
 * Purpose: Central command for Route Dispatch & Logistics.
 */
const RoutesModule: React.FC = (): React.JSX.Element => {
  const [activePanel, setActivePanel] = useState<RoutePanel>('LOGS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteLog | null>(null);

  const handleAction = (action: 'DESPACHO' | 'BITACORA'): void => {
    if (action === 'DESPACHO') {
      setEditingRoute(null);
      setIsDrawerOpen(true);
    }
  };

  const handleEdit = (route: RouteLog): void => {
    setEditingRoute(route);
    setIsDrawerOpen(true);
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
        <RouteManagementCards
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          onAction={handleAction}
        />

        {/* 📊 CONTENIDO DINÁMICO DE PANEL */}
        <div className="mt-8">
          {activePanel === 'LOGS' ? (
            <RouteLogTable onEdit={handleEdit} />
          ) : (
            <div className="flex items-center justify-center min-h-[40vh] glass-card-pro bg-white border-2 border-dashed border-[rgba(15,42,68,0.1)]">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#0f2a44]/5 flex items-center justify-center mx-auto">
                  <Navigation className="text-[#0f2a44] opacity-20" size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-widest text-[#0f2a44]">
                    Control de Despacho Activo
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f2a44] opacity-40">
                    Use las tarjetas superiores para iniciar una nueva orden
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 📜 FOOTER (Sovereign Standards) */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>

      {/* 🔱 DRAWER DE ASIGNACIÓN / EDICIÓN */}
      <RouteAssignmentDrawer
        isOpen={isDrawerOpen}
        onClose={(): void => {
          setIsDrawerOpen(false);
          setEditingRoute(null);
        }}
        routeToEdit={editingRoute}
      />
    </main>
  );
};

export default RoutesModule;
