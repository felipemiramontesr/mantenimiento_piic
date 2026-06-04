import React, { useState, useEffect } from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { ArchonDataTable, ArchonTableHeader } from '../../components/UI/ArchonDataTable';
import api from '../../api/client';

interface RouteIncident {
  id: number;
  route_uuid: string;
  unit_id: string;
  driver_name: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  evidence_image: string | null;
  reported_at: string;
}

const HEADERS: ArchonTableHeader[] = [
  { key: 'unit_id', label: 'UNIDAD', align: 'center' },
  { key: 'driver_name', label: 'CONDUCTOR', align: 'center' },
  { key: 'category', label: 'CATEGORÍA', align: 'center' },
  { key: 'severity', label: 'SEVERIDAD', align: 'center' },
  { key: 'status', label: 'ESTADO', align: 'center' },
  { key: 'description', label: 'DESCRIPCIÓN', align: 'left' },
  { key: 'reported_at', label: 'FECHA', align: 'center' },
];

const getSeverityClasses = (severity: string): string => {
  if (severity === 'CRITICAL') return 'bg-red-100 text-red-700 border border-red-200';
  if (severity === 'HIGH') return 'bg-amber-100 text-amber-700 border border-amber-200';
  if (severity === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-sky-100 text-sky-700 border border-sky-200';
};

const getStatusClasses = (status: string): string => {
  if (status === 'OPEN') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const IncidentsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [incidents, setIncidents] = useState<RouteIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect((): void => {
    setSectionData(
      'Incidencias en Ruta',
      'Registro Forense de Anomalías Operativas · Sentinel Archon',
      null,
      null
    );
  }, [setSectionData]);

  useEffect((): void => {
    setLoading(true);
    api
      .get<{ success: boolean; data: RouteIncident[] }>('/incidents')
      .then((res): void => {
        setIncidents(res.data.data);
      })
      .catch((): void => {
        setIncidents([]);
      })
      .finally((): void => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <ArchonDataTable<RouteIncident>
              data={incidents}
              headers={HEADERS}
              loading={loading}
              loadingMessage="Sincronizando incidencias..."
              emptyMessage="Sin incidencias registradas"
              testId="incidents-table"
              renderRow={(incident): React.ReactNode => (
                <tr key={incident.id} className="hover:bg-slate-50/50 transition-all duration-300">
                  <td className="text-center py-3 px-4 font-mono font-bold text-archon-lg text-[#0f2a44]">
                    {incident.unit_id}
                  </td>
                  <td className="text-center py-3 px-4 text-archon-lg text-[#0f2a44]">
                    {incident.driver_name}
                  </td>
                  <td className="text-center py-3 px-4 text-archon-md font-black uppercase tracking-wider text-[#0f2a44]">
                    {incident.category}
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className="flex justify-center">
                      <span
                        className={`px-2 py-0.5 rounded-[4px] text-archon-base font-black uppercase tracking-wider ${getSeverityClasses(
                          incident.severity
                        )}`}
                      >
                        {incident.severity}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">
                    <div className="flex justify-center">
                      <span
                        className={`px-2 py-0.5 rounded-[4px] text-archon-base font-black uppercase tracking-wider ${getStatusClasses(
                          incident.status
                        )}`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </td>
                  <td className="text-left py-3 px-4 text-archon-label text-[#0f2a44]/70 max-w-[200px] truncate">
                    {incident.description}
                  </td>
                  <td className="text-center py-3 px-4 font-mono text-archon-label text-[#0f2a44]/60">
                    {formatDate(incident.reported_at)}
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default IncidentsModule;
