import React, { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/client';
import { AreaEditInput } from './AreaEditInput';
import { useAuth } from '../../context/AuthContext';

interface Area {
  id: number;
  owner_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface OwnerAreasResult {
  ownerId: number;
  areas: Area[];
}

/** Distingue el caso "sin propietario asociado" (mensaje específico) de
 * cualquier otra falla de red (mensaje genérico) — ver `useAreaLoader`. */
class NoOwnerError extends Error {}

/** T5 `GET /auth/users/:id/owners` + `GET /owners/:id/areas` — extraído del
 * efecto de carga para mantener `useAreaLoader` bajo el presupuesto de Gate2
 * (FC165 F3 Slice3.1 Batch2, Dual-Gate Isolation). */
async function fetchOwnerAreas(userId: string | number): Promise<OwnerAreasResult> {
  const ownersRes = await api.get<{
    success: boolean;
    data: { ownerId: number; label: string }[];
  }>(`/auth/users/${userId}/owners`);
  const ownerData = ownersRes.data.data;
  if (!ownerData || ownerData.length === 0) {
    throw new NoOwnerError('No se encontró un propietario asociado a este usuario');
  }
  const { ownerId } = ownerData[0];
  const areasRes = await api.get<{ success: boolean; data: Area[] }>(`/owners/${ownerId}/areas`);
  return { ownerId, areas: areasRes.data.data };
}

interface AreaLoaderResult {
  ownerId: number | null;
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  isLoading: boolean;
  error: string | null;
  setError: (v: string | null) => void;
}

/** Estado + carga inicial de Áreas del owner del usuario actual. */
function useAreaLoader(currentUser: { id: string | number } | null): AreaLoaderResult {
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    fetchOwnerAreas(currentUser.id)
      .then((result) => {
        setOwnerId(result.ownerId);
        setAreas(result.areas);
      })
      .catch((err: unknown) =>
        setError(err instanceof NoOwnerError ? err.message : 'Error al cargar las áreas')
      )
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  return { ownerId, areas, setAreas, isLoading, error, setError };
}

interface AreaCreation {
  newAreaName: string;
  setNewAreaName: (v: string) => void;
  isCreating: boolean;
  createArea: () => Promise<void>;
}

interface AreaEditing {
  editId: number | null;
  setEditId: (v: number | null) => void;
  editName: string;
  setEditName: (v: string) => void;
  saveEdit: (areaId: number) => Promise<void>;
  deactivateArea: (areaId: number) => Promise<void>;
}

type AreaMutations = AreaCreation & AreaEditing;

async function postNewArea(ownerId: number, name: string): Promise<Area> {
  const res = await api.post<{ success: boolean; data: Area }>(`/owners/${ownerId}/areas`, {
    name,
  });
  return res.data.data;
}

async function putAreaName(ownerId: number, areaId: number, name: string): Promise<void> {
  await api.put(`/owners/${ownerId}/areas/${areaId}`, { name });
}

// FC165 F3 Slice3.1 — purga: `ownerId` tipado `number|null` (en vez de
// exigir no-nulo con `!`) porque el único caller real (deactivateArea de
// `useAreaMutations`) lo invoca solo tras `useAreaLoader` resolverlo
// (censo vivo: 0 hits en un guard `if(!ownerId)` equivalente).
async function deleteArea(ownerId: number | null, areaId: number): Promise<void> {
  await api.delete(`/owners/${ownerId}/areas/${areaId}`);
}

/** Alta de Área — separado de `useAreaEditing` para que cada hook se
 * mantenga bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2,
 * Dual-Gate Isolation). */
function useAreaCreation(
  ownerId: number | null,
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>,
  setError: (v: string | null) => void
): AreaCreation {
  const [newAreaName, setNewAreaName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createArea = async (): Promise<void> => {
    if (!ownerId || !newAreaName.trim()) return;
    setIsCreating(true);
    try {
      const area = await postNewArea(ownerId, newAreaName.trim());
      setAreas((prev) => [...prev, area]);
      setNewAreaName('');
    } catch {
      setError('Error al crear el área');
    } finally {
      setIsCreating(false);
    }
  };

  return { newAreaName, setNewAreaName, isCreating, createArea };
}

/** Edición/desactivación de Área — ver nota de `useAreaCreation`. */
function useAreaEditing(
  ownerId: number | null,
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>,
  setError: (v: string | null) => void
): AreaEditing {
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const saveEdit = async (areaId: number): Promise<void> => {
    if (!ownerId || !editName.trim()) return;
    try {
      await putAreaName(ownerId, areaId, editName.trim());
      setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, name: editName.trim() } : a)));
      setEditId(null);
    } catch {
      setError('Error al actualizar el área');
    }
  };

  const deactivateArea = async (areaId: number): Promise<void> => {
    try {
      await deleteArea(ownerId, areaId);
      setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, is_active: false } : a)));
    } catch {
      setError('Error al desactivar el área');
    }
  };

  return { editId, setEditId, editName, setEditName, saveEdit, deactivateArea };
}

/** Composición de `useAreaCreation` + `useAreaEditing` para el consumidor. */
function useAreaMutations(
  ownerId: number | null,
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>,
  setError: (v: string | null) => void
): AreaMutations {
  const creation = useAreaCreation(ownerId, setAreas, setError);
  const editing = useAreaEditing(ownerId, setAreas, setError);
  return { ...creation, ...editing };
}

interface AreaCreateFormProps {
  readonly newAreaName: string;
  readonly setNewAreaName: (v: string) => void;
  readonly isCreating: boolean;
  readonly createArea: () => Promise<void>;
}

/** Fila de alta rápida de Área (solo visible para isAdmin). */
function AreaCreateForm({
  newAreaName,
  setNewAreaName,
  isCreating,
  createArea,
}: AreaCreateFormProps): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <input
        type="text"
        placeholder="Nombre del área (ej: Mantenimiento)"
        className="flex-1 h-10 bg-[#0f2a44]/5 border-b-2 border-[#0f2a44]/10 focus:border-[#f2b705] px-4 rounded-[4px] text-sm font-medium text-[#0f2a44] outline-none transition-all"
        value={newAreaName}
        onChange={(e): void => setNewAreaName(e.target.value)}
        onKeyDown={(e): void => {
          if (e.key === 'Enter') createArea();
        }}
        data-testid="new-area-input"
      />
      <button
        type="button"
        onClick={createArea}
        disabled={isCreating || !newAreaName.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-[#0f2a44] text-white rounded-md text-sm font-semibold disabled:opacity-50 hover:bg-[#0f2a44]/90 transition-colors"
        data-testid="create-area-btn"
      >
        <Plus size={14} />
        Crear
      </button>
    </div>
  );
}

interface AreaEditToggleProps {
  readonly area: Area;
  readonly editId: number | null;
  readonly setEditId: (v: number | null) => void;
  readonly setEditName: (v: string) => void;
  readonly saveEdit: (areaId: number) => Promise<void>;
}

/** Botón "Guardar" (en edición) o "Editar" (en reposo) de una fila de Área. */
function AreaEditToggle({
  area,
  editId,
  setEditId,
  setEditName,
  saveEdit,
}: AreaEditToggleProps): React.JSX.Element {
  if (editId === area.id) {
    return (
      <button
        type="button"
        onClick={(): Promise<void> => saveEdit(area.id)}
        className="text-emerald-600 hover:text-emerald-700"
        title="Guardar"
        data-testid={`save-edit-${area.id}`}
      >
        <CheckCircle size={16} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={(): void => {
        setEditId(area.id);
        setEditName(area.name);
      }}
      className="text-[#0f2a44]/40 hover:text-[#0f2a44]"
      title="Editar"
      data-testid={`edit-btn-${area.id}`}
    >
      <Pencil size={14} />
    </button>
  );
}

interface AreaRowActionsProps {
  readonly area: Area;
  readonly isAdmin: boolean;
  readonly editId: number | null;
  readonly setEditId: (v: number | null) => void;
  readonly setEditName: (v: string) => void;
  readonly saveEdit: (areaId: number) => Promise<void>;
  readonly deactivateArea: (areaId: number) => Promise<void>;
}

/** Botonera de una fila de Área: guardar/editar/desactivar, o badge "Inactiva". */
function AreaRowActions({
  area,
  isAdmin,
  editId,
  setEditId,
  setEditName,
  saveEdit,
  deactivateArea,
}: AreaRowActionsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {area.is_active && isAdmin && (
        <>
          <AreaEditToggle
            area={area}
            editId={editId}
            setEditId={setEditId}
            setEditName={setEditName}
            saveEdit={saveEdit}
          />
          <button
            type="button"
            onClick={(): Promise<void> => deactivateArea(area.id)}
            className="text-red-400 hover:text-red-600"
            title="Desactivar"
            data-testid={`deactivate-btn-${area.id}`}
          >
            <XCircle size={16} />
          </button>
        </>
      )}
      {!area.is_active && (
        <span className="text-xs text-slate-400" data-testid={`area-inactive-${area.id}`}>
          Inactiva
        </span>
      )}
    </div>
  );
}

interface AreaRowProps {
  readonly area: Area;
  readonly isAdmin: boolean;
  readonly editId: number | null;
  readonly setEditId: (v: number | null) => void;
  readonly editName: string;
  readonly setEditName: (v: string) => void;
  readonly saveEdit: (areaId: number) => Promise<void>;
  readonly deactivateArea: (areaId: number) => Promise<void>;
}

/** Una fila de la lista de Áreas: nombre (o input de edición) + botonera. */
function AreaRow({
  area,
  isAdmin,
  editId,
  setEditId,
  editName,
  setEditName,
  saveEdit,
  deactivateArea,
}: AreaRowProps): React.JSX.Element {
  return (
    <li
      className={`flex items-center justify-between px-4 py-3 rounded-md border ${
        area.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
      }`}
      data-testid={`area-item-${area.id}`}
    >
      {editId === area.id ? (
        <AreaEditInput
          areaId={area.id}
          value={editName}
          onChange={setEditName}
          onSave={(): Promise<void> => saveEdit(area.id)}
          onCancel={(): void => setEditId(null)}
        />
      ) : (
        <span
          className="flex-1 text-sm font-semibold text-[#0f2a44]"
          data-testid={`area-name-${area.id}`}
        >
          {area.name}
        </span>
      )}
      <AreaRowActions
        area={area}
        isAdmin={isAdmin}
        editId={editId}
        setEditId={setEditId}
        setEditName={setEditName}
        saveEdit={saveEdit}
        deactivateArea={deactivateArea}
      />
    </li>
  );
}

interface AreasListProps {
  readonly areas: Area[];
  readonly isAdmin: boolean;
  readonly mutations: AreaMutations;
}

/** Lista de Áreas, o el mensaje de estado vacío. */
function AreasList({ areas, isAdmin, mutations }: AreasListProps): React.JSX.Element {
  if (areas.length === 0) {
    return (
      <p className="text-[#0f2a44]/40 text-sm text-center py-6" data-testid="areas-empty">
        No hay áreas configuradas. Crea la primera arriba.
      </p>
    );
  }
  return (
    <ul className="space-y-2" data-testid="areas-list">
      {areas.map((area) => (
        <AreaRow
          key={area.id}
          area={area}
          isAdmin={isAdmin}
          editId={mutations.editId}
          setEditId={mutations.setEditId}
          editName={mutations.editName}
          setEditName={mutations.setEditName}
          saveEdit={mutations.saveEdit}
          deactivateArea={mutations.deactivateArea}
        />
      ))}
    </ul>
  );
}

/** Gestión de Áreas del owner del usuario actual: alta, edición y
 * desactivación (solo isAdmin) — composición de `useAreaLoader` +
 * `useAreaMutations` (FC165 F3 Slice3.1 Batch2, Dual-Gate Isolation). */
const AreasPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const permissions: string[] =
    (currentUser as { permissions?: string[] } | null)?.permissions ?? [];
  const isAdmin = permissions.includes('*') || permissions.includes('user:admin');
  const { ownerId, areas, setAreas, isLoading, error, setError } = useAreaLoader(currentUser);
  const mutations = useAreaMutations(ownerId, setAreas, setError);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="areas-loading">
        <div className="animate-spin w-6 h-6 border-2 border-[#0f2a44] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <Building2 size={20} className="text-[#0f2a44]" />
        <h3 className="text-[#0f2a44] font-bold text-lg">Gestión de Áreas</h3>
      </div>

      {error && (
        <div
          className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm"
          data-testid="areas-error"
        >
          {error}
        </div>
      )}

      {isAdmin && <AreaCreateForm {...mutations} />}
      <AreasList areas={areas} isAdmin={isAdmin} mutations={mutations} />
    </div>
  );
};

export default AreasPanel;
