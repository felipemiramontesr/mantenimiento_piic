import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Wrench, RefreshCw, AlertCircle, CheckCircle2, Clock, Inbox } from 'lucide-react';
import api from '../../api/client';
import AT from '../../styles/archonTypography';

interface FleetUnit {
  id: string;
  ownerId: number;
  brand: string;
  model: string;
  year: number;
  status: string;
}

interface WorkOrder {
  id: number;
  unitId: string;
  type: string;
  startDatetime: string;
  endDatetime: string | null;
}

const PortalView: React.FC = () => {
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const [unitsRes, ordersRes] = await Promise.all([
        api.get<{ units: FleetUnit[] }>('/portal/fleet-status'),
        api.get<{ workOrders: WorkOrder[] }>('/portal/work-orders'),
      ]);
      setUnits(unitsRes.data.units);
      setWorkOrders(ordersRes.data.workOrders);
    } catch {
      setError('No se pudo cargar el portal');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll().catch(() => undefined);
  }, [fetchAll]);

  return (
    <div data-testid="portal-view" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className={AT.sectionTitle}>Portal de Cliente</span>
        <button
          onClick={(): void => {
            fetchAll().catch(() => undefined);
          }}
          className="flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {isLoading && (
        <div data-testid="portal-loading" className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div
          data-testid="portal-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Fleet Status */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-archon-blue" />
              <span className="text-archon-sm font-black uppercase tracking-widest text-slate-300">
                Estado de Flota
              </span>
            </div>

            {units.length === 0 ? (
              <div
                data-testid="portal-units-empty"
                className="flex flex-col items-center gap-2 py-6 text-slate-500"
              >
                <Inbox className="w-6 h-6" />
                <span className={AT.sectionDescription}>Sin unidades asignadas</span>
              </div>
            ) : (
              <div
                data-testid="portal-units-grid"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    data-testid={`portal-unit-${unit.id}`}
                    className="flex items-center gap-3 p-4 bg-[#0f2a44]/30 border border-white/10 rounded-xl hover:border-white/20 transition-colors"
                  >
                    <Truck className="w-5 h-5 text-archon-blue shrink-0" />
                    <div>
                      <p className={AT.cellValue}>{unit.id}</p>
                      <p className="text-archon-sm text-slate-400">
                        {unit.brand} {unit.model} · {unit.year}
                      </p>
                      <span className="flex items-center gap-1 text-archon-sm text-emerald-400 font-black mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {unit.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Work Orders */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-archon-blue" />
              <span className="text-archon-sm font-black uppercase tracking-widest text-slate-300">
                Órdenes de Trabajo
              </span>
            </div>

            {workOrders.length === 0 ? (
              <div
                data-testid="portal-orders-empty"
                className="flex flex-col items-center gap-2 py-6 text-slate-500"
              >
                <Inbox className="w-6 h-6" />
                <span className={AT.sectionDescription}>Sin órdenes de trabajo recientes</span>
              </div>
            ) : (
              <div data-testid="portal-orders-list" className="flex flex-col gap-2">
                {workOrders.map((wo) => (
                  <div
                    key={wo.id}
                    data-testid={`portal-order-${wo.id}`}
                    className="flex items-center gap-3 p-3 bg-[#0a1929]/40 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <p className={AT.cellValue}>Unidad {wo.unitId}</p>
                      <p className="text-archon-sm text-slate-400">
                        {new Date(wo.startDatetime).toLocaleDateString('es-MX')}
                        {wo.endDatetime
                          ? ` — ${new Date(wo.endDatetime).toLocaleDateString('es-MX')}`
                          : ' — En progreso'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default PortalView;
