import React from 'react';
import { Users, UserPlus, ArrowRight, Shield, ClipboardList } from 'lucide-react';
import { useUsers } from '../../context/UserContext';

/**
 * 🔱 Archon Component: UserManagementCards
 * Implementation: Dual-Axis Symmetry Selector (Fleet-Standard)
 * v.28.24.1 - Animation Purification (Static Entry)
 */

const UserManagementCards: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel } = useUsers();

  return (
    <div className="archon-central-axis animate-in fade-in duration-500">
      <div className="archon-grid-2 gap-8 mb-8">
        {/* ── CARD 01: Mando y Supervisión (NAVY) ────────────────────────── */}
        <div
          onClick={(): void => setActivePanel('DIRECTORY')}
          className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
            activePanel === 'DIRECTORY'
              ? 'ring-2 ring-[#0f2a44] shadow-lg transform scale-[1.02]'
              : 'card-hover-navy opacity-80 hover:opacity-100'
          }`}
          style={{ borderTop: '4px solid #0f2a44' }}
        >
          <div className="flex items-center justify-center gap-3 mb-4 w-full">
            <ClipboardList size={20} className="text-[#0f2a44]" />
            <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
              Directorio Maestro
            </span>
          </div>

          <div className="archon-tile-payload space-y-8 pb-16">
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 42, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(15, 42, 68, 0.4)',
              }}
            >
              <Shield size={40} className="text-[#0f2a44]" />
            </div>
            <div className="flex flex-col items-center space-y-1 mb-12">
              <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
                Mando
              </h3>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
                Supervisión Directiva
              </p>
            </div>
          </div>

          <div className="archon-tile-action">
            <button
              className={`btn-sentinel-navy w-full ${
                activePanel === 'DIRECTORY' ? 'bg-[#0f2a44] text-white' : ''
              }`}
            >
              Ver Directorio <ArrowRight size={10} className="text-white ml-2" />
            </button>
          </div>
        </div>

        {/* ── CARD 02: Incorporación de Personal (GOLD) ──────────────────── */}
        <div
          onClick={(): void => setActivePanel('SIGNUP')}
          className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
            activePanel === 'SIGNUP'
              ? 'ring-2 ring-[#f2b705] shadow-lg transform scale-[1.02]'
              : 'card-hover-navy opacity-80 hover:opacity-100'
          }`}
          style={{ borderTop: '4px solid #f2b705' }}
        >
          <div className="flex items-center justify-center gap-3 mb-4 w-full">
            <UserPlus size={20} className="text-[#f2b705]" />
            <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
              Alta de Personal
            </span>
          </div>

          <div className="archon-tile-payload space-y-8 pb-16">
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(242, 183, 5, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(242, 183, 5, 0.4)',
              }}
            >
              <Users size={40} className="text-[#f2b705]" />
            </div>
            <div className="flex flex-col items-center space-y-1 mb-12">
              <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
                Registrar
              </h3>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
                Gestión de Identidad
              </p>
            </div>
          </div>

          <div className="archon-tile-action">
            <button
              className={`btn-sentinel-navy w-full ${
                activePanel === 'SIGNUP' ? 'bg-[#f2b705] text-white border-[#f2b705]' : ''
              }`}
            >
              Iniciar Registro <ArrowRight size={10} className="text-white ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementCards;
