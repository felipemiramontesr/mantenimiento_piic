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
    <div 
      className="min-h-screen flex items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `linear-gradient(rgba(15, 42, 68, 0.7), rgba(15, 42, 68, 0.7)), url(${backgroundImage})` }}
    >
      <div className="w-full max-w-md glass-effect p-8 md:p-12 rounded-lg shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <PiicLogo className="w-32 h-32 mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 text-center uppercase tracking-tight">
            Acceso Archon
          </h1>
          <div className="w-16 h-1 mt-2 bg-[#F2B705] rounded-full"></div>
          <p className="mt-4 text-slate-600 text-sm font-medium text-center uppercase tracking-widest">
            Sistema de Mantenimiento Vehicular | PIIC
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded shadow-sm animate-bounce">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[#0F2A44] text-xs font-bold uppercase tracking-widest ml-1">
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

          <div className="space-y-2">
            <label className="block text-[#0F2A44] text-xs font-bold uppercase tracking-widest ml-1">
              Clave de Acceso
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
          
          <p className="text-center text-xs text-slate-500 mt-6 font-medium">
            © 2026 PIIC Identity System. <br/>
            <span className="italic">Engineered for visual immortality.</span>
          </p>
        </form>
      </div>
      
      {/* Decorative Branding Element */}
      <div className="absolute bottom-4 right-4 text-white/20 text-[120px] font-bold select-none pointer-events-none hidden lg:block">
        ARCHON
      </div>
    </div>
  );
};

export default LoginPage;
