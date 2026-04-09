import React, { useState, useEffect } from 'react';
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
  const [showCookies, setShowCookies] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const cookiesAccepted = localStorage.getItem('cookies_accepted');
    if (!cookiesAccepted) {
      setShowCookies(true);
    }
  }, []);

  const acceptCookies = (): void => {
    localStorage.setItem('cookies_accepted', 'true');
    setShowCookies(false);
  };

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
    <div className="auth-grid-container relative">
      {/* 🌌 HERO SECTION (70% Desktop) - 10/80/10 Proportion */}
      <section className="hero-section">
        <img src={backgroundImage} alt="Background" className="hero-bg-image" />
        <div className="hero-overlay"></div>
        
        {/* HEADER (10%) */}
        <header className="hero-header animate-in fade-in duration-1000">
           <PiicLogo />
        </header>

        {/* BODY (80%) */}
        <main className="hero-body animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
          <h1 className="hero-title">
            Suministro industrial, tecnológico y comercial para operaciones que no pueden detenerse
          </h1>
          <p className="hero-subtitle">
            Respuesta rápida y suministro confiable para el sector minero e industrial.
          </p>
          
          <div className="hero-actions">
            <a 
              href="https://wa.me/5214929421780" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Solicitar cotización
            </a>
            <a 
              href="https://piic.com.mx/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Ver sitio Web
            </a>
          </div>
        </main>

        {/* FOOTER (10%) */}
        <footer className="hero-footer animate-in fade-in duration-1000 delay-500">
          <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">
            Archon Systems | PIIC Identity Standard
          </div>
        </footer>
      </section>

      {/* 🛡️ LOGIN PANEL (30% Desktop) */}
      <section className="login-panel">
        <div className="auth-card">
          <header className="mb-12">
            <h2 className="text-3xl font-black text-[#0f2a44] tracking-tighter">
              Acceso Archon
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
              Mantenimiento Vehicular | PIIC
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded border-l-4 border-red-200">
                Error de Sistema: {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-[0.3em] ml-1">
                Identidad / Usuario
              </label>
              <input 
                type="text" 
                className="diamond-input"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setUsername(e.target.value)}
                placeholder="ID de Archon"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[#0f2a44] uppercase tracking-[0.3em] ml-1">
                Clave de Seguridad
              </label>
              <input 
                type="password" 
                className="diamond-input"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setPassword(e.target.value)}
                placeholder="••••••••"
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
            
            <div className="text-center pt-10">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em]">
                © 2026 PIIC GROUP
              </span>
            </div>
          </form>
        </div>
      </section>

      {/* 🍪 COOKIE BANNER */}
      {showCookies && (
        <div className="cookie-banner animate-in slide-in-from-bottom duration-500">
          <p className="cookie-text">
            Utilizamos cookies propias y de terceros. Al continuar navegando, acepta esta{' '}
            <a 
              href="https://piic.com.mx/politicas" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="cookie-link"
            >
              política de uso, tratamiento de información y cookies.
            </a>
          </p>
          <button onClick={acceptCookies} className="cookie-btn">
            ACEPTAR
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
