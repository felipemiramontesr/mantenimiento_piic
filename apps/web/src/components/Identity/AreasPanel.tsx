import React, { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Area {
  id: number;
  owner_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

const AreasPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const ownersRes = await api.get<{
          success: boolean;
          data: { ownerId: number; label: string }[];
        }>(`/auth/users/${currentUser.id}/owners`);
        const ownerData = ownersRes.data.data;
        if (!ownerData || ownerData.length === 0) {
          setError('No se encontró un propietario asociado a este usuario');
          return;
        }
        const resolvedId = ownerData[0].ownerId;
        setOwnerId(resolvedId);
        const areasRes = await api.get<{ success: boolean; data: Area[] }>(
          `/owners/${resolvedId}/areas`
        );
        setAreas(areasRes.data.data);
      } catch {
        setError('Error al cargar las áreas');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const createArea = async (): Promise<void> => {
    if (!ownerId || !newAreaName.trim()) return;
    setIsCreating(true);
    try {
      const res = await api.post<{ success: boolean; data: Area }>(`/owners/${ownerId}/areas`, {
        name: newAreaName.trim(),
      });
      setAreas((prev) => [...prev, res.data.data]);
      setNewAreaName('');
    } catch {
      setError('Error al crear el área');
    } finally {
      setIsCreating(false);
    }
  };

  const saveEdit = async (areaId: number): Promise<void> => {
    if (!ownerId || !editName.trim()) return;
    try {
      await api.put(`/owners/${ownerId}/areas/${areaId}`, { name: editName.trim() });
      setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, name: editName.trim() } : a)));
      setEditId(null);
    } catch {
      setError('Error al actualizar el área');
    }
  };

  const deactivateArea = async (areaId: number): Promise<void> => {
    if (!ownerId) return;
    try {
      await api.delete(`/owners/${ownerId}/areas/${areaId}`);
      setAreas((prev) => prev.map((a) => (a.id === areaId ? { ...a, is_active: false } : a)));
    } catch {
      setError('Error al desactivar el área');
    }
  };

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

      {areas.length === 0 ? (
        <p className="text-[#0f2a44]/40 text-sm text-center py-6" data-testid="areas-empty">
          No hay áreas configuradas. Crea la primera arriba.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="areas-list">
          {areas.map((area) => (
            <li
              key={area.id}
              className={`flex items-center justify-between px-4 py-3 rounded-md border ${
                area.is_active
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50 border-slate-100 opacity-60'
              }`}
              data-testid={`area-item-${area.id}`}
            >
              {editId === area.id ? (
                <input
                  type="text"
                  className="flex-1 h-8 bg-transparent border-b-2 border-[#f2b705] outline-none text-sm font-medium text-[#0f2a44] mr-4"
                  value={editName}
                  onChange={(e): void => setEditName(e.target.value)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Enter') saveEdit(area.id);
                    if (e.key === 'Escape') setEditId(null);
                  }}
                  data-testid={`edit-input-${area.id}`}
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 text-sm font-semibold text-[#0f2a44]"
                  data-testid={`area-name-${area.id}`}
                >
                  {area.name}
                </span>
              )}
              <div className="flex items-center gap-2">
                {area.is_active && (
                  <>
                    {editId === area.id ? (
                      <button
                        type="button"
                        onClick={(): Promise<void> => saveEdit(area.id)}
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Guardar"
                        data-testid={`save-edit-${area.id}`}
                      >
                        <CheckCircle size={16} />
                      </button>
                    ) : (
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
                    )}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AreasPanel;
