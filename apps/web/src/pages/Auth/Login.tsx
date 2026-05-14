import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import PiicLogo from '../../components/Logo/PiicLogo';
import api from '../../api/client';
import serviceBackground from '../../assets/service-bg.png';
import { useAuth } from '../../context/AuthContext';

/**
 * LoginPage Component - ARCHON System
 *
 * @remarks
 * This is the primary entry point for the Archon UI. It implements a fully responsive,
 * dual-panel layout supporting mobile (10/80/10 vertical split) and tablet/desktop
 * symmetry logic.
 *
 * Contains logical boundaries for managing authentication state, token storage securely
 * in localStorage, and routing upon successful Archon API verification.
 *
 * @returns React Functional Component rendering the Archon Login View.
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

  /**
   * Stores the user's cookie consent preference indefinitely.
   * Modifies localStorage directly to prevent re-renders on page reload.
   */
  const acceptCookies = (): void => {
    localStorage.setItem('cookies_accepted', 'true');
    setShowCookies(false);
  };

  /**
   * Handles the secure form submission to the Archon Auth Router.
   * If successful, parses the JWT and redirects to the internal Dashboard.
   * Catches `401 Unauthorized` specifically to display a generic fallback message
   * (Zero-Trust policy restricts specific UI error details).
   *
   * @param e - Prevented default native form event
   */
  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // 🛡️ Zero-Noise Test Shield
    const isTest =
      typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || !!process.env.VITEST);

    if (!isTest) {
      // eslint-disable-next-line no-console
      console.log('🚀 [Archon API Client V2] Active Gateway:', api.defaults.baseURL);
      // eslint-disable-next-line no-console
      console.log('🔍 Identifying:', username);
    }

    try {
      const response = await api.post('/auth/login', { username, password });
      // 🛡️ Zero-Noise Test Shield (Already declared in upper scope)

      if (!isTest) {
        // eslint-disable-next-line no-console
        console.log('✅ [Archon Auth] Response Received:', response.status);
      }

      if (response.data.token) {
        if (!isTest) {
          // eslint-disable-next-line no-console
          console.log('🔑 [Archon Auth] Token Verification Successful');
        }
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      } else {
        if (!isTest) {
          // eslint-disable-next-line no-console
          console.error('❌ [Archon Auth] Protocol Error: Token missing in payload');
        }
        setError('Error de protocolo: El servidor no devolvió una clave de acceso válida.');
      }
    } catch (err) {
      // 🛡️ Zero-Noise Test Shield (Already declared in upper scope)
      if (!isTest) {
        // eslint-disable-next-line no-console
        console.error('🚨 [Archon Auth] Terminal Exception:', err);
      }
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
    <div className="grid grid-cols-1 md:grid-cols-3 min-h-screen overflow-hidden bg-[#0f2a44]">
      {/* 🌌 ATMOSPHERIC LAYER (Global fixed backdrops) */}
      <img
        src={serviceBackground}
        alt="Service Workshop"
        className="fixed inset-0 w-full h-full object-cover z-0 animate-[pulse_60s_infinite_alternate] opacity-40 md:opacity-100"
      />
      <div className="fixed inset-0 z-10 bg-gradient-to-br from-[#0f2a44]/80 to-[#0f2a44]/95 backdrop-blur-[2px]"></div>

      {/* 🏙️ HERO CONTENT (Cinematic Brand Narrative - 2/3 Width) */}
      <section className="relative z-20 hidden md:flex flex-col md:col-span-2 min-h-screen p-0 transition-all duration-500 overflow-hidden">
        <main className="flex-1 flex flex-col justify-center px-6 md:px-20 gap-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
          <h1 className="text-white font-black text-3xl md:text-4xl lg:text-5xl leading-tight max-w-2xl text-center md:text-left">
            Suministro industrial, tecnológico y comercial para operaciones que no pueden detenerse
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-lg text-center md:text-left">
            Respuesta rápida y suministro confiable para el sector minero e industrial.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center md:justify-start">
            <a
              href="https://wa.me/5214929421780"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-[#f2b705] text-[#0f2a44] px-8 py-4 rounded-[4px] font-bold text-base shadow-lg hover:bg-[#d9a404] transition-all"
            >
              Contactar a un asesor
            </a>
            <a
              href="https://piic.com.mx/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white/5 text-white backdrop-blur-md px-8 py-4 rounded-[4px] font-bold text-base hover:bg-white hover:text-[#0f2a44] transition-all"
            >
              Ver sitio Web
            </a>
          </div>
        </main>
      </section>

      {/* 🛡️ LOGIN PANEL (Access Center - 1/3 Width) */}
      <section className="relative z-30 flex flex-col items-center justify-center col-span-1 min-h-screen bg-white transition-all duration-400 shadow-[-20px_0_50px_rgba(0,0,0,0.2)]">
        <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-1000 delay-300">
          {/* 📱 10% HEADER (Mobile Only Stripe) */}
          <header className="h-[10vh] md:hidden bg-[#0f2a44] flex items-center px-6">
            <PiicLogo />
          </header>

          {/* 🏙️ 80% BODY */}
          <main className="h-[80vh] md:h-auto md:flex-1 bg-white p-8 md:p-12 flex flex-col justify-start md:justify-center">
            <div className="text-center md:text-left mb-8 pb-10 border-b border-[#0f2a44]/10">
              <h2 className="text-[#0f2a44] font-black tracking-tighter text-3xl lg:text-4xl">
                Acceso Archon
              </h2>
              <p className="text-[#0f2a44]/50 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                Control de Flotas
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div
                style={{
                  minHeight: error ? '80px' : '0px',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: error ? 1 : 0,
                }}
                className="flex items-center overflow-hidden"
              >
                {error && (
                  <div className="w-full p-4 bg-red-500/10 text-red-500 text-[11px] font-black uppercase rounded border-l-4 border-red-500 backdrop-blur-md">
                    Error de Sistema: {error}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[#0f2a44] text-[11px] font-bold uppercase tracking-[0.3em] ml-1">
                  Identidad de Usuario
                </label>
                <input
                  type="text"
                  className="w-full p-4 bg-[#0f2a44]/5 rounded-[4px] text-base text-[#0f2a44] focus:bg-white focus:shadow-[0_0_0_4px_rgba(242,183,5,0.1)] transition-all"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setUsername(e.target.value)
                  }
                  placeholder="ID de Archon"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[#0f2a44] text-[11px] font-bold uppercase tracking-[0.3em] ml-1">
                  Clave de Seguridad
                </label>
                <input
                  type="password"
                  className="w-full p-4 bg-[#0f2a44]/5 rounded-[4px] text-base text-[#0f2a44] focus:bg-white focus:shadow-[0_0_0_4px_rgba(242,183,5,0.1)] transition-all"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#f2b705] text-[#0f2a44] rounded-[4px] font-black text-base uppercase tracking-widest shadow-lg hover:bg-[#d9a404] hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Autenticando Archon...' : 'Acceder al Sistema'}
                </button>
              </div>

              <div className="text-center mt-6">
                <a
                  href="#"
                  className="text-[#f2b705] text-[13px] font-bold hover:text-[#0f2a44] transition-all"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </form>
          </main>

          {/* 🏗️ 10% FOOTER (Sovereign Credits) */}
          <footer className="h-[10vh] bg-[#f2b705] flex items-center justify-center px-6">
            <p className="text-[#0f2a44] text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap overflow-hidden text-ellipsis">
              Powered by PIIC TECH <span className="mx-2 opacity-30">|</span> © 2026 PIIC GROUP
            </p>
          </footer>
        </div>
      </section>

      {/* 🍪 COOKIE BANNER PIIC */}
      {showCookies && (
        <div className="fixed bottom-0 left-0 w-full bg-[#f2b705] p-6 z-[1000] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom duration-500">
          <p className="text-[#0f2a44] text-sm font-medium leading-relaxed flex-1">
            Utilizamos cookies propias y de terceros. Al continuar navegando, acepta esta{' '}
            <a
              href="https://piic.com.mx/politicas"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              política de uso, tratamiento de información y cookies.
            </a>
          </p>
          <div className="flex gap-3">
            <button
              onClick={(): void => setShowCookies(false)}
              className="px-6 py-2 border-2 border-[#0f2a44] text-[#0f2a44] rounded-[4px] font-black text-[12px] uppercase"
            >
              RECHAZAR
            </button>
            <button
              onClick={acceptCookies}
              className="px-6 py-2 bg-[#0f2a44] text-white rounded-[4px] font-black text-[12px] uppercase"
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
