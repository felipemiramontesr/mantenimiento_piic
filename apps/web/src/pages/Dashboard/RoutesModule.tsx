import React, { useState } from 'react';
import { Navigation, Truck, ShieldCheck } from 'lucide-react';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';
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
                {editingRoute
                  ? `Rectificación de Trayecto: ${editingRoute.id}`
                  : 'Administrar Rutas'}
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              {editingRoute
                ? 'Protocolo de Rectificación Logística Archon'
                : 'Despacho Logístico, Control de Tránsito & Auditoría Forense'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Symmetrical placeholder */}
          </div>
        </div>
      </header>

      {/* 🔱 HEADER KPI GRID (Symmetry Pro) */}
      <section className="px-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Logistics & Forensics */}
          <div
            className="glass-card-pro bg-white p-8 border-t-4 border-[#0f2a44] flex items-center justify-between group hover:shadow-2xl transition-all duration-500 cursor-pointer"
            onClick={(): void => handleAction('BITACORA')}
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-navy-400 uppercase tracking-[0.3em] mb-2">
                Ecosistema de Gestión
              </span>
              <h3 className="text-2xl font-black text-navy-900 tracking-tight mb-1">
                Logística Operativa
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Auditoría Forense • Rastro Inmutable
                </span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-[4px] bg-navy-50 flex items-center justify-center text-navy-900 group-hover:bg-navy-900 group-hover:text-white transition-colors duration-500">
              <Truck size={32} />
            </div>
          </div>

          {/* Card 2: Emerald Status */}
          <div
            className="glass-card-pro bg-[#10b981] p-8 flex items-center justify-between group hover:shadow-2xl transition-all duration-500 border-none cursor-pointer"
            onClick={(): void => handleAction('DESPACHO')}
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] mb-2">
                Disponibilidad Táctica
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                Certificación Archon Elite
              </h3>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-white/80" />
                <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">
                  Protocolo Industrial V.78.1
                </span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-[4px] bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
              <ShieldCheck size={32} />
            </div>
          </div>
        </div>
      </section>

      {/* 📊 BODY MODULAR (Action Cards) */}
      <section className="archon-workspace-chassis">
        <div className="flex flex-col gap-4 pb-[60vh]">
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
        <p>© Todos los derechos reservados por ArchonCore by PIIC GROUP.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default RoutesModule;
