import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, ShieldAlert } from 'lucide-react';
import { FleetUnit } from '../../types/fleet';
import api from '../../api/client';
import AuditJustificationModal from '../Common/AuditJustificationModal';
import useFleetForm from '../../hooks/useFleetForm';
import FleetRegistrationForm from './FleetRegistrationForm';

interface FleetEditModalProps {
  unit: FleetUnit;
  onClose(): void;
  onSuccess(): void;
}

/**
 * 🔱 ARCHON FLEET EDIT MODAL
 * Administrative interface for asset rectification.
 */
const FleetEditModal: React.FC<FleetEditModalProps> = ({
  unit,
  onClose,
  onSuccess,
}): React.JSX.Element => {
  const controller = useFleetForm();
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');
  const [isProcessing, setIsProcessing] = useState(false);

  // Hydrate form with unit data
  useEffect(() => {
    if (unit) {
      controller.setFormData({
        assetTypeId: unit.assetTypeId || 0,
        id: unit.id,
        placas: unit.placas,
        numeroSerie: unit.numeroSerie,
        images: unit.images || [],
        brandId: unit.brandId || 0,
        modelId: unit.modelId || 0,
        year: unit.year || 2024,
        departmentId: unit.departmentId,
        operationalUseId: unit.operationalUseId,
        locationId: unit.locationId,
        engineTypeId: unit.engineTypeId,
        traccionId: unit.traccionId,
        transmisionId: unit.transmisionId,
        fuelTypeId: unit.fuelTypeId,
        tireSpec: unit.tireSpec,
        tireBrandId: unit.tireBrandId,
        terrainTypeId: unit.terrainTypeId,
        capacidadCarga: unit.capacidadCarga,
        fuelTankCapacity: unit.fuelTankCapacity || 0,
        odometer: unit.odometer || 0,
        maintenanceCenterId: unit.maintenanceCenterId,
        protocolStartDate: unit.protocolStartDate,
        tarjetaCirculacion: unit.tarjetaCirculacion,
        vencimientoVerificacion: unit.vencimientoVerificacion,
        circulationCardNumber: unit.circulationCardNumber,
        status: unit.status as string,
        colorId: unit.colorId,
        description: unit.description,
        maintIntervalDays: unit.maintIntervalDays || 90,
        maintIntervalKm: unit.maintIntervalKm || 5000,
        lastServiceDate: unit.lastServiceDate,
        lastServiceReading: unit.lastServiceReading || 0,
        dailyUsageAvg: unit.dailyUsageAvg,
        ownerId: unit.ownerId,
        complianceStatusId: unit.complianceStatusId,
        accountingAccount: unit.accountingAccount,
        legalComplianceDate: unit.legalComplianceDate,
        insuranceExpiryDate: unit.insuranceExpiryDate,
        insuranceCompanyId: unit.insuranceCompanyId,
        environmentalHologram: unit.environmentalHologram,
        monthlyLeasePayment: unit.monthlyLeasePayment || 0,
      });

      // We also need to trigger the cascade for catalogs
      if (unit.assetTypeId) controller.handleAssetTypeChange(unit.assetTypeId);
      if (unit.brandId) controller.handleMarcaChange(unit.brandId);
    }
  }, [unit]);

  const handleUpdateClick = (e: React.FormEvent): void => {
    e.preventDefault();
    setAuditAction('UPDATE');
    setIsAuditModalOpen(true);
  };

  const handleDeleteClick = (): void => {
    setAuditAction('DELETE');
    setIsAuditModalOpen(true);
  };

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    setIsProcessing(true);
    try {
      if (auditAction === 'UPDATE') {
        await api.patch(`/fleet/${unit.id}`, {
          data: controller.formData,
          reason,
        });
      } else {
        await api.delete(`/fleet/${unit.id}`, {
          data: { reason },
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('🔱 [Fleet Audit Error]:', err);
    } finally {
      setIsProcessing(false);
      setIsAuditModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#F8FAFC] animate-in fade-in duration-300">
      {/* Sovereign Header */}
      <div className="bg-[#0f2a44] p-6 flex justify-between items-center shadow-xl relative z-50">
        <div className="flex items-center gap-4">
          <div className="bg-yellow-500 p-2 rounded-[4px]">
            <ShieldAlert className="text-[#0f2a44]" size={24} />
          </div>
          <div>
            <h2 className="text-white font-black text-xl tracking-tighter uppercase">
              Rectificación de Activo: {unit.id}
            </h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
              Protocolo de Gestión Forense Archon
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleDeleteClick}
            className="px-6 py-2 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-[4px] font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
          >
            <Trash2 size={14} /> Eliminar Activo
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto">
          <FleetRegistrationForm
            controller={controller}
            onCancel={onClose}
            onSuccess={(): Promise<void> => Promise.resolve()} // Not used here as we intercept with Audit modal
          />
        </div>
      </div>

      {/* Persistent Action Bar */}
      <div className="bg-white border-t border-slate-200 p-6 flex justify-center shadow-[0_-10px_30px_rgba(0,0,0,0.05)] relative z-50">
        <button
          onClick={handleUpdateClick}
          disabled={isProcessing}
          className="bg-navy-900 text-white px-12 py-4 rounded-[4px] font-black text-sm uppercase tracking-[0.3em] hover:bg-sky-900 transition-all shadow-2xl flex items-center gap-3 active:scale-95"
        >
          <Save size={18} /> Guardar Cambios con Auditoría
        </button>
      </div>

      <AuditJustificationModal
        isOpen={isAuditModalOpen}
        onClose={(): void => setIsAuditModalOpen(false)}
        onConfirm={(reason: string): Promise<void> => handleConfirmAudit(reason)}
        title={
          auditAction === 'UPDATE'
            ? `Actualización técnica para el activo ${unit.id}`
            : `Baja definitiva del activo ${unit.id} del inventario industrial`
        }
        actionType={auditAction}
      />
    </div>
  );
};

export default FleetEditModal;
