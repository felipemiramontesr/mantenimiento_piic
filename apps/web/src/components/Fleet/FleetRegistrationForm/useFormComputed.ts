import React from 'react';
import { calculateMaintForecast } from '../../../utils/fleetPredictiveEngine';
import {
  predecirHologramaYEngomado,
  calcularVencimientoVerificacion,
} from '../../../utils/fleetCompliance';
import { formatDate } from '../../../utils/dateUtils';
import { UseFleetFormReturn, CreateFleetUnit } from '../../../types/fleet';
import { EnvironmentalPrediction } from './ComplianceSection';

const getPronosticoArchon = (
  formData: CreateFleetUnit
): {
  pronosticoText: string;
  pronosticoDateStr: string;
  isPronosticoReady: boolean;
} => {
  const result = {
    pronosticoText: 'A la espera de fecha de servicio y métricas...',
    pronosticoDateStr: '-- / -- / ----',
    isPronosticoReady: false,
  };

  if (!formData.lastServiceDate || !formData.maintIntervalDays) return result;

  const intDias = formData.maintIntervalDays;
  const intServi = formData.maintIntervalKm || 0;
  const dailyAvg = formData.dailyUsageAvg || 0;
  const odometer = formData.odometer || 0;
  const lastReading = formData.lastServiceReading || 0;

  const hasUsageData = intServi > 0 && dailyAvg > 0 && lastReading !== undefined;

  if (hasUsageData) {
    const forecast = calculateMaintForecast(
      intDias,
      intServi,
      dailyAvg,
      odometer,
      lastReading,
      formData.lastServiceDate
    );

    if (forecast) {
      result.pronosticoDateStr = formatDate(forecast.forecastDate);
      const motivo = forecast.serviceByKmDate < forecast.serviceByTimeDate ? 'Uso/KM' : 'Tiempo';
      result.pronosticoText = `Vencimiento proyectado por límite de ${motivo}.`;
      result.isPronosticoReady = true;
      return result;
    }
  }

  // 🔱 Fallback Soberano: Proyectar solo por tiempo
  const lastDate = new Date(formData.lastServiceDate);
  const forecastDate = new Date(lastDate);
  forecastDate.setDate(forecastDate.getDate() + intDias);

  result.pronosticoDateStr = formatDate(forecastDate);
  result.pronosticoText = 'Vencimiento proyectado por límite de Tiempo.';
  result.isPronosticoReady = true;

  return result;
};

function isDeptOk(show: boolean, departmentId: number | null | undefined): boolean {
  return !show || Boolean(departmentId);
}

function computeCanSubmit(formData: CreateFleetUnit, isFlotillaOrInternal: boolean): boolean {
  return Boolean(
    formData.brandId &&
      formData.modelId &&
      formData.year &&
      formData.year >= 1990 &&
      formData.id.trim() !== '' &&
      formData.operationalUseId &&
      isDeptOk(isFlotillaOrInternal, formData.departmentId) &&
      formData.dailyUsageAvg != null &&
      formData.dailyUsageAvg > 0
  );
}

/** 🔱 Asistente Predictivo de Cumplimiento Ambiental (Hoy No Circula) + fecha de vencimiento. */
function useEnvironmentalPrediction(
  formData: CreateFleetUnit,
  setFormData: UseFleetFormReturn['setFormData'],
  assetTypes: UseFleetFormReturn['assetTypes']
): { prediction: EnvironmentalPrediction; vencimientoVerif: string | undefined } {
  const [prediction, setPrediction] = React.useState<EnvironmentalPrediction>(null);

  React.useEffect(() => {
    const selectedAssetType = assetTypes.find((t) => t.id === formData.assetTypeId);
    const assetTypeCode = selectedAssetType?.code || null;

    if (formData.placas) {
      const pred = predecirHologramaYEngomado(
        formData.placas,
        formData.year || null,
        assetTypeCode
      );
      setPrediction(pred);

      // Auto-completar el holograma únicamente si el usuario aún no lo ha seleccionado o está vacío
      if (!formData.environmentalHologram) {
        setFormData((prev) => ({ ...prev, environmentalHologram: pred.hologramaSugerido }));
      }
    } else {
      setPrediction(null);
    }
  }, [formData.placas, formData.year, formData.assetTypeId, assetTypes]);

  const vencimientoVerif = calcularVencimientoVerificacion(
    formData.lastEnvironmentalVerification,
    formData.environmentalHologram
  );

  return { prediction, vencimientoVerif };
}

export interface FormComputed {
  canSubmit: boolean;
  pronosticoText: string;
  pronosticoDateStr: string;
  isPronosticoReady: boolean;
  prediction: EnvironmentalPrediction;
  vencimientoVerif: string | undefined;
}

/** Consolida canSubmit + pronóstico de mantenimiento + predicción ambiental (Hoy No Circula). */
export function useFormComputed(
  formData: CreateFleetUnit,
  setFormData: UseFleetFormReturn['setFormData'],
  assetTypes: UseFleetFormReturn['assetTypes'],
  isFlotillaOrInternal: boolean
): FormComputed {
  const canSubmit = computeCanSubmit(formData, isFlotillaOrInternal);
  const { pronosticoText, pronosticoDateStr, isPronosticoReady } = getPronosticoArchon(formData);
  const { prediction, vencimientoVerif } = useEnvironmentalPrediction(
    formData,
    setFormData,
    assetTypes
  );
  return {
    canSubmit,
    pronosticoText,
    pronosticoDateStr,
    isPronosticoReady,
    prediction,
    vencimientoVerif,
  };
}

export default useFormComputed;
