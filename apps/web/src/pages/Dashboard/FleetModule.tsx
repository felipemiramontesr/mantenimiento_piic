import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  ArrowLeft,
  Settings,
  LogOut,
  Activity,
  Navigation,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { SYSTEM_VERSION, BRANDING_NAME } from '../../constants/versionConstants';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import FleetGridView from '../../components/Fleet/FleetGridView';
import FleetRegistrationForm from '../../components/Fleet/FleetRegistrationForm';
import FleetSuccessView from '../../components/Fleet/FleetSuccessView';
import useFleetForm from '../../hooks/useFleetForm';

type FleetView = 'GRID' | 'CREATE';

/**
 * 🚀 ARCHON FLEET MODULE (v.17.0.0)
 * Architecture: Sovereign Instrumental Node
 * Principles: SOLID, DRY, DIP
 */
const FleetModule: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { refreshUnits } = useFleet();
  const [currentView, setCurrentView] = useState<FleetView>('GRID');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // 🔱 CENTRALIZED STATE HOOK (DIP compliant)
  // Shared with RegistrationForm to ensure perfect state synchronization
  const fleetController = useFleetForm();
  const { 
    formData, 
    registrationSuccess, 
    setRegistrationSuccess, 
    resetForm 
  } = fleetController;

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);
  const closeMenu = (): void => setIsMenuOpen(false);

  const handleLogout = (): void => {
    localStorage.removeItem('archon_token');
    navigate('/login');
  };

  const handleReturnToGrid = (): void => {
    setCurrentView('GRID');
    setRegistrationSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] archon-dashboard-v3 font-outfit overflow-x-hidden">
      {/* ── SOVEREIGN NAVIGATION HEADER ─────────────────────────────────── */}
      <nav className="h-20 bg-white border-b border-[rgba(15,42,68,0.05)] px-12 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 bg-[#0f2a44] rounded flex items-center justify-center">
            <Truck className="text-[#f2b705]" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-black text-[#0f2a44] tracking-[0.2em] uppercase">
              Archon Fleet Admin
            </span>
            <span className="text-[10px] font-bold text-[#f2b705] tracking-[0.1em] uppercase">
              {BRANDING_NAME} • {SYSTEM_VERSION}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <button className="archon-nav-icon">
            <Activity size={18} />
          </button>
          <div className="h-6 w-[1px] bg-[rgba(15,42,68,0.1)]" />
          <div className="relative">
            <button 
              onClick={toggleMenu}
              aria-label="Navigation Menu"
              className="w-10 h-10 rounded-full bg-[#f1f5f9] border border-[rgba(15,42,68,0.1)] flex items-center justify-center overflow-hidden hover:border-[#f2b705] transition-all"
            >
              <Navigation size={18} className="text-[#0f2a44] opacity-60" />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeMenu} />
                <div className="absolute right-0 mt-4 w-64 bg-white rounded-xl shadow-2xl border border-[rgba(15,42,68,0.1)] p-3 z-20 animate-in fade-in slide-in-from-top-4">
                  <button className="flex items-center gap-3 w-full p-3 hover:bg-[#f8fafc] rounded-lg transition-colors">
                    <Settings size={16} className="text-[#0f2a44]" />
                    <span className="text-sm font-bold text-[#0f2a44]">Configuración</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-3 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="text-sm font-bold">Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="px-12 pt-16 h-full pb-40">
        <div className="flex items-center w-full pb-32 animate-in fade-in duration-500 px-1">
          {currentView === 'CREATE' && (
            <button onClick={handleReturnToGrid} className="btn-sentinel-yellow">
              <ArrowLeft size={14} /> Volver al Panel
            </button>
          )}
        </div>

        <div className="w-full h-full">
          {registrationSuccess ? (
            <FleetSuccessView 
              formData={formData}
              onRegisterAnother={resetForm}
              onManageFleet={handleReturnToGrid}
              onGoToDashboard={(): void => navigate('/dashboard')}
            />
          ) : (
            <>
              {currentView === 'GRID' && (
                <FleetGridView 
                  onStartRegistration={(): void => setCurrentView('CREATE')}
                />
              )}
              {currentView === 'CREATE' && (
                <FleetRegistrationForm 
                  controller={fleetController}
                  onSuccess={refreshUnits}
                  onCancel={handleReturnToGrid}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default FleetModule;
