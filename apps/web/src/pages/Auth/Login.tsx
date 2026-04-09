import React, { useState } from 'react';
import { PiicLogo } from '../../components/Logo/PiicLogo';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      const message = err.response?.data?.error || 'Authentication Failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-pinnacle-primary p-24">
      <div className="w-full max-w-[400px] glass-morphism p-32 rounded-pinnacle-card shadow-pinnacle">
        <div className="flex flex-col items-center mb-32">
          <PiicLogo className="w-24 h-24 mb-16" />
          <h2 className="text-white text-[24px]">Archon Access</h2>
          <p className="text-white/60 text-sm">Pinnacle Maintenance System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-24">
          {error && (
            <div className="p-16 bg-red-500/20 border border-red-500/50 rounded-pinnacle-input text-red-200 text-xs text-center animate-pulse">
              {error}
            </div>
          )}
          <div>
            <label className="block text-white/80 text-xs mb-8 uppercase tracking-widest font-bold">Username</label>
            <input 
              type="text" 
              className="w-full p-16 diamond-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Archon ID"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-white/80 text-xs mb-8 uppercase tracking-widest font-bold">Password</label>
            <input 
              type="password" 
              className="w-full p-16 diamond-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-pinnacle-accent text-pinnacle-primary font-bold py-16 rounded-pinnacle-input hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'SYNCHRONIZING...' : 'INITIALIZE AUTHENTICATION'}
          </button>
        </form>
      </div>
    </div>
  );
};
