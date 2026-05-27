import React, { useState, useEffect } from 'react';
import { Wrench, ShieldAlert, PlusCircle, CheckCircle2 } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { MaintenancePanel, MaintenanceLog } from '../../types/maintenance';
import MaintenanceGridView from '../../components/Maintenance/MaintenanceGridView';
import MaintenanceRegistrationForm from '../../components/Maintenance/MaintenanceRegistrationForm';
import MaintenanceCompletionPanel from '../../components/Maintenance/MaintenanceCompletionPanel';
import MaintenanceHistoryDetail from '../../components/Maintenance/MaintenanceHistoryDetail';

const MaintenanceModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('HISTORY');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [completingLog, setCompletingLog] = useState<MaintenanceLog | null>(null);
  const [detailLog, setDetailLog] = useState<MaintenanceLog | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = (): void => {
    if (panelRef.current?.scrollIntoView) {
      setTimeout((): void => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleReturnToGrid = (): void => {
    setActivePanel('HISTORY');
    setCompletingLog(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCompleteRequest = (log: MaintenanceLog): void => {
    setCompletingLog(log);
    setActivePanel('COMPLETE');
    scrollToTop();
  };

  const handleDetailRequest = (log: MaintenanceLog): void => {
    setDetailLog(log);
    setActivePanel('HISTORY_DETAIL');
    scrollToTop();
  };

  useEffect(() => {
    const isScheduling = activePanel === 'SCHEDULE';
    const isCompleting = activePanel === 'COMPLETE';

    if (isCompleting) {
      setSectionData(
        'Finalizar Servicio',
        `Cierre de Mantenimiento — ${completingLog?.unit_id ?? ''}`,
        null,
        {
          variant: 'navy',
          headerTitle: 'Cancelar Finalización',
          HeaderIcon: ShieldAlert,
          PayloadIcon: CheckCircle2,
          actionTitle: 'Retorno',
          description: 'Cancelar Cierre',
          buttonText: 'Volver al Historial',
          isActive: true,
          onClick: handleReturnToGrid,
        }
      );
      return;
    }

    if (activePanel === 'HISTORY_DETAIL') {
      setSectionData('Detalle de Servicio', `Historial — ${detailLog?.unit_id ?? ''}`, null, null);
      return;
    }

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
          scrollToTop();
        },
      }
    );
  }, [activePanel, completingLog, detailLog, setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {activePanel === 'HISTORY' && (
                <MaintenanceGridView
                  refreshTrigger={refreshTrigger}
                  onNewRequest={(): void => setActivePanel('SCHEDULE')}
                  onCompleteRequest={handleCompleteRequest}
                  onDetailRequest={handleDetailRequest}
                />
              )}
              {activePanel === 'SCHEDULE' && (
                <MaintenanceRegistrationForm
                  onSuccess={handleReturnToGrid}
                  onCancel={handleReturnToGrid}
                />
              )}
              {activePanel === 'COMPLETE' && completingLog && (
                <MaintenanceCompletionPanel
                  log={completingLog}
                  onSuccess={handleReturnToGrid}
                  onCancel={handleReturnToGrid}
                />
              )}
              {activePanel === 'HISTORY_DETAIL' && detailLog && (
                <MaintenanceHistoryDetail log={detailLog} onBack={handleReturnToGrid} />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MaintenanceModule;
