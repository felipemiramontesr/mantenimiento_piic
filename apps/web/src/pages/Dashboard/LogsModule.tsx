import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Flame } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AuditLogView from './AuditLogView';

export type LogsPanel = 'FORENSIC' | 'INCIDENTS';

/**
 * 🚀 ARCHON LOGS MODULE (v.7.3.0)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 * Refinement: Single Mutating Header Card (Mirror FleetModule DNA)
 */
const LogsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<LogsPanel>('FORENSIC');
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isIncidents = activePanel === 'INCIDENTS';

    setSectionData('Logs de Seguridad', 'Auditoría y Vigilancia de Acceso al Sistema', null, {
      variant: isIncidents ? 'red' : 'emerald',
      headerTitle: isIncidents ? 'Incidencias' : 'Auditoría Forense',
      HeaderIcon: isIncidents ? Flame : ShieldCheck,
      PayloadIcon: isIncidents ? AlertTriangle : ShieldCheck,
      actionTitle: isIncidents ? 'Anomalías' : 'Trazabilidad',
      description: isIncidents ? 'Reporte de Anomalías' : 'Eventos del Sistema',
      buttonText: isIncidents ? 'Ver Incidencias' : 'Ver Bitácora',
      isActive: isIncidents,
      onClick: () => {
        setActivePanel(isIncidents ? 'FORENSIC' : 'INCIDENTS');
        if (panelRef.current?.scrollIntoView) {
          setTimeout((): void => {
            panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      },
    });
  }, [activePanel, setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {activePanel === 'FORENSIC' && <AuditLogView />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LogsModule;
