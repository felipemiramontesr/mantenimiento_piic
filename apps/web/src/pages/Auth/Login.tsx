import React, { useState } from 'react';
import { PiicLogo } from '../../components/Logo/PiicLogo';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'archon' && password === 'pinnacle2026') {
      localStorage.setItem('auth_token', 'mock_token'); // Simplified for MVP
      navigate('/dashboard');
    } else {
      alert('Invalid Archon Clearance');
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
          <div>
            <label className="block text-white/80 text-xs mb-8 uppercase tracking-widest font-bold">Username</label>
            <input 
              type="text" 
              className="w-full p-16 diamond-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Archon ID"
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
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-pinnacle-accent text-pinnacle-primary font-bold py-16 rounded-pinnacle-input hover:brightness-110 transition-all active:scale-95"
          >
            INITIALIZE AUTHENTICATION
          </button>
        </form>
      </div>
    </div>
  );
};
