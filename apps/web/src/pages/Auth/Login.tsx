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
    <div className="auth-grid-container">
      {/* 🌌 SECCIÓN DE MARCA: Autoridad & Visión (Inmune a Cache) */}
      <section className="brand-panel">
        <img src={backgroundImage} alt="Fondo Industrial" className="brand-bg-image" />
        <div className="brand-overlay"></div>
        
        <div className="relative z-10 animate-in fade-in duration-700">
          <PiicLogo />
          <p className="text-[#F2B705] text-[10px] font-black uppercase tracking-[0.5em] mt-4">
            Pinnacle Identity
          </p>
        </div>

        <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
          <h1 className="piic-hero-slogan-v2">
            Suministro industrial, tecnológico y comercial <br/>
            <span className="piic-hero-accent-v2">para operaciones que no pueden detenerse</span>
          </h1>
          <p className="text-white/80 text-lg mt-6 font-medium max-w-lg">
            Respuesta rápida y suministro confiable para el sector minero e industrial.
          </p>
          
          <div className="flex flex-wrap items-center gap-8 mt-12">
            <button className="piic-cta-primary-v2">
              Solicitar cotización
            </button>
            <a 
              href="https://www.piic.com.mx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="piic-link-secondary-v2"
            >
              Ir al sitio oficial
            </a>
          </div>
        </div>

        <div className="relative z-10 text-white/30 text-[9px] font-bold uppercase tracking-[0.4em]">
          Archon Systems | Engineered for visual immortality
        </div>
      </section>

      {/* 🛡️ SECCIÓN DE ACCESO: Precisión Operativa */}
      <section className="form-panel">
        <div className="auth-card">
          <header className="mb-12 text-center lg:text-left">
            <h2 className="text-3xl font-black text-[#0F2A44] uppercase tracking-tight">
              Acceso Archon
            </h2>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mt-3">
              Mantenimiento Vehicular | PIIC
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase tracking-widest rounded shadow-sm animate-in slide-in-from-top">
                ⚠️ Error: {error}
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
            >
              {loading ? 'Validando...' : 'Iniciar Autenticación'}
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
