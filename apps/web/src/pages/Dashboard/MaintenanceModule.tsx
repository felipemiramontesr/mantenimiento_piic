import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Cpu,
  ShieldAlert,
  CheckCircle2,
  Gauge,
  Calendar,
} from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import {
  MaintenancePanel,
  MaintenanceLog,
  MaintenanceForecastRow,
  ForecastUrgency,
} from '../../types/maintenance';
import MaintenanceGridView from '../../components/Maintenance/MaintenanceGridView';
import ArchonAdaptiveView from '../../components/Common/ArchonAdaptiveView';
import ArchonCalendarView from '../../components/Common/ArchonCalendarView';
import ArchonCardView, {
  CardMetricRow,
  CardAlertBadge,
} from '../../components/Common/ArchonCardView';
import api from '../../api/client';
import MaintenanceRegistrationForm from '../../components/Maintenance/MaintenanceRegistrationForm';
import MaintenanceCompletionPanel from '../../components/Maintenance/MaintenanceCompletionPanel';
import MaintenanceHistoryDetail from '../../components/Maintenance/MaintenanceHistoryDetail';
import MaintenanceForecastView from '../../components/Maintenance/MaintenanceForecastView';
import UpaWorkspace from '../Upa/UpaWorkspace';
import { acceptMaintenance, rejectMaintenance } from '../../api/maintenance';

// FC 078 F2(a)/(b) — receta v2 de tarjeta para el pronóstico de mantenimiento
// (única vista de datos del módulo sin estrategia móvil, 078_AN). Fetch propio
// y ligero (mismo endpoint que MaintenanceForecastView, que NO se toca —
// fuera de los archivos declarados para esta fase); solo uno de los dos
// monta a la vez vía ArchonAdaptiveView, así que no hay doble-fetch real.
const URGENCY_TONE: Record<ForecastUrgency, 'critical' | 'warning' | null> = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  OK: null,
};

const URGENCY_LABEL: Record<ForecastUrgency, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Próximo',
  OK: 'Al Día',
};

const formatForecastDate = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const renderForecastCardContent = (
  row: MaintenanceForecastRow,
  onScheduleRequest: (unitId: string) => void
): React.ReactNode => {
  const tone = URGENCY_TONE[row.urgency];
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-pinnacle-navy text-archon-md truncate">{row.unitId}</span>
        <span className="shrink-0 px-2 py-0.5 rounded-[4px] bg-pinnacle-navy/5 text-pinnacle-navy/70 text-archon-xs font-bold uppercase tracking-widest">
          {URGENCY_LABEL[row.urgency]}
        </span>
      </div>
      <div className="text-pinnacle-navy/70 text-archon-base truncate">
        {row.marca} {row.modelo}
      </div>
      <div className="flex flex-col gap-1 pt-2 border-t border-pinnacle-navy/5">
        <CardMetricRow
          icon={<Gauge size={12} />}
          label="Odómetro"
          value={`${row.currentOdometer.toLocaleString()} km`}
        />
        <CardMetricRow
          icon={<Gauge size={12} />}
          label="Km Restantes"
          value={`${row.kmRemaining.toLocaleString()} km`}
        />
        <CardMetricRow
          icon={<Calendar size={12} />}
          label="Próx. Servicio"
          value={formatForecastDate(row.nextServiceDate)}
        />
      </div>
      {tone && (
        <CardAlertBadge tone={tone}>
          <ShieldAlert size={12} />
          {row.daysUntilService <= 0 ? 'Servicio vencido' : `Servicio en ${row.daysUntilService}d`}
        </CardAlertBadge>
      )}
      {/* FC 078 F4 — regresión F2 atrapada por I-RWD: 85×22 < 44px táctil */}
      <button
        type="button"
        onClick={(): void => onScheduleRequest(row.unitId)}
        className="self-start h-11 flex items-center px-3 rounded-[4px] bg-emerald-50 text-emerald-700 text-archon-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-colors"
      >
        Programar
      </button>
    </div>
  );
};

const MaintenanceForecastCardPanel: React.FC<{
  onScheduleRequest: (unitId: string) => void;
}> = ({ onScheduleRequest }) => {
  const [data, setData] = useState<MaintenanceForecastRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/maintenance/forecast')
      .then((res) => {
        if (res.data.success) setData(res.data.data as MaintenanceForecastRow[]);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-pinnacle-navy/40 font-display font-black text-archon-md uppercase tracking-[0.2em]">
        Calculando pronósticos de flotilla...
      </div>
    );
  }

  return (
    <ArchonCardView<MaintenanceForecastRow>
      items={data}
      keyExtractor={(row): string => row.unitId}
      renderCard={(row): React.ReactNode => renderForecastCardContent(row, onScheduleRequest)}
      emptyMessage="NO SE ENCONTRARON UNIDADES ACTIVAS"
    />
  );
};

/**
 * FC 041 Fase C — panel de calendario del piloto (vista CALENDAR del
 * ArchonAdaptiveView). Solo monta (y por tanto solo consulta el API) cuando
 * el usuario selecciona la vista de calendario; reutiliza el flujo de
 * detalle existente vía onEventClick.
 */
const MaintenanceCalendarPanel: React.FC<{
  refreshTrigger: number;
  onEventClick: (log: MaintenanceLog) => void;
}> = ({ refreshTrigger, onEventClick }) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLogs = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await api.get('/maintenance?limit=50');
        setLogs(response.data.data ?? []);
      } catch {
        setLogs([]); // fail-safe: calendario vacío, sin crash (FC 071)
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-pinnacle-navy/40 font-display font-black text-archon-md uppercase tracking-[0.2em]">
        Cargando calendario de servicios...
      </div>
    );
  }

  return (
    <ArchonCalendarView<MaintenanceLog>
      items={logs}
      keyExtractor={(log): number => log.id}
      dateExtractor={(log): string => log.service_date}
      renderEvent={(log): React.ReactNode => <span>{log.unit_id}</span>}
      onEventClick={onEventClick}
    />
  );
};

const MaintenanceModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [searchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('FORECAST');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [completingLog, setCompletingLog] = useState<MaintenanceLog | null>(null);
  const [detailLog, setDetailLog] = useState<MaintenanceLog | null>(null);
  const [scheduleInitialUnit, setScheduleInitialUnit] = useState<string>('');
  const [activeUpaOrderId, setActiveUpaOrderId] = useState<number | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = (): void => {
    if (panelRef.current?.scrollIntoView) {
      setTimeout((): void => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  useEffect(() => {
    const unitId = searchParams.get('unitId');
    if (unitId) {
      setScheduleInitialUnit(unitId);
      setActivePanel('SCHEDULE');
    }
  }, [searchParams]);

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

  const handleCancelSchedule = (): void => {
    const origin: MaintenancePanel = scheduleInitialUnit !== '' ? 'FORECAST' : 'HISTORY';
    setScheduleInitialUnit('');
    setActivePanel(origin);
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

  const handleOpenUpa = useCallback((workOrderId: number): void => {
    setActiveUpaOrderId(workOrderId);
    setActivePanel('UPA');
    scrollToTop();
  }, []);

  const handleReturnFromUpa = useCallback((): void => {
    setActiveUpaOrderId(null);
    setActivePanel('HISTORY');
    setRefreshTrigger((prev) => prev + 1);
    scrollToTop();
  }, []);

  const handleAcceptOrder = useCallback(
    async (uuid: string): Promise<void> => {
      try {
        const { workOrderId } = await acceptMaintenance(uuid);
        setRefreshTrigger((prev) => prev + 1);
        handleOpenUpa(workOrderId);
      } catch {
        // Error surfaced via grid refresh — no blocking alert
        setRefreshTrigger((prev) => prev + 1);
      }
    },
    [handleOpenUpa]
  );

  const handleRejectOrder = useCallback(async (uuid: string): Promise<void> => {
    try {
      await rejectMaintenance(uuid);
      setRefreshTrigger((prev) => prev + 1);
    } catch {
      setRefreshTrigger((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    const isScheduling = activePanel === 'SCHEDULE';
    const isCompleting = activePanel === 'COMPLETE';
    const isUpa = activePanel === 'UPA';

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
          onClick: handleCancelSchedule,
        }
      );
      return;
    }

    if (isUpa) {
      setSectionData(
        'Proceso UPA',
        'Pipeline Universal Archon — Control de Servicio Sistemático',
        null,
        {
          variant: 'navy',
          headerTitle: 'Volver al Historial',
          HeaderIcon: ClipboardList,
          PayloadIcon: Cpu,
          actionTitle: 'Retorno',
          description: 'Volver al historial de mantenimiento',
          buttonText: 'Volver',
          isActive: false,
          onClick: handleReturnFromUpa,
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
  }, [activePanel, completingLog, detailLog, setSectionData, handleReturnFromUpa]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {activePanel === 'HISTORY' && (
                <ArchonAdaptiveView
                  storageKey="maintenance-history"
                  views={{
                    TABLE: (
                      <MaintenanceGridView
                        refreshTrigger={refreshTrigger}
                        onNewRequest={(): void => setActivePanel('SCHEDULE')}
                        onCompleteRequest={handleCompleteRequest}
                        onDetailRequest={handleDetailRequest}
                        onAcceptOrder={handleAcceptOrder}
                        onRejectOrder={handleRejectOrder}
                        onOpenUpa={handleOpenUpa}
                      />
                    ),
                    CALENDAR: (
                      <MaintenanceCalendarPanel
                        refreshTrigger={refreshTrigger}
                        onEventClick={handleDetailRequest}
                      />
                    ),
                  }}
                />
              )}
              {activePanel === 'FORECAST' && (
                <ArchonAdaptiveView
                  storageKey="maintenance-forecast"
                  views={{
                    TABLE: <MaintenanceForecastView onScheduleRequest={handleForecastSchedule} />,
                    CARDS: (
                      <MaintenanceForecastCardPanel onScheduleRequest={handleForecastSchedule} />
                    ),
                  }}
                />
              )}
              {activePanel === 'SCHEDULE' && (
                <MaintenanceRegistrationForm
                  onSuccess={handleReturnToGrid}
                  onCancel={handleCancelSchedule}
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
              {activePanel === 'UPA' && activeUpaOrderId !== null && (
                <UpaWorkspace workOrderId={activeUpaOrderId} onReturn={handleReturnFromUpa} />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MaintenanceModule;
