import { UserIndustrial } from '../../../types/user';
import { FleetUnit } from '../../../types/fleet';
import { RouteLog } from './types';

/** Busca coincidencia de query en el operador (nombre/número de empleado) (FC163 F2B4 Sub-Batch 4B-2). */
export function matchOperator(
  operator: UserIndustrial | undefined,
  query: string
): { label: string; value: string } | null {
  if (!operator) return null;
  if (operator.fullName?.toLowerCase().includes(query)) {
    return { label: 'Operador', value: operator.fullName };
  }
  if (operator.employeeNumber?.toLowerCase().includes(query)) {
    return { label: 'No. Operador', value: operator.employeeNumber };
  }
  return null;
}

/** Busca coincidencia de query en la unidad (marca/modelo/sede) (FC163 F2B4 Sub-Batch 4B-2). */
export function matchUnitDetails(
  unit: FleetUnit | undefined,
  query: string
): { label: string; value: string } | null {
  if (!unit) return null;
  if (unit.marca?.toLowerCase().includes(query)) {
    return { label: 'Marca', value: unit.marca };
  }
  if (unit.modelo?.toLowerCase().includes(query)) {
    return { label: 'Modelo', value: unit.modelo };
  }
  if (unit.sede?.toLowerCase().includes(query)) {
    return { label: 'Sede', value: unit.sede };
  }
  return null;
}

/** Busca coincidencia de query en cualquier campo relevante de una ruta (FC163 F2B4 Sub-Batch 4B-2). */
export function matchFieldInRoute(
  log: RouteLog,
  query: string,
  users: UserIndustrial[],
  units: FleetUnit[]
): { label: string; value: string } | null {
  if (log.unit_id?.toLowerCase().includes(query)) {
    return { label: 'Unidad', value: log.unit_id };
  }
  const operator = users.find((u) => u.id === String(log.operator_id));
  const operatorMatch = matchOperator(operator, query);
  if (operatorMatch) return operatorMatch;

  if (log.origin?.toLowerCase().includes(query)) {
    return { label: 'Origen', value: log.origin };
  }
  if (log.destination?.toLowerCase().includes(query)) {
    return { label: 'Destino', value: log.destination };
  }
  if (log.description?.toLowerCase().includes(query)) {
    return { label: 'Misión', value: log.description };
  }
  const unit = units.find((u) => u.id === log.unit_id);
  const unitMatch = matchUnitDetails(unit, query);
  if (unitMatch) return unitMatch;

  return null;
}
