import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  Activity,
  Cog,
  FileText,
  Hash,
  ChevronLeft,
  Truck,
  DollarSign,
} from 'lucide-react';
import api from '../../api/client';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { useAssetTypeFields } from '../../hooks/useAssetTypeFields';

import ArchonDataTable, { ArchonTableHeader } from '../../components/UI/ArchonDataTable';
import AT from '../../styles/archonTypography';
import {
  InfoRow,
  SectionCard,
  NodeLoadingState,
  NodeErrorState,
  formatMXN,
  formatDate,
  formatNum,
  formatPct,
  SEVERITY_BADGE,
  SEVERITY_LABEL,
} from './nodes/NodeShared';
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

/**
 * FC 142 F1 — orchestrator only. The 12 sub-components previously declared
 * inline now live in `./FleetUnitNode/`, each with its own data hook. This
 * file only fetches the unit-level node payload and composes sections.
 */

const CATEGORY_LABEL: Record<string, string> = {
  LEASE: 'Arrendamiento',
  INSURANCE: 'Seguro',
  MAINTENANCE: 'Mantenimiento',
  FUEL: 'Combustible',
  TIRE: 'Llantas',
  FINE: 'Multas',
  REPAIR: 'Reparación',
  OTHER: 'Otros',
};

const MAINT_HEADERS: ArchonTableHeader[] = [
  { key: 'date', label: 'Fecha', align: 'center', width: '14%' },
  { key: 'type', label: 'Tipo', align: 'center', width: '24%' },
  { key: 'odometer', label: 'Odómetro', align: 'center', width: '14%' },
  { key: 'cost', label: 'Costo', align: 'center', width: '14%' },
  { key: 'technician', label: 'Técnico', align: 'center', width: '20%' },
  { key: 'status', label: 'Estado', align: 'center', width: '14%' },
];

const FleetUnitNode: React.FC = (): React.JSX.Element => {
  const { unitId } = useParams<{ unitId: string }>();
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
        onClick: (): void => navigate(backTo),
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

  if (loading) return <NodeLoadingState />;
  if (!node) return <NodeErrorState error={error} backTo="/dashboard/fleet" backLabel="Flota" />;

  const { unit, maintenance, financial, incidents } = node;
  const kmSinceService =
    unit.odometer && unit.lastServiceReading ? unit.odometer - unit.lastServiceReading : null;
  const kmRemaining =
    unit.nextServiceReading != null && unit.odometer != null
      ? unit.nextServiceReading - unit.odometer
      : null;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-12">
      <UnitHeader unit={unit} openIncidents={incidents.openCount} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title="Identidad & Registro"
          icon={<Hash size={16} className="text-[#f2b705]" />}
        >
          {assetFields.placa && <InfoRow label="Placas" value={unit.placas} />}
          <InfoRow label="Número de serie" value={unit.numeroSerie} />
          {assetFields.circulationCardNumber && (
            <InfoRow label="Tarjeta de circulación" value={unit.circulationCardNumber} />
          )}
          <InfoRow label="Uso operacional" value={unit.uso} />
          <InfoRow label="Cuenta contable" value={unit.accountingAccount} />
          <InfoRow label="Propietario" value={unit.owner} />
          <InfoRow
            label="Pago arrendamiento"
            value={unit.monthlyLeasePayment ? formatMXN(unit.monthlyLeasePayment) : null}
          />
        </SectionCard>

        <SectionCard
          title="Especificaciones Técnicas"
          icon={<Cog size={16} className="text-[#f2b705]" />}
        >
          <InfoRow label="Motor" value={unit.motor} />
          <InfoRow label="Combustible" value={unit.fuelType} />
          <InfoRow label="Tracción" value={unit.traccion} />
          <InfoRow label="Transmisión" value={unit.transmision} />
          <InfoRow label="Llantas" value={unit.tireSpec} />
          <InfoRow
            label="Uso diario promedio"
            value={unit.dailyUsageAvg ? formatNum(unit.dailyUsageAvg, 'km/día', 1) : null}
          />
          <InfoRow label="Capacidad de carga" value={formatNum(unit.capacidadCarga, 'kg')} />
          <InfoRow label="Tanque de combustible" value={formatNum(unit.fuelTankCapacity, 'L')} />
          <InfoRow
            label="Nivel de combustible"
            value={unit.lastFuelLevel != null ? formatPct(unit.lastFuelLevel, 0) : null}
          />
        </SectionCard>
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

      <SectionCard
        title="Historial de Mantenimiento"
        icon={<Activity size={16} className="text-[#f2b705]" />}
      >
        <ArchonDataTable<MaintenanceRecord>
          data={maintenance.recentHistory}
          headers={MAINT_HEADERS}
          variant="embedded"
          emptyMessage="Sin registros de mantenimiento"
          renderRow={(r): React.ReactElement => <MaintenanceRow key={r.uuid} {...r} />}
        />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          title={`Resumen Financiero ${financial.year}`}
          icon={<DollarSign size={16} className="text-[#f2b705]" />}
        >
          {Object.entries(financial.byCategory).map(([cat, total]) => (
            <InfoRow key={cat} label={CATEGORY_LABEL[cat] ?? cat} value={formatMXN(total)} />
          ))}
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]">
              Total del año
            </span>
            <span className="text-archon-lg font-black text-[#0f2a44]">
              {formatMXN(financial.totalCost)}
            </span>
          </div>
          {financial.totalCost === 0 && (
            <p className={`${AT.sectionDescription} text-center pt-4`}>
              Sin transacciones registradas este año
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Cumplimiento & Legal"
          icon={<Shield size={16} className="text-[#f2b705]" />}
        >
          {assetFields.insuranceExpiryDate && (
            <InfoRow label="Vencimiento seguro" value={formatDate(unit.insuranceExpiryDate)} />
          )}
          {assetFields.insurancePolicyNumber && (
            <InfoRow label="Póliza de seguro" value={unit.insurancePolicyNumber} />
          )}
          <InfoRow
            label="Costo del seguro"
            value={unit.insuranceCost ? formatMXN(unit.insuranceCost) : null}
          />
          {assetFields.vencimientoVerificacion && (
            <InfoRow label="Verificación" value={formatDate(unit.vencimientoVerificacion)} />
          )}
          <InfoRow label="Holográma ambiental" value={unit.environmentalHologram} />
          <InfoRow label="Cumplimiento legal" value={formatDate(unit.legalComplianceDate)} />
          <InfoRow label="Verif. mecánica" value={formatDate(unit.lastMechanicalVerification)} />
          <InfoRow
            label="Verif. ambiental"
            value={formatDate(unit.lastEnvironmentalVerification)}
          />
          <InfoRow label="Inicio de protocolo" value={formatDate(unit.protocolStartDate)} />
        </SectionCard>
      </div>

      {incidents.recent.length > 0 && (
        <SectionCard
          title="Incidentes Recientes"
          icon={<AlertTriangle size={16} className="text-[#f2b705]" />}
        >
          <div className="flex flex-col divide-y divide-slate-100">
            {incidents.recent.map((inc) => (
              <div key={inc.id} className="flex items-start gap-4 py-3">
                <span
                  className={`shrink-0 text-archon-xs font-black uppercase px-2 py-0.5 rounded-[3px] mt-0.5 ${
                    SEVERITY_BADGE[inc.severity] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {SEVERITY_LABEL[inc.severity] ?? inc.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={AT.cellLabel}>{inc.category}</p>
                  <p className={`${AT.cellDetail} mt-0.5`}>{inc.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={AT.cellMeta}>{formatDate(inc.reported_at)}</span>
                  <span
                    className={`block text-archon-xs font-black uppercase mt-0.5 ${
                      inc.status === 'OPEN' ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {inc.status === 'OPEN' ? 'Abierto' : 'Resuelto'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/dashboard/incidents"
            className="inline-flex items-center gap-1.5 mt-3 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44] transition-colors"
          >
            <FileText size={12} /> Ver todos los incidentes
          </Link>
        </SectionCard>
      )}

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <span className={AT.sectionDescription}>
          Última actualización: {formatDate(unit.updatedAt)}
        </span>
      </div>
    </div>
  );
};

export default FleetUnitNode;
