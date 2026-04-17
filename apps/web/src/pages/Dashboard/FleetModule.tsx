import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowLeft, Settings, LogOut } from 'lucide-react';
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
  const { refreshUnits, units } = useFleet();
  const [currentView, setCurrentView] = useState<FleetView>('GRID');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // 🔱 CENTRALIZED STATE HOOK (DIP compliant)
  // Shared with RegistrationForm to ensure perfect state synchronization
  const fleetController = useFleetForm();
  const { formData, registrationSuccess, setRegistrationSuccess, resetForm } = fleetController;

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
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO (Dual Panel) */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Panel: Operational Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <Truck size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                Archon Fleet Admin
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Administración de Activos, Registro Técnico & Optimización de Flota
            </p>
          </div>

          {/* Right Panel: Identity & Access */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-0.03em',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#0f2a44',
              }}
            >
              Archon
            </h1>

            <button
              onClick={toggleMenu}
              aria-label="User Menu"
              className="avatar-trigger-pro"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '4px',
                border: '2px solid #f2b705',
                backgroundColor: '#0f2a44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: isMenuOpen ? '0 0 0 4px rgba(242, 183, 5, 0.2)' : 'none',
                transform: isMenuOpen ? 'scale(0.95)' : 'scale(1)',
                padding: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path
                  d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
                  stroke="#f2b705"
                  strokeWidth="16"
                  fill="none"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '60px',
                  right: '0',
                  width: '180px',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  boxShadow: '0 10px 30px rgba(15, 42, 68, 0.15)',
                  border: '1px solid rgba(15, 42, 68, 0.08)',
                  zIndex: 100,
                  padding: '4px 0',
                  animation: 'fade-in 0.2s ease-out',
                }}
              >
                <div
                  style={{ padding: '8px 16px', borderBottom: '1px solid rgba(15, 42, 68, 0.05)' }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#f2b705',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Sovereign Access
                  </span>
                </div>
                <button className="dropdown-item-mock" onClick={closeMenu}>
                  <Settings size={14} /> Ajustes
                </button>
                <div
                  style={{ height: '1px', background: 'rgba(15,42,68,0.05)', margin: '4px 0' }}
                />
                <button
                  className="dropdown-item-mock dropdown-item-mock-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {currentView === 'CREATE' && (
          <div className="flex items-center w-full pb-8 animate-in fade-in duration-500">
            <button onClick={handleReturnToGrid} className="btn-sentinel-yellow">
              <ArrowLeft size={14} /> Volver al Panel
            </button>
          </div>
        )}

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
                <FleetGridView onRegister={(): void => setCurrentView('CREATE')} units={units} />
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
      </section>

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default FleetModule;
