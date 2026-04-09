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
    <div className="auth-grid-container bg-[#F2F4F7]">
      {/* 🌌 PANEL DE MARCA (Izquierda) - Blindado contra desbordamientos */}
      <section className="brand-panel min-h-[400px] lg:min-h-screen">
        <img src={backgroundImage} alt="Hangar" className="brand-bg-image" />
        <div className="brand-overlay"></div>
        
        {/* Logo con Bloqueo de Hardware (90px) */}
        <div className="relative z-10" style={{ width: '90px', height: '90px' }}>
          <PiicLogo />
        </div>

        {/* Contenedor Informativo Homologado */}
        <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom duration-1000">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Suministro industrial, tecnológico y comercial <br/>
            <span className="text-[#F2B705]">para operaciones que no pueden detenerse</span>
          </h1>
          <p className="text-white/80 text-lg mt-6 font-medium max-w-lg">
            Respuesta rápida y suministro confiable para el sector minero e industrial.
          </p>
          
          {/* Arquitectura de Botones (Fidelidad Flecha Roja) */}
          <div className="flex flex-wrap items-center gap-6 mt-12">
            <button className="px-8 py-3 bg-[#F2B705] text-[#0F2A44] font-black text-sm uppercase tracking-wider rounded-sm hover:brightness-105 transition-all shadow-lg">
              Solicitar cotización
            </button>
            <a 
              href="https://www.piic.com.mx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-3 border-2 border-white text-white font-black text-sm uppercase tracking-wider rounded-sm hover:bg-white/10 transition-all text-center"
            >
              Ir al sitio oficial
            </a>
          </div>
        </div>

        <div className="relative z-10 text-white/30 text-[9px] font-black uppercase tracking-[0.4em]">
          Archon Operating System | PIIC Identity
        </div>
      </section>

      {/* 🛡️ PANEL DE ACCESO (Derecha) */}
      <section className="form-panel">
        <div className="auth-card">
          <header className="mb-12">
            <h2 className="text-3xl font-black text-[#0F2A44] uppercase tracking-tighter">
              Acceso Archon
            </h2>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mt-3">
              Mantenimiento Vehicular | PIIC
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase rounded">
                ALERTA DE SISTEMA: {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label className="block text-[#0F2A44] text-[10px] font-black uppercase tracking-[0.3em] ml-1">
                Identidad / Usuario
              </label>
              <input 
                type="text" 
                className="diamond-input"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setUsername(e.target.value)}
                placeholder="INTRODUZCA ARCHON ID"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="block text-[#0F2A44] text-[10px] font-black uppercase tracking-[0.3em] ml-1">
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
              className="diamond-button"
              style={{ backgroundColor: '#F2B705', color: '#0F2A44' }}
            >
              {loading ? 'Sincronizando...' : 'Iniciar Autenticación'}
            </button>
            
            <footer className="text-center pt-8">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                © 2026 PIIC Identity System
              </p>
            </footer>
          </form>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
