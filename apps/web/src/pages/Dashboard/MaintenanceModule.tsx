import React, { useState, useEffect } from 'react';
import { BarChart3, ClipboardList, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { MaintenancePanel, MaintenanceLog } from '../../types/maintenance';
import MaintenanceGridView from '../../components/Maintenance/MaintenanceGridView';
import MaintenanceRegistrationForm from '../../components/Maintenance/MaintenanceRegistrationForm';
import MaintenanceCompletionPanel from '../../components/Maintenance/MaintenanceCompletionPanel';
import MaintenanceHistoryDetail from '../../components/Maintenance/MaintenanceHistoryDetail';
import MaintenanceForecastView from '../../components/Maintenance/MaintenanceForecastView';

const MaintenanceModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('FORECAST');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [completingLog, setCompletingLog] = useState<MaintenanceLog | null>(null);
  const [detailLog, setDetailLog] = useState<MaintenanceLog | null>(null);
  const [scheduleInitialUnit, setScheduleInitialUnit] = useState<string>('');
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
    setScheduleInitialUnit('');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleForecastSchedule = (unitId: string): void => {
    setScheduleInitialUnit(unitId);
    setActivePanel('SCHEDULE');
    scrollToTop();
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

    if (isScheduling) {
      setSectionData(
        'Administrar Mantenimientos',
        'Control de Servicios, Mantenimiento Preventivo & Correctivo de Flotilla',
        null,
        {
          variant: 'navy',
          headerTitle: 'Cancelar',
          HeaderIcon: ShieldAlert,
          PayloadIcon: ShieldAlert,
          actionTitle: 'Retorno',
          description: 'Cancelar Programación',
          buttonText: 'Cerrar Formulario',
          isActive: true,
          onClick: () => {
            setActivePanel('HISTORY');
            scrollToTop();
          },
        }
      );
      return;
    }

    if (activePanel === 'FORECAST') {
      setSectionData(
        'Administrar Mantenimientos',
        'Control de Servicios, Mantenimiento Preventivo & Correctivo de Flotilla',
        null,
        {
          variant: 'emerald',
          headerTitle: 'Historial de Servicios',
          HeaderIcon: ClipboardList,
          PayloadIcon: ClipboardList,
          actionTitle: 'Historial',
          description: 'Ver Historial de Servicios',
          buttonText: 'Ver Historial',
          isActive: false,
          onClick: () => {
            setActivePanel('HISTORY');
            scrollToTop();
          },
        }
      );
      return;
    }

    setSectionData(
      'Administrar Mantenimientos',
      'Control de Servicios, Mantenimiento Preventivo & Correctivo de Flotilla',
      null,
      {
        variant: 'navy',
        headerTitle: 'Ver Pronósticos',
        HeaderIcon: BarChart3,
        PayloadIcon: BarChart3,
        actionTitle: 'Pronósticos',
        description: 'Panel de Pronósticos',
        buttonText: 'Ver Pronósticos',
        isActive: false,
        onClick: () => {
          setActivePanel('FORECAST');
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
              {activePanel === 'FORECAST' && (
                <MaintenanceForecastView onScheduleRequest={handleForecastSchedule} />
              )}
              {activePanel === 'SCHEDULE' && (
                <MaintenanceRegistrationForm
                  onSuccess={handleReturnToGrid}
                  onCancel={handleReturnToGrid}
                  initialUnitId={scheduleInitialUnit}
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
