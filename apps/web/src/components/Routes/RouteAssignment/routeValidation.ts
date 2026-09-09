import { RouteLog } from '../RouteLogTable';
import { FleetUnit } from '../../../types/fleet';
import { RouteAssignmentFormData } from './types';

/**
 * Validadores puros + helpers de dirección/formulario de
 * `useRouteAssignmentControl` — extraídos a archivo propio (sin hooks de
 * React) para que tanto el hook principal como `routeAssignmentActions.ts`
 * puedan importarlos sin crear un ciclo (FC165 F3 Slice3.2 Batch1,
 * Dual-Gate Isolation).
 */

/** `formData` en blanco para un despacho nuevo (o al resetear el modal). */
export const buildEmptyFormData = (): RouteAssignmentFormData => ({
  unitId: '',
  operatorId: '',
  origin: 'Arian Silver Zacatecas',
  destination: '',
  destinationNeighborhoodId: undefined,
  description: '',
  fuelLevel: 100,
  arrivalFuelLevel: 100,
  startReading: 0,
  endReading: 0,
  fuelLitersLoaded: 0,
  fuelAmount: 0,
  fuelTicketImage: '',
  additivesCheck: false,
  tirePressureJson: '',
  checklistJson: '',
  calle: '',
  numero: '',
  numeroInterior: '',
});

interface ParsedAddress {
  calle: string;
  numero: string;
  numeroInterior: string;
}

/** Separa un string de dirección libre (`"Calle, #Num, Int. X, Colonia, ..."`)
 * en `calle`/`numero`/`numeroInterior` — best-effort vía regex, nunca lanza. */
export const parseAddress = (destinationStr: string): ParsedAddress => {
  const parts = destinationStr.split(',').map((p) => p.trim());
  let parsedCalle = '';
  let parsedNumero = '';
  let parsedNumeroInterior = '';

  if (parts.length >= 4) {
    const streetPart = parts[0];
    const intMatch = /[\s,]{1,20}Int\.?\s{0,20}(.{1,200})$/i.exec(streetPart);
    let mainStreet = streetPart;
    if (intMatch) {
      parsedNumeroInterior = intMatch[1].trim();
      mainStreet = streetPart.substring(0, intMatch.index).trim();
    }

    const numMatch = /[\s,]{1,20}#(No\.?|N[°.]?)?\s{0,20}(\S{1,50})$/i.exec(mainStreet);
    if (numMatch) {
      parsedNumero = numMatch[2].trim();
      parsedCalle = mainStreet.substring(0, numMatch.index).trim();
    } else {
      const numEndMatch = /[\s,]{1,20}(\d{1,10}[a-zA-Z]?)$/.exec(mainStreet);
      if (numEndMatch) {
        parsedNumero = numEndMatch[1].trim();
        parsedCalle = mainStreet.substring(0, numEndMatch.index).trim();
      } else {
        parsedCalle = mainStreet;
      }
    }
  }

  return { calle: parsedCalle, numero: parsedNumero, numeroInterior: parsedNumeroInterior };
};

/** Recompone el string de destino final a partir de `formData.destination`
 * + `calle`/`numero`/`numeroInterior` editados por el usuario. */
export const getFinalDestination = (formData: RouteAssignmentFormData): string => {
  let finalDest = formData.destination;
  const calle = formData.calle?.trim();
  const numero = formData.numero?.trim();
  const numeroInterior = formData.numeroInterior?.trim();

  if (calle) {
    let streetDetails = calle;
    if (numero) {
      streetDetails += ` #${numero}`;
    }
    if (numeroInterior) {
      streetDetails += ` Int. ${numeroInterior}`;
    }
    const destParts = formData.destination.split(',').map((p) => p.trim());
    let suffix = formData.destination;
    if (destParts.length >= 4) {
      suffix = destParts.slice(1).join(', ');
    } else if (destParts.length === 3) {
      suffix = destParts.join(', ');
    }
    finalDest = `${streetDetails}, ${suffix}`;
  }
  return finalDest;
};

/** Coherencia de odómetro: en edición, `endReading` no puede ser menor al
 * `startReading`; en despacho nuevo, `startReading` no puede ser menor al
 * odómetro actual de la unidad seleccionada. */
export const validateReadingFailsafe = (
  formData: RouteAssignmentFormData,
  selectedUnitData: FleetUnit | null,
  isEdit: boolean,
  routeToEdit: RouteLog | null
): string | null => {
  const end = Number(formData.endReading || 0);
  const start = Number(formData.startReading || 0);

  if (isEdit && routeToEdit) {
    if (end > 0 && end < start) {
      return `Error Forense: La lectura final (${end} KM) no puede ser menor a la inicial (${start} KM).`;
    }
  } else if (!isEdit && selectedUnitData) {
    const unitOdo = Number(selectedUnitData.odometer || 0);
    if (start < unitOdo) {
      return `Error Forense: El inicio de ruta (${start} KM) no puede ser menor al odómetro actual de la unidad (${unitOdo} KM).`;
    }
  }
  return null;
};

/** Valida que la distancia recorrida (`endReading - startReading`) sea
 * positiva y realista (≤5,000 km por misión). */
export const validateDistance = (formData: RouteAssignmentFormData): string | null => {
  const end = Number(formData.endReading || 0);
  const start = Number(formData.startReading || 0);

  if (end === 0) {
    return 'Error Forense: Debe ingresar la lectura de odómetro final para cerrar la ruta.';
  }
  if (end === start) {
    return 'Error Forense: La lectura final no puede ser igual a la lectura inicial (el viaje debe registrar movimiento).';
  }
  const distance = end - start;
  if (distance > 5000) {
    return `Error Forense: La distancia recorrida no puede superar los 5,000 km en una sola misión (${distance.toLocaleString()} km detectados).`;
  }
  return null;
};

/** Valida que `arrivalFuelLevel` sea un porcentaje real entre 0 y 100. */
export const validateFuelLevel = (formData: RouteAssignmentFormData): string | null => {
  const arrivalFuel = Number(formData.arrivalFuelLevel);
  if (Number.isNaN(arrivalFuel) || arrivalFuel < 0 || arrivalFuel > 100) {
    return `Error Forense: El nivel de combustible de llegada debe estar exactamente entre 0% y 100% (${arrivalFuel}% detectado).`;
  }
  return null;
};

/** Coherencia litros↔costo de combustible: ninguno negativo, ambos presentes
 * o ninguno, y los litros dentro de un límite realista para el tanque de la
 * unidad (o un fallback de 400L si no hay dato de capacidad). */
export const validateFuelCoherency = (
  formData: RouteAssignmentFormData,
  selectedUnitData: FleetUnit | null
): string | null => {
  const liters = Number(formData.fuelLitersLoaded || 0);
  const amount = Number(formData.fuelAmount || 0);

  if (liters < 0) {
    return 'Error Forense: Los litros de combustible cargados no pueden ser negativos.';
  }
  if (amount < 0) {
    return 'Error Forense: El costo total del combustible no puede ser negativo.';
  }

  if (liters > 0 && amount <= 0) {
    return 'Error Forense: Coherencia de Combustible - Si se cargaron litros de combustible, el costo total (Monto del Ticket) debe ser mayor a cero.';
  }
  if (amount > 0 && liters <= 0) {
    return 'Error Forense: Coherencia de Combustible - Si se registró un costo de combustible, los litros cargados deben ser mayores a cero.';
  }

  const unitCapacity = selectedUnitData?.fuelTankCapacity || 0;
  const maxAllowedLiters = unitCapacity > 0 ? unitCapacity * 1.2 : 400;
  if (liters > maxAllowedLiters) {
    return `Error Forense: Los litros de combustible cargados (${liters} L) exceden el límite realista permitido para esta unidad (${maxAllowedLiters} L${
      unitCapacity > 0
        ? ` basado en una capacidad de tanque de ${unitCapacity} L`
        : ' como límite fallback'
    }).`;
  }
  return null;
};

/** `val` es `unknown` (JSON parseado de forma libre) — un JSON malformado
 * podría dejarlo como objeto/arreglo; se rechaza igual más abajo (String()
 * de un objeto seguiría fallando el parseo Number()), pero el mensaje de
 * error usa una representación real en vez de "[object Object]" (S6551).
 * Extraída a función nombrada (mismo patrón que `alerts.calculators.ts`'s
 * `stringifyRaw`). */
function stringifyRaw(val: unknown): string {
  return typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);
}

/** Valida que cada presión de neumático capturada (DI/DD/TI/TD) en
 * `tirePressureJson`, si viene informada, esté entre 20 y 100 PSI. */
export const validateTirePressures = (formData: RouteAssignmentFormData): string | null => {
  let tires: Record<string, unknown> = {};
  try {
    tires = JSON.parse(formData.tirePressureJson || '{}');
  } catch {
    // Ignored
  }

  let errorMsg = null;
  ['DI', 'DD', 'TI', 'TD'].some((pos) => {
    const val = tires[pos];
    if (val !== undefined && val !== null) {
      const valStr = stringifyRaw(val);
      if (valStr.trim() !== '') {
        const numVal = Number(valStr);
        if (Number.isNaN(numVal) || numVal < 20 || numVal > 100) {
          errorMsg = `Error Forense: La presión del neumático ${pos} debe ser un valor realista entre 20 PSI y 100 PSI (detectado: "${valStr}").`;
          return true;
        }
      }
    }
    return false;
  });

  return errorMsg;
};

/** Compone los 5 validadores forenses en una sola pasada — usada tanto por
 * `useRouteAssignmentSubmission` como por `confirmAuditRequest`. Devuelve el
 * primer error encontrado o `null` si todo es coherente. */
export const runTelemetryValidation = (
  formData: RouteAssignmentFormData,
  selectedUnitData: FleetUnit | null,
  isEdit: boolean,
  isFinished: boolean,
  routeToEdit: RouteLog | null
): string | null => {
  const isClosingOrFinished = isFinished || (isEdit && Number(formData.endReading || 0) > 0);

  const odometerErr = validateReadingFailsafe(formData, selectedUnitData, isEdit, routeToEdit);
  if (odometerErr) return odometerErr;

  if (!isClosingOrFinished) return null;

  return (
    validateDistance(formData) ||
    validateFuelLevel(formData) ||
    validateFuelCoherency(formData, selectedUnitData) ||
    validateTirePressures(formData) ||
    null
  );
};
