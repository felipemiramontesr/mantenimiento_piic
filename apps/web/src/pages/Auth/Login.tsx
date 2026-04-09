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
      {/* 🌌 SECCIÓN DE MARCA: Autoridad & Visión (Left) */}
      <section className="brand-panel">
        <img src={backgroundImage} alt="Industrial Hangar" className="brand-bg-image" />
        <div className="brand-overlay"></div>
        
        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="fixed-logo-container">
            <PiicLogo />
          </div>
          <p className="text-accent text-xs font-black uppercase tracking-[0.4em]">
            Pinnacle Identity
          </p>
        </div>

        {/* Middle: Cinematic Slogan */}
        <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Suministro industrial, tecnológico y comercial <br/>
            <span className="slogan-accent">para operaciones que no pueden detenerse</span>
          </h1>
          <p className="text-white/80 text-lg mt-6 font-medium max-w-lg">
            Respuesta rápida y suministro confiable para el sector minero e industrial.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-10">
            <button className="px-8 py-3 bg-accent text-primary font-bold rounded-sm hover:brightness-105 transition-all">
              Solicitar cotización
            </button>
            <a 
              href="https://www.piic.com.mx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-8 py-3 border border-white text-white font-bold rounded-sm hover:bg-white/10 transition-all text-center"
            >
              Ir al sitio oficial
            </a>
          </div>
        </div>

        {/* Bottom: System Metadata */}
        <div className="relative z-10 flex items-center gap-6 text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">
          <span>Archon Operating System</span>
          <span className="w-12 h-px bg-white/10"></span>
          <span>v1.4.0 High-End</span>
        </div>
      </section>

      {/* 🛡️ SECCIÓN DE ACCESO: Precisión Operativa (Right) */}
      <section className="form-panel">
        <div className="auth-card">
          {/* Header del Formulario */}
          <header className="mb-12">
            <h2 className="text-3xl font-black text-primary uppercase tracking-tight">
              Acceso Archon
            </h2>
            <p className="text-slate-500 text-sm mt-3 font-semibold uppercase tracking-widest leading-relaxed">
              Mantenimiento Vehicular | PIIC
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded shadow-sm">
                ALERTA: {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label className="block text-primary text-[10px] font-black uppercase tracking-[0.25em] ml-1">
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
              <label className="block text-primary text-[10px] font-black uppercase tracking-[0.25em] ml-1">
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
              {loading ? 'Sincronizando...' : 'Iniciar Autenticación'}
            </button>
            
            <footer className="text-center pt-10">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                © 2026 PIIC Identity System
              </p>
              <span className="block text-[9px] text-accent italic mt-2 font-semibold">
                Engineered for visual immortality.
              </span>
            </footer>
          </form>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
