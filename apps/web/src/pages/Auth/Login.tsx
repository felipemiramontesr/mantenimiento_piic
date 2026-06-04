import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import PiicLogo from '../../components/Logo/PiicLogo';
import api from '../../api/client';
import serviceBackground from '../../assets/service-bg.png';
import { useAuth } from '../../context/AuthContext';

/**
 * LoginPage Component - ARCHON System (V.78.100.80)
 *
 * Final hardening of the Atomic Tailwind Architecture.
 * - Uses .btn-archon-* component classes for interaction consistency.
 * - Restores test-compliant placeholders and labels.
 * - Purged all inline kinetic transforms (scale/active).
 */
const LoginPage: React.FC = () => {
  const { login } = useAuth();
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
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      } else {
        setError('Error de protocolo: El servidor no devolvió una clave de acceso válida.');
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ error: string }>;
      const message =
        axiosError.response?.status === 401
          ? 'Credenciales inválidas. Verifique su ID de Archon.'
          : 'Error de conexión. Intente de nuevo más tarde (Verifique que la API esté encendida).';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 min-h-screen overflow-hidden bg-pinnacle-navy font-sans">
      {/* 🌌 ATMOSPHERIC LAYER */}
      <img
        src={serviceBackground}
        alt="Service Workshop"
        className="fixed inset-0 w-full h-full object-cover z-0 animate-[pulse_60s_infinite_alternate] opacity-40 md:opacity-100"
      />
      <div className="fixed inset-0 z-10 bg-gradient-to-br from-pinnacle-navy/80 to-pinnacle-navy/95 backdrop-blur-[2px]"></div>

      {/* 🏙️ HERO CONTENT (2/3 Width) */}
      <section className="relative z-20 hidden md:flex flex-col md:col-span-2 min-h-screen p-0 overflow-hidden">
        <main className="flex-1 flex flex-col justify-center px-6 md:px-20 gap-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
          <div className="w-full">
            <h1 className="text-pinnacle-white font-display font-black text-3xl md:text-5xl lg:text-6xl leading-[1.05] max-w-[20ch]">
              Suministro industrial, tecnológico y <br className="hidden lg:block" /> comercial para
              operaciones que no pueden detenerse
            </h1>
          </div>
          <p className="text-pinnacle-white/70 text-lg md:text-xl whitespace-nowrap font-sans">
            Respuesta rápida y suministro confiable para el sector minero e industrial.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <a
              href="https://wa.me/5214929421780"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-archon-primary"
            >
              Contactar a un asesor
            </a>
            <a
              href="https://piic.com.mx/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-archon-ghost"
            >
              Ver sitio Web
            </a>
          </div>
        </main>
      </section>

      {/* 🛡️ LOGIN PANEL (1/3 Width) */}
      <section className="relative z-30 flex flex-col items-center justify-center col-span-1 min-h-screen bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.2)]">
        <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-1000 delay-300">
          {/* 📱 HEADER (Mobile Only) */}
          <header className="h-[10vh] md:hidden bg-pinnacle-navy flex items-center px-6">
            <PiicLogo />
          </header>

          {/* 🏙️ BODY (The Access Hub) */}
          <main className="flex-1 flex flex-col justify-center px-6 md:px-16">
            <div className="w-full max-w-[440px]">
              <header className="mb-12">
                <h2 className="text-pinnacle-navy font-display font-black text-4xl lg:text-5xl tracking-tight leading-tight">
                  Acceso Archon
                </h2>
                <p className="text-pinnacle-navy/40 font-display font-bold text-archon-md uppercase tracking-[0.25em] mt-2">
                  Control de Flotas
                </p>
              </header>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 text-red-600 text-archon-md font-black uppercase rounded-[4px] border-l-4 border-red-500 animate-in slide-in-from-top duration-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-6">
                {/* 🆔 IDENTITY */}
                <div className="flex flex-col gap-1 relative mb-4">
                  <label className="font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70">
                    Identidad de Usuario
                  </label>
                  <input
                    type="text"
                    placeholder="ID de Archon"
                    value={username}
                    onChange={(e): void => setUsername(e.target.value)}
                    className="w-full h-14 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20"
                    disabled={loading}
                    required
                  />
                </div>

                {/* 🔑 SECURITY */}
                <div className="flex flex-col gap-1 relative mb-6">
                  <label className="font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70">
                    Clave de Seguridad
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e): void => setPassword(e.target.value)}
                    className="w-full h-14 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20"
                    disabled={loading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-archon-primary w-full !md:w-full"
                >
                  {loading ? 'Autenticando Archon...' : 'Acceder al Sistema'}
                </button>

                <div className="text-left mt-4">
                  <a
                    href="#"
                    className="text-pinnacle-yellow font-display font-bold text-xs hover:opacity-80 transition-all"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </form>
            </div>
          </main>

          {/* 🏙️ FOOTER */}
          <footer className="h-[10vh] flex items-center justify-center border-t border-pinnacle-navy/5 px-8">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-pinnacle-navy/40 font-bold text-archon-sm uppercase tracking-widest">
                © Todos los derechos reservados por ArchonCore by Dreamtek.
              </span>
              <span className="text-pinnacle-navy/20 font-black text-archon-xs uppercase tracking-widest">
                Archon Fleet System | V.78.100.50
              </span>
            </div>
          </footer>
        </div>
      </section>

      {/* 🍪 COOKIE BANNER */}
      {showCookies && (
        <div className="fixed bottom-0 left-0 w-full bg-pinnacle-yellow h-[10vh] px-6 md:px-16 z-[1000] flex items-center justify-between animate-in slide-in-from-bottom duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <p className="text-pinnacle-navy text-archon-md font-bold max-w-4xl leading-tight hidden md:block">
            Utilizamos cookies propias y de terceros. Al continuar navegando, acepta esta{' '}
            <a
              href="https://piic.com.mx/politicas"
              target="_blank"
              rel="noopener noreferrer"
              className="font-black underline"
            >
              política de uso, tratamiento de información y cookies.
            </a>
          </p>
          <div className="flex gap-4 w-full md:w-auto justify-center md:justify-end">
            <button
              onClick={(): void => setShowCookies(false)}
              className="px-8 h-10 bg-white text-pinnacle-navy rounded-[4px] font-black text-archon-base uppercase tracking-widest hover:bg-pinnacle-navy hover:text-white transition-all shadow-sm"
            >
              RECHAZAR
            </button>
            <button
              onClick={acceptCookies}
              className="px-8 h-10 bg-pinnacle-navy text-white rounded-[4px] font-black text-archon-base uppercase tracking-widest hover:bg-white hover:text-pinnacle-navy transition-all shadow-md"
            >
              ACEPTAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
