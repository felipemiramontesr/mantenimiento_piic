import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import api from '../../api/client';

interface Role {
  id: number;
  name: string;
  description: string;
}

const PROTECTED_ROLE_ID = 0;

const RolesManager: React.FC = (): React.ReactElement => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRoles = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: Role[] }>('/admin/roles');
      setRoles(res.data.data);
    } catch {
      setError('No se pudo cargar la lista de roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect((): void => {
    fetchRoles();
  }, [fetchRoles]);

  const startEdit = (role: Role): void => {
    setEditingId(role.id);
    setEditName(role.name);
    setEditDesc(role.description);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  };

  const saveEdit = async (id: number): Promise<void> => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/admin/roles/${id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setRoles((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, name: editName.trim(), description: editDesc.trim() } : r
        )
      );
      cancelEdit();
    } catch {
      setError('Error al guardar el rol.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (id: number): Promise<void> => {
    setDeletingId(id);
    try {
      await api.delete(`/admin/roles/${id}`);
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al eliminar el rol.');
    } finally {
      setDeletingId(null);
    }
  };

  const addRole = async (): Promise<void> => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; data: Role }>('/admin/roles', {
        name: newName.trim(),
        description: newDesc.trim(),
      });
      setRoles((prev) => [...prev, res.data.data]);
      setNewName('');
      setNewDesc('');
      setAdding(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al crear el rol.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-archon-md font-bold text-pinnacle-navy/40 uppercase tracking-widest animate-pulse">
          Cargando roles...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-[4px]">
          <p className="text-archon-md text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]" data-testid="roles-table">
          <thead>
            <tr className="border-b border-pinnacle-navy/10">
              <th className="text-left py-2.5 px-4 text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50 w-8">
                ID
              </th>
              <th className="text-left py-2.5 px-4 text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50">
                Nombre
              </th>
              <th className="text-left py-2.5 px-4 text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50">
                Descripción
              </th>
              <th className="text-left py-2.5 px-4 text-archon-base font-black uppercase tracking-[0.2em] text-pinnacle-navy/50 w-24">
                ACCIONES
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr
                key={role.id}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-2.5 px-4 text-archon-sm font-mono text-pinnacle-navy/30">
                  {role.id}
                </td>
                <td className="py-2.5 px-4">
                  {editingId === role.id ? (
                    <input
                      value={editName}
                      onChange={(e): void => setEditName(e.target.value)}
                      className="w-full px-2 py-1 border border-pinnacle-navy/20 rounded-[4px] text-archon-md font-bold text-pinnacle-navy focus:outline-none focus:border-pinnacle-yellow"
                      data-testid="edit-name-input"
                    />
                  ) : (
                    <span className="text-archon-md font-bold text-pinnacle-navy">{role.name}</span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  {editingId === role.id ? (
                    <input
                      value={editDesc}
                      onChange={(e): void => setEditDesc(e.target.value)}
                      className="w-full px-2 py-1 border border-pinnacle-navy/20 rounded-[4px] text-archon-md text-pinnacle-navy/70 focus:outline-none focus:border-pinnacle-yellow"
                    />
                  ) : (
                    <span className="text-archon-md text-pinnacle-navy/50">{role.description}</span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  {role.id === PROTECTED_ROLE_ID && (
                    <span className="text-archon-sm font-bold text-pinnacle-yellow uppercase tracking-widest">
                      Archon
                    </span>
                  )}
                  {role.id !== PROTECTED_ROLE_ID && editingId === role.id && (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={(): Promise<void> => saveEdit(role.id)}
                        disabled={saving}
                        className="p-1.5 rounded-[4px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer"
                        data-testid="save-edit-btn"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-[4px] bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  {role.id !== PROTECTED_ROLE_ID && editingId !== role.id && (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={(): void => startEdit(role)}
                        className="p-1.5 rounded-[4px] bg-slate-100 text-pinnacle-navy/60 hover:bg-pinnacle-navy/10 transition-colors cursor-pointer"
                        data-testid={`edit-role-${role.id}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(): Promise<void> => deleteRole(role.id)}
                        disabled={deletingId === role.id}
                        className="p-1.5 rounded-[4px] bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-40"
                        data-testid={`delete-role-${role.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {adding && (
              <tr className="border-b border-pinnacle-yellow/30 bg-pinnacle-yellow/5">
                <td className="py-2.5 px-4 text-archon-sm font-mono text-pinnacle-navy/20">—</td>
                <td className="py-2.5 px-4">
                  <input
                    value={newName}
                    onChange={(e): void => setNewName(e.target.value)}
                    placeholder="Nombre del rol"
                    className="w-full px-2 py-1 border border-pinnacle-yellow rounded-[4px] text-archon-md font-bold text-pinnacle-navy focus:outline-none"
                    data-testid="new-name-input"
                    autoFocus
                  />
                </td>
                <td className="py-2.5 px-4">
                  <input
                    value={newDesc}
                    onChange={(e): void => setNewDesc(e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full px-2 py-1 border border-pinnacle-navy/20 rounded-[4px] text-archon-md text-pinnacle-navy/70 focus:outline-none focus:border-pinnacle-yellow"
                  />
                </td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={addRole}
                      disabled={saving || !newName.trim()}
                      className="p-1.5 rounded-[4px] bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer disabled:opacity-40"
                      data-testid="confirm-add-btn"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={(): void => {
                        setAdding(false);
                        setNewName('');
                        setNewDesc('');
                      }}
                      className="p-1.5 rounded-[4px] bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!adding && (
        <button
          onClick={(): void => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-pinnacle-navy text-white text-archon-md font-black uppercase tracking-widest hover:brightness-110 transition-all duration-200 cursor-pointer"
          data-testid="add-role-btn"
        >
          <Plus size={13} />
          Nuevo Rol
        </button>
      )}
    </div>
  );
};

export default RolesManager;
