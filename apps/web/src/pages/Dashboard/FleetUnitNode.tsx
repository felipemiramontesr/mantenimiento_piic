import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Activity, ChevronLeft, Truck } from 'lucide-react';
import api from '../../api/client';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { useAssetTypeFields, FieldVisibility } from '../../hooks/useAssetTypeFields';

import ArchonDataTable, { ArchonTableHeader } from '../../components/UI/ArchonDataTable';
import AT from '../../styles/archonTypography';
import { SectionCard, NodeLoadingState, NodeErrorState, formatDate } from './nodes/NodeShared';
import { NodeData, MaintenanceRecord } from './FleetUnitNode/types';
import { UnitHeader } from './FleetUnitNode/UnitHeader';
import { MaintenanceSection } from './FleetUnitNode/MaintenanceSection';
import { IntelligenceKpiSection } from './FleetUnitNode/IntelligenceKpiSection';
import { EconomicLifeSection } from './FleetUnitNode/EconomicLifeSection';
import { AnomalySection } from './FleetUnitNode/AnomalySection';
import { OperatorScorecardSection } from './FleetUnitNode/OperatorScorecardSection';
import { Co2Section } from './FleetUnitNode/Co2Section';
import { RecallsSection } from './FleetUnitNode/RecallsSection';
import { MaintenanceRow } from './FleetUnitNode/MaintenanceRow';
import { IdentityRegistrySection } from './FleetUnitNode/IdentityRegistrySection';
import { TechnicalSpecsSection } from './FleetUnitNode/TechnicalSpecsSection';
import { FinancialSummarySection } from './FleetUnitNode/FinancialSummarySection';
import { ComplianceLegalSection } from './FleetUnitNode/ComplianceLegalSection';
import { RecentIncidentsSection } from './FleetUnitNode/RecentIncidentsSection';

/**
 * FC 142 F1 — orchestrator only. The sub-components previously declared
 * inline now live in `./FleetUnitNode/`, each with its own data hook. This
 * file only fetches the unit-level node payload and composes sections.
 * FC167 F2 — Identidad/Especificaciones/Financiero/Cumplimiento/Incidentes
 * extraídas también (el bump de react-router v7 tocó una línea interna,
 * trayendo la función entera bajo el presupuesto Dual-Gate de 50 líneas) +
 * fetch/breadcrumb movidos a `useFleetUnitNodeData`; mismo comportamiento
 * verbatim.
 */

const MAINT_HEADERS: ArchonTableHeader[] = [
  { key: 'date', label: 'Fecha', align: 'center', width: '14%' },
  { key: 'type', label: 'Tipo', align: 'center', width: '24%' },
  { key: 'odometer', label: 'Odómetro', align: 'center', width: '14%' },
  { key: 'cost', label: 'Costo', align: 'center', width: '14%' },
  { key: 'technician', label: 'Técnico', align: 'center', width: '20%' },
  { key: 'status', label: 'Estado', align: 'center', width: '14%' },
];

/** Deriva km-desde-último-servicio y km-restantes-al-siguiente a partir del
 * odómetro actual — pura, usada por `useFleetUnitNodeData` (Gate2). */
function deriveServiceKm(unit: NodeData['unit'] | undefined): {
  kmSinceService: number | null;
  kmRemaining: number | null;
} {
  const kmSinceService =
    unit?.odometer && unit.lastServiceReading ? unit.odometer - unit.lastServiceReading : null;
  const kmRemaining =
    unit?.nextServiceReading != null && unit.odometer != null
      ? unit.nextServiceReading - unit.odometer
      : null;
  return { kmSinceService, kmRemaining };
}

function useFleetUnitNodeData(unitId: string | undefined): {
  node: NodeData | null;
  loading: boolean;
  error: string | null;
  assetFields: FieldVisibility;
  kmSinceService: number | null;
  kmRemaining: number | null;
} {
  const { setSectionData } = useSovereignLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const [node, setNode] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navState = location.state as { from?: string; fromLabel?: string } | null;
  const backTo = navState?.from ?? '/dashboard/fleet';
  const backLabel = navState?.fromLabel ?? 'Flota';
  const fromAlerts = backTo === '/dashboard/alerts';

  useEffect(() => {
    setSectionData(
      unitId ?? 'Unidad',
      'Perfil completo de activo · Mantenimiento · Finanzas · Cumplimiento',
      null,
      {
        variant: 'emerald',
        headerTitle: fromAlerts ? 'Alertas del Sistema' : 'Administrar Unidades',
        HeaderIcon: ChevronLeft,
        PayloadIcon: Truck,
        actionTitle: 'Retorno',
        description: fromAlerts ? 'Volver al panel de alertas' : 'Volver al listado de flota',
        buttonText: backLabel,
        isActive: false,
        onClick: () => navigate(backTo),
      }
    );
  }, [unitId, setSectionData, navigate, backTo, backLabel, fromAlerts]);

  useEffect(() => {
    if (!unitId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/fleet/${unitId}/node`)
      .then((res) => setNode(res.data.data as NodeData))
      .catch(() => setError('No se pudo cargar el nodo de la unidad'))
      .finally(() => setLoading(false));
  }, [unitId]);

  const { fields: assetFields } = useAssetTypeFields(node?.unit?.assetTypeId);
  const { kmSinceService, kmRemaining } = deriveServiceKm(node?.unit);

  return { node, loading, error, assetFields, kmSinceService, kmRemaining };
}

/** "Historial de Mantenimiento" — extraída del orquestador (Gate2). */
function MaintenanceHistorySection({
  history,
}: {
  readonly history: MaintenanceRecord[];
}): React.JSX.Element {
  return (
    <SectionCard
      title="Historial de Mantenimiento"
      icon={<Activity size={16} className="text-[#f2b705]" />}
    >
      <ArchonDataTable<MaintenanceRecord>
        data={history}
        headers={MAINT_HEADERS}
        variant="embedded"
        emptyMessage="Sin registros de mantenimiento"
        renderRow={(r): React.ReactElement => <MaintenanceRow key={r.uuid} {...r} />}
      />
    </SectionCard>
  );
}

/** Página de nodo de unidad de flota — orquesta las secciones de identidad,
 * especificaciones, mantenimiento, inteligencia, financiero, cumplimiento e
 * incidentes recientes de una unidad. */
const FleetUnitNode: React.FC = (): React.JSX.Element => {
  const { unitId } = useParams<{ unitId: string }>();
  const { node, loading, error, assetFields, kmSinceService, kmRemaining } =
    useFleetUnitNodeData(unitId);

  if (loading) return <NodeLoadingState />;
  if (!node) return <NodeErrorState error={error} backTo="/dashboard/fleet" backLabel="Flota" />;

  const { unit, maintenance, financial, incidents } = node;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      <UnitHeader unit={unit} openIncidents={incidents.openCount} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IdentityRegistrySection unit={unit} assetFields={assetFields} />
        <TechnicalSpecsSection unit={unit} />
      </div>

      <MaintenanceSection unit={unit} kmSinceService={kmSinceService} kmRemaining={kmRemaining} />

      <IntelligenceKpiSection unitId={unit.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EconomicLifeSection unitId={unit.id} />
        <AnomalySection unitId={unit.id} />
        <OperatorScorecardSection unitId={unit.id} />
        <Co2Section unitId={unit.id} />
      </div>

      <RecallsSection
        unitId={unit.id}
        make={unit.marca ?? ''}
        model={unit.modelo ?? ''}
        year={unit.year}
      />

      <MaintenanceHistorySection history={maintenance.recentHistory} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FinancialSummarySection financial={financial} />
        <ComplianceLegalSection unit={unit} assetFields={assetFields} />
      </div>

      <RecentIncidentsSection incidents={incidents.recent} />

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <span className={AT.sectionDescription}>
          Última actualización: {formatDate(unit.updatedAt)}
        </span>
      </div>
    </div>
  );
};

export default FleetUnitNode;
