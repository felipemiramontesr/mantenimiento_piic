import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import PiicLogo from '../../components/Logo/PiicLogo';
import api from '../../api/client';
import serviceBackground from '../../assets/service-bg.png';

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
    <div className="auth-grid-container">
      {/* 🌌 ATMOSPHERIC LAYER */}
      <img src={serviceBackground} alt="Service Workshop" className="hero-bg-image" />
      <div className="hero-overlay"></div>

      {/* 🛡️ LOGIN PANEL (TOP PRIORITY - 10/80/10 STRUCTURE) */}
      <section className="login-panel">
        <header className="login-panel-header">
           <PiicLogo />
        </header>

        <main className="login-panel-body">
          <div className="auth-card animate-in fade-in zoom-in duration-1000 delay-300">
            <header>
              <h2 className="font-black tracking-tighter">
                Acceso Archon
              </h2>
              <p className="subtitle-brand text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                Control de Flotas
              </p>
              <p className="subtitle-brand text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                Powered by PIIC TECH
              </p>
            </header>

            <form onSubmit={handleLogin} className="login-form">
              {error && (
                <div className="p-4 bg-red-500/10 text-red-400 text-[11px] font-black uppercase rounded border-l-4 border-red-500/50 backdrop-blur-md mb-6">
                   Error de Sistema: {error}
                </div>
              )}
              
              <div className="form-group">
                <label className="text-[11px] font-bold uppercase tracking-[0.3em] ml-1">
                  Identidad de Usuario
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

              <div className="form-group">
                <label className="text-[11px] font-bold uppercase tracking-[0.3em] ml-1">
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

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="diamond-button"
                >
                  {loading ? 'Validando...' : 'Ingresar'}
                </button>
              </div>

              <div className="forgot-password-container">
                <a href="#" className="forgot-password-link">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </form>
          </div>
        </main>

        <footer className="login-panel-footer">
           <span className="copyright-text-banded">
             © 2026 PIIC GROUP
           </span>
        </footer>
      </section>

      {/* 🏙️ HERO CONTENT (BOTTOM SYMMETRY - 100vh) */}
      <section className="hero-section">
        <header className="hero-header animate-in fade-in duration-1000">
           <PiicLogo />
        </header>

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
              Contactar a un asesor
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

        <footer className="hero-footer animate-in fade-in duration-1000 delay-500">
          <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">
            Archon System | Powered by PIIC TECH
          </div>
          <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">
            Todos los derechos reservados © 2026 PIIC GROUP
          </div>
        </footer>
      </section>

      {/* 🍪 COOKIE BANNER PIIC */}
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
          <div className="cookie-actions">
            <button onClick={(): void => setShowCookies(false)} className="cookie-btn-secondary">
              RECHAZAR
            </button>
            <button onClick={acceptCookies} className="cookie-btn">
              ACEPTAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
