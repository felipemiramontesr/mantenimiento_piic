import React from 'react';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Users, 
  Key, 
  Mail, 
  User, 
  ChevronRight,
  ShieldAlert,
  Save,
  Loader2
} from 'lucide-react';

interface AccessControlSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🔱 Archon Identity: AccessControlSlideOver
 * Version: 1.0.0
 * Purpose: Unified interface for personnel management and role assignment.
 */
const AccessControlSlideOver: React.FC<AccessControlSlideOverProps> = ({ isOpen, onClose }) => {
  const [view, setView] = React.useState<'list' | 'create'>('list');
  const [users, setUsers] = React.useState<any[]>([]);
  const [formData, setFormData] = React.useState({
    username: '',
    email: '',
    password: '',
    role_id: 2 // Default: Operador
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUsers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.VITE_API_URL || 'http://localhost:3001'}/v1/auth/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('archon_token')}`
        }
      });
      const data = await response.json();
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect((): void => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.VITE_API_URL || 'http://localhost:3001'}/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('archon_token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      await fetchUsers();
      setView('list');
      setFormData({ username: '', email: '', password: '', role_id: 2 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (roleId: number): string => {
    switch (roleId) {
      case 0: return 'bg-[#0f2a44] text-[#f2b705] border-[#f2b705]/30';
      case 1: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 2: return 'bg-sky-50 text-sky-700 border-sky-100';
      case 3: return 'bg-violet-50 text-violet-700 border-violet-100';
      default: return 'bg-gray-50 text-gray-400 border-gray-100';
    }
  };

  const getRoleName = (roleId: number): string => {
    const roles: Record<number, string> = { 0: 'ARCHON', 1: 'ADMINISTRADOR', 2: 'OPERADOR', 3: 'TÉCNICO' };
    return roles[roleId] || 'DESCONOCIDO';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-[#0f2a44]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        {/* Header UI */}
        <div className="p-6 bg-[#0f2a44] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-[#f2b705]" />
            <h2 className="text-lg font-black uppercase tracking-widest">Control de Acceso</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setView('list')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'border-b-2 border-[#0f2a44] text-[#0f2a44]' : 'text-gray-300 hover:text-gray-500'}`}
          >
            Plantilla Activa
          </button>
          <button 
            onClick={() => setView('create')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'create' ? 'border-b-2 border-[#0f2a44] text-[#0f2a44]' : 'text-gray-300 hover:text-gray-500'}`}
          >
            Registrar Personal
          </button>
        </div>

        {/* Dynamic Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {view === 'list' ? (
            <div className="space-y-4">
              {isLoading && users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                   <Loader2 size={32} className="animate-spin mb-4" />
                   <span className="text-[10px] font-black uppercase">Sincronizando Vault...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20 opacity-30 italic text-sm">Sin personal registrado.</div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="p-4 border border-gray-100 rounded-lg flex items-center justify-between hover:border-[#0f2a44]/20 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center text-[#0f2a44]">
                        <User size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#0f2a44] uppercase">{u.username}</h4>
                        <div className={`mt-1 inline-block px-2 py-0.5 rounded border text-[8px] font-black uppercase ${getRoleBadge(u.role_id)}`}>
                          {getRoleName(u.role_id)}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 text-red-700">
                  <ShieldAlert size={18} />
                  <span className="text-xs font-bold uppercase">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-2">
                  <Users size={12} /> Identidad de Usuario
                </label>
                <input 
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold outline-none focus:border-[#0f2a44] transition-all" 
                  placeholder="Ej. juan.perez"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-2">
                  <Mail size={12} /> Correo Corporativo
                </label>
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold outline-none focus:border-[#0f2a44] transition-all" 
                  placeholder="email@piic.com.mx"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-2">
                  <Key size={12} /> Credencial de Acceso
                </label>
                <input 
                  required
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold outline-none focus:border-[#0f2a44] transition-all" 
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase opacity-40 flex items-center gap-2">
                  <ShieldCheck size={12} /> Nivel de Autorización (Rol)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3].map((rId): React.ReactElement => (
                    <button
                      key={rId}
                      type="button"
                      onClick={(): void => setFormData({...formData, role_id: rId})}
                      className={`p-3 rounded border text-[9px] font-black uppercase transition-all ${
                        formData.role_id === rId 
                          ? 'bg-[#0f2a44] text-white border-[#0f2a44]' 
                          : 'bg-white border-gray-100 text-gray-400 hover:border-[#0f2a44]/3'
                      }`}
                    >
                      {getRoleName(rId)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8">
                <button 
                  disabled={isLoading}
                  className="w-full p-5 bg-[#0f2a44] text-white rounded-lg font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#071626] transition-all shadow-xl disabled:opacity-50"
                >
                  {isLoading ? 'Registrando...' : <><Save size={16} /> Guardar Identidad</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessControlSlideOver;
