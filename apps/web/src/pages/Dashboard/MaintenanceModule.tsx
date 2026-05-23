import React, { useState, useEffect } from 'react';
import { Wrench, ShieldAlert, PlusCircle } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { MaintenancePanel } from '../../types/maintenance';
import MaintenanceGridView from '../../components/Maintenance/MaintenanceGridView';
import MaintenanceRegistrationForm from '../../components/Maintenance/MaintenanceRegistrationForm';

/**
 * 🛠️ ARCHON MAINTENANCE MODULE (v.20.2.0)
 * Architecture: Sovereign Instrumental Node
 * Refinement: Backend-Driven UI (Template Engine API)
 */
const MaintenanceModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('HISTORY');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const handleReturnToGrid = (): void => {
    setActivePanel('HISTORY');
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const isScheduling = activePanel === 'SCHEDULE';

    setSectionData(
      'Administrar Mantenimientos',
      'Control de Servicios, Mantenimiento Preventivo & Correctivo de Flotilla',
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
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {activePanel === 'HISTORY' ? (
                <MaintenanceGridView refreshTrigger={refreshTrigger} onNewRequest={(): void => setActivePanel('SCHEDULE')} />
              ) : (
                <MaintenanceRegistrationForm onSuccess={handleReturnToGrid} onCancel={handleReturnToGrid} />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MaintenanceModule;
