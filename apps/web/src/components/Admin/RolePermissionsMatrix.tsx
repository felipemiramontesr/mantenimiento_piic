import React, { useState, useEffect, useCallback } from 'react';
import { Save, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../api/client';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoleData {
  id: number;
  name: string;
  permissions: string[];
}

interface PermissionData {
  id: number;
  slug: string;
}

interface MatrixData {
  roles: RoleData[];
  allPermissions: PermissionData[];
}

// FC 078 F3 — fila sentinela para "Guardar por rol" (ex-tfoot): la primitiva
// mapea `data`, así que la fila de guardado viaja al final del arreglo.
const SAVE_ROW_ID = -1;
const SAVE_ROW_SLUG = '__save_row__';

const PERMISSION_LABELS: Record<string, string> = {
  'fleet:view': 'Ver Flota',
  'fleet:write': 'Editar Flota',
  'fleet:delete': 'Eliminar Unidades',
  'maint:view': 'Ver Mantenimientos',
  'maint:write': 'Registrar Mantenimientos',
  'financial:view': 'Ver Dashboard Financiero',
  'financial:write': 'Registrar Egresos',
  'financial:report': 'Exportar Reportes',
  'report:export': 'Exportar CSV',
  'user:admin': 'Administrar Usuarios',
};

// ─── Component ────────────────────────────────────────────────────────────────

const RolePermissionsMatrix: React.FC = (): React.ReactElement => {
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [draft, setDraft] = useState<Record<number, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedRole, setSavedRole] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMatrix = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: MatrixData }>('/admin/roles-permissions');
      const { data } = res.data;
      setMatrix(data);
      const initialDraft: Record<number, Set<string>> = {};
      data.roles.forEach(({ id, permissions: perms }) => {
        initialDraft[id] = new Set(perms);
      });
      setDraft(initialDraft);
    } catch {
      setError('No se pudo cargar la matriz de permisos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect((): void => {
    fetchMatrix();
  }, [fetchMatrix]);

  const togglePermission = (roleId: number, slug: string): void => {
    setDraft((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return { ...prev, [roleId]: next };
    });
    setSavedRole(null);
  };

  const saveRole = async (roleId: number): Promise<void> => {
    setSaving(roleId);
    try {
      await api.put(`/admin/roles/${roleId}/permissions`, {
        permissions: Array.from(draft[roleId] ?? []),
      });
      setSavedRole(roleId);
      setTimeout((): void => setSavedRole(null), 3000);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (roleId: number): boolean => {
    const original = matrix?.roles.find((r) => r.id === roleId)?.permissions ?? [];
    const current = Array.from(draft[roleId] ?? []);
    if (original.length !== current.length) return true;
    return current.some((p) => !original.includes(p));
  };

  if (loading) {
    return (
      <div className="card-archon-sovereign flex items-center justify-center h-48">
        <p className="text-archon-md font-bold text-pinnacle-navy/40 uppercase tracking-widest animate-pulse">
          Cargando matriz de permisos...
        </p>
      </div>
    );
  }

  if (error || !matrix) {
    return (
      <div className="card-archon-sovereign flex items-center justify-center h-48">
        <p className="text-archon-md font-bold text-sentinel-red uppercase tracking-widest">
          {error ?? 'Sin datos'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aviso de sesión */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[4px]">
        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-archon-md text-amber-700 font-medium">
          Los cambios aplican al <strong>próximo inicio de sesión</strong> del usuario. Las sesiones
          activas no se ven afectadas de inmediato.
        </p>
      </div>

      {/* FC 078 F3 — matriz migrada a la primitiva ArchonDataTable (SSOT
          responsive). La fila "Guardar por rol" (ex-tfoot) viaja como
          sentinela al final de `data` — misma data, mismo orden. */}
      <div className="card-archon-sovereign !p-0 overflow-hidden">
        <ArchonDataTable<PermissionData>
          data={[...matrix.allPermissions, { id: SAVE_ROW_ID, slug: SAVE_ROW_SLUG }]}
          headers={[
            { key: 'perm', label: 'Permiso', align: 'left', width: '192px' },
            ...matrix.roles.map(
              (role): ArchonTableHeader => ({
                key: `role-${role.id}`,
                label: role.name,
                align: 'center',
              })
            ),
          ]}
          minTableWidth={192 + matrix.roles.length * 110}
          testId="role-permissions-matrix"
          variant="embedded"
          renderRow={(perm): React.ReactNode =>
            perm.slug === SAVE_ROW_SLUG ? (
              <tr key="save-row" className="border-t border-pinnacle-navy/10">
                <td className="py-3 px-4 text-archon-base font-black text-pinnacle-navy/40 uppercase tracking-widest">
                  Guardar por rol
                </td>
                {matrix.roles.map((role) => (
                  <td key={role.id} className="py-3 px-2 text-center">
                    {savedRole === role.id ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-600">
                        <CheckCircle size={13} />
                        <span className="text-archon-base font-bold">Guardado</span>
                      </div>
                    ) : (
                      <button
                        onClick={(): Promise<void> => saveRole(role.id)}
                        disabled={saving === role.id}
                        className={`
                          flex items-center justify-center gap-1 mx-auto px-3 py-1.5 rounded-[4px] text-archon-base font-black uppercase tracking-widest transition-all duration-200
                          ${
                            isDirty(role.id)
                              ? 'bg-archon-gold text-pinnacle-navy hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                              : 'bg-pinnacle-navy text-white hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
                          }
                          ${saving === role.id ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <Save size={10} />
                        {saving === role.id ? 'Guardando...' : 'Guardar'}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ) : (
              <tr
                key={perm.slug}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-all duration-300"
              >
                <td className="py-2.5 px-4">
                  <span className="text-archon-md font-bold text-pinnacle-navy">
                    {PERMISSION_LABELS[perm.slug] ?? perm.slug}
                  </span>
                  <span className="block text-archon-sm font-mono text-pinnacle-navy/30 mt-0.5">
                    {perm.slug}
                  </span>
                </td>
                {matrix.roles.map((role) => (
                  <td key={role.id} className="py-2.5 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={draft[role.id]?.has(perm.slug) ?? false}
                      onChange={(): void => togglePermission(role.id, perm.slug)}
                      className="w-4 h-4 accent-pinnacle-navy cursor-pointer rounded"
                    />
                  </td>
                ))}
              </tr>
            )
          }
        />
      </div>
    </div>
  );
};

export default RolePermissionsMatrix;
