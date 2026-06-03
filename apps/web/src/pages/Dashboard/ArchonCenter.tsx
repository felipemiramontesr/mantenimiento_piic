import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gauge, ShieldCheck, Navigation, ShieldAlert, Users } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AccessControlSlideOver from '../../components/Identity/AccessControlSlideOver';
import CategoryAnalyticsCard from '../../components/Dashboard/CategoryAnalyticsCard';

/**
 * 🔱 Archon Component: ArchonCenter
 * Implementation: Sovereign Command Center View (V.78.100.87)
 * Objective: High-density predictive analytics and fleet health orchestration.
 * Migration: 100% Sovereign Inner Architecture (DRY).
 */

const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { stats, loading } = useFleet();
  const { users } = useUsers();
  const { setSectionData } = useSovereignLayout();
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);

  useEffect(() => {
    setSectionData('Centro de Comando', 'Análisis Predictivo de Segmentos Operativos', null);
  }, [setSectionData]);

  const activePersonnelCount = users.filter((u) => u.is_active && u.username !== 'Archon').length;

  const renderKPI = (
    label: string,
    value: string | number,
    Icon: React.ElementType,
    color: string,
    description: string,
    path?: string
  ): React.ReactElement => (
    <div
      className="card-archon-sovereign animate-in fade-in duration-500"
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="card-sovereign-header">
        <Icon size={20} style={{ color }} />
        <span className="card-sovereign-title">{label}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-8">
        {loading ? (
          <div className="w-full h-12 bg-pinnacle-navy/5 animate-pulse rounded-[4px]" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center w-full space-y-1">
            <h3 className="card-sovereign-kpi-value">{value}</h3>
            <p className="card-sovereign-kpi-label">{description}</p>
          </div>
        )}
      </div>

      <button
        onClick={(): void => {
          if (path) navigate(path);
        }}
        className="btn-archon-card-action"
      >
        VER REPORTE <ArrowRight size={12} className="ml-2" />
      </button>
    </div>
  );

  const handleViewDetails = (categoryKey: string): void => {
    navigate(`/dashboard/fleet?categoria=${categoryKey}`);
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 COMMAND CENTER CHASSIS */}
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="archon-grid-sovereign">
              <CategoryAnalyticsCard
                title="Vehículos de Flota"
                categoryKey="vehiculo"
                accentColor="#8b5cf6"
                data={stats.categories.vehiculo}
                onViewDetails={handleViewDetails}
              />
              <CategoryAnalyticsCard
                title="Maquinaria Pesada"
                categoryKey="maquinaria"
                accentColor="#f2b705"
                data={stats.categories.maquinaria}
                onViewDetails={handleViewDetails}
              />
              <CategoryAnalyticsCard
                title="Herramienta Menor"
                categoryKey="herramienta"
                accentColor="#0ea5e9"
                data={stats.categories.herramienta}
                onViewDetails={handleViewDetails}
              />

              {renderKPI(
                'Fuerza Operativa',
                activePersonnelCount,
                Users,
                '#0f2a44',
                'Personal habilitado en sitio',
                '/dashboard/users'
              )}
              {renderKPI(
                'Salud de Flota',
                `${stats.maintenanceIndex}%`,
                Gauge,
                '#0f2a44',
                'Índice global de operatividad',
                '/dashboard/maintenance'
              )}
              {renderKPI(
                'Disponibilidad',
                stats.available,
                ShieldCheck,
                '#10b981',
                'Unidades listas para operación',
                '/dashboard/fleet?status=Disponible'
              )}
              {renderKPI(
                'Despliegue en Ruta',
                stats.inRoute,
                Navigation,
                '#0ea5e9',
                'Unidades en tránsito operativo',
                '/dashboard/routes'
              )}
              {renderKPI(
                'Incidencias en Ruta',
                stats.openIncidents,
                ShieldAlert,
                '#ef4444',
                'Alertas Sentinel activas',
                '/dashboard/incidents'
              )}
              {renderKPI(
                'Mermas Operativas',
                stats.totalInactive,
                ShieldAlert,
                '#8b5cf6',
                'Unidades fuera de servicio',
                '/dashboard/fleet?status=Descontinuada'
              )}
            </div>
          </div>
        </div>
      </section>

      <AccessControlSlideOver
        isOpen={isAccessControlOpen}
        onClose={(): void => setIsAccessControlOpen(false)}
      />
    </div>
  );
};

export default ArchonCenter;
