import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import PiicLogo from '../../components/Logo/PiicLogo';
import api from '../../api/client';
import backgroundImage from '../../assets/hangar-bg.png';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ error: string }>;
      const message = axiosError.response?.status === 401 
        ? 'Credenciales inválidas. Verifique su ID de Archon.' 
        : 'Error de conexión. Intente de nuevo más tarde.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      {/* 🌌 PANEL IZQUIERDO: Branding & Autoridad (Desktop Only) */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center p-16 flex-col justify-between overflow-hidden"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 brand-panel-overlay z-0"></div>
        
        <div className="relative z-10 animate-in fade-in slide-in-from-left duration-700">
          <PiicLogo className="scale-125 origin-left" />
        </div>

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
          <h2 className="text-[#F2B705] text-xs font-black uppercase tracking-[0.3em] mb-4">
            Identity Manifesto
          </h2>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight uppercase">
            Suministro industrial, tecnológico y comercial <br/>
            <span className="text-[#F2B705]">para operaciones que no pueden detenerse</span>
          </h1>
          <div className="w-24 h-1.5 bg-[#F2B705] mt-8 rounded-full"></div>
        </div>

        <div className="relative z-10 text-white/40 text-xs font-medium uppercase tracking-widest flex items-center gap-4">
          <span>PIIC ARCHON SYSTEM</span>
          <span className="w-8 h-px bg-white/20"></span>
          <span>EST. 2026</span>
        </div>
      </div>

      {/* 🛡️ PANEL DERECHO: Operación & Acceso (Mobile First) */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F2F4F7] relative">
        {/* Mobile Logo Branding (Visible only on mobile/tablet) */}
        <div className="absolute top-8 lg:hidden animate-in fade-in zoom-in duration-500">
          <PiicLogo />
        </div>

        <div className="w-full max-w-[420px] glass-card p-8 md:p-12 rounded-lg animate-in fade-in slide-in-from-bottom lg:slide-in-from-right duration-700">
          <div className="mb-10 lg:text-left text-center">
            <h3 className="text-2xl font-black text-[#0F2A44] uppercase tracking-tight">
              Acceso Archon
            </h3>
            <p className="text-slate-500 text-sm mt-2 font-medium uppercase tracking-widest">
              Sistema de Mantenimiento Vehicular | PIIC
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded animate-in slide-in-from-top">
                <span className="font-bold">Aviso:</span> {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-[#0F2A44] text-[10px] font-black uppercase tracking-[0.2em] ml-1">
                Identidad / Usuario
              </label>
              <input 
                type="text" 
                className="diamond-input"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setUsername(e.target.value)}
                placeholder="Introduzca su Archon ID"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[#0F2A44] text-[10px] font-black uppercase tracking-[0.2em] ml-1">
                Clave de Seguridad
              </label>
              <input 
                type="password" 
                className="diamond-input"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="diamond-button mt-4"
            >
              {loading ? 'Validando...' : 'Iniciar Autenticación'}
            </button>
            
            <div className="text-center mt-8">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                © 2026 PIIC Identity System
              </p>
              <p className="text-[9px] text-slate-300 italic mt-1">
                Engineered for visual immortality.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
