import React from 'react';
import { Users, UserPlus, ClipboardList } from 'lucide-react';
import { useUsers } from '../../context/UserContext';

/**
 * 🔱 Archon Component: UserManagementCards
 * Implementation: Dual-Axis Symmetry Selector
 * v.28.23.0 - Identity Orchestration
 */

const UserManagementCards: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel } = useUsers();

  return (
    <div className="archon-grid-2">
      {/* ── CARD 01: Mando y Supervisión ─────────────────────────────────── */}
      <div
        className={`glass-card-pro bg-white p-8 space-y-6 flex flex-col items-center text-center transition-all duration-300 ${
          activePanel === 'DIRECTORY' ? 'ring-2 ring-[#0f2a44]' : 'opacity-80'
        }`}
      >
        <div className="p-4 bg-[#0f2a44]/5 rounded-full">
          <Users size={32} className="text-[#0f2a44]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-[#0f2a44] tracking-tight uppercase">
            Mando y Supervisión
          </h3>
          <p className="text-sm text-[#0f2a44]/60 font-medium leading-relaxed leading-tight">
            Gestione el directorio maestro de personal, supervise roles industriales y audite
            estatus operativos.
          </p>
        </div>
        <div className="flex-grow" />
        <button
          onClick={(): void => setActivePanel('DIRECTORY')}
          className="btn-sentinel-navy w-full py-4 font-black tracking-widest text-[11px] uppercase group"
        >
          <ClipboardList size={16} className="mr-2 group-hover:scale-110 transition-transform" />
          Directorio Maestro
        </button>
      </div>

      {/* ── CARD 02: Incorporación de Personal ───────────────────────────── */}
      <div
        className={`glass-card-pro bg-white p-8 space-y-6 flex flex-col items-center text-center transition-all duration-300 ${
          activePanel === 'SIGNUP' ? 'ring-2 ring-[#0f2a44]' : 'opacity-80'
        }`}
      >
        <div className="p-4 bg-[#0f2a44]/5 rounded-full">
          <UserPlus size={32} className="text-[#0f2a44]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-[#0f2a44] tracking-tight uppercase">
            Incorporación de Personal
          </h3>
          <p className="text-sm text-[#0f2a44]/60 font-medium leading-relaxed leading-tight">
            Registre nuevos operadores, técnicos y administradores con generación automática de
            claves temporales.
          </p>
        </div>
        <div className="flex-grow" />
        <button
          onClick={(): void => setActivePanel('SIGNUP')}
          className="btn-sentinel-emerald w-full py-4 font-black tracking-widest text-[11px] uppercase group"
        >
          <UserPlus size={16} className="mr-2 group-hover:scale-110 transition-transform" />
          Iniciar Registro
        </button>
      </div>
    </div>
  );
};

export default UserManagementCards;
