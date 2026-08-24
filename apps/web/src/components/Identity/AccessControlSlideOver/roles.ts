/** Clase de badge visual por rol (FC163 F1B-3, split Alfa 219_AN). */
export function getRoleBadgeClass(roleId: number): string {
  switch (roleId) {
    case 0: // MASTER
      return 'bg-[#0f2a44] text-[#f2b705] border-[#f2b705]/30';
    case 1: // GERENTE GENERAL
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 2: // SUPERINTENDENTE DE MINA
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 3: // JEFE DE MANTENIMIENTO DE MINA
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 4: // PLANEADOR SR
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 5: // TÉCNICO ESPECIALISTA (MECÁNICO/ELÉCTRICO)
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 6: // OPERADOR DE UNIDAD
      return 'bg-slate-50 text-slate-500 border-slate-200';
    default:
      return 'bg-gray-50 text-gray-400 border-gray-100';
  }
}

const ROLE_NAMES: Record<number, string> = {
  0: 'MASTER (ARCHON)',
  1: 'GERENTE GENERAL',
  2: 'SUPERINTENDENTE DE MINA',
  3: 'JEFE DE MANTENIMIENTO DE MINA',
  4: 'PLANEADOR SR',
  5: 'TÉCNICO ESPECIALISTA (MECÁNICO/ELÉCTRICO)',
  6: 'OPERADOR DE UNIDAD',
};

/** Nombre visible del rol (FC163 F1B-3, split Alfa 219_AN). */
export function getRoleName(roleId: number): string {
  return ROLE_NAMES[roleId] || 'DESCONOCIDO';
}

/** IDs de rol asignables desde el formulario de registro (Master queda fuera). */
export const ASSIGNABLE_ROLE_IDS = [1, 2, 3, 4, 5, 6];
