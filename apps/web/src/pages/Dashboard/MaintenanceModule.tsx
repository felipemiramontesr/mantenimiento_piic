import React, { useState, useEffect } from 'react';
import { Wrench, ShieldAlert, PlusCircle } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

export type MaintenancePanel = 'HISTORY' | 'SCHEDULE';

/**
 * 🛠️ ARCHON MAINTENANCE MODULE (v.20.2.0)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 * Refinement: Single Mutating Header Card (Mirror FleetModule DNA)
 */
const MaintenanceModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('HISTORY');
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isScheduling = activePanel === 'SCHEDULE';

    setSectionData(
      'Administrar Mantenimientos',
      'Control de Servicios, Mantenimiento Preventivo & Correctivo',
      null,
      {
        variant: isScheduling ? 'navy' : 'emerald',
        headerTitle: isScheduling ? 'Cancelar' : 'Programar Servicio',
        HeaderIcon: isScheduling ? ShieldAlert : PlusCircle,
        PayloadIcon: isScheduling ? ShieldAlert : Wrench,
        actionTitle: isScheduling ? 'Retorno' : 'Programar',
        description: isScheduling ? 'Cancelar Programación' : 'Alta de Servicio',
        buttonText: isScheduling ? 'Cerrar Formulario' : 'Iniciar Registro',
        isActive: isScheduling,
        onClick: () => {
          setActivePanel(isScheduling ? 'HISTORY' : 'SCHEDULE');
          if (panelRef.current?.scrollIntoView) {
            setTimeout((): void => {
              panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        },
      }
    );
  }, [activePanel, setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center justify-center min-h-[30vh]">
                <h3 className="text-pinnacle-navy text-xl font-black tracking-tight">
                  {activePanel === 'HISTORY'
                    ? 'Bitácora de Servicios lista para recibir información-'
                    : 'Módulo de Programación listo para recibir información-'}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MaintenanceModule;
