import React from 'react';
import { Users, ChevronRight, ShieldCheck, Search } from 'lucide-react';
import { UserProvider, useUsers } from '../../context/UserContext';
import UserManagementCards from '../../components/Users/UserManagementCards';
import UsersGridView from '../../components/Users/UsersGridView';
import UserRegistrationForm from '../../components/Users/UserRegistrationForm';

/**
 * 🔱 Archon Component: UsersModuleContent
 * Inner orchestrator that consumes the UserContext
 * v.28.23.5 - Homogenized Layout
 */
const UsersModuleContent: React.FC = (): React.JSX.Element => {
  const { activePanel } = useUsers();

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* ── HEADER SOBERANO (Homologado con Flota) ────────────────────────── */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#f2b705]/10 rounded-lg">
                <Users className="text-[#f2b705]" size={24} />
              </div>
              <h1 className="text-3xl font-black text-[#0f2a44] tracking-tighter uppercase">
                Administración de Personal
              </h1>
            </div>
            <nav className="flex items-center gap-2 text-[10px] font-bold text-[#0f2a44]/40 uppercase tracking-widest">
              <span>Archon Central</span>
              <ChevronRight size={12} />
              <span className="text-[#0f2a44]/80">Gestión de Identidades</span>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f2a44]/30 group-focus-within:text-[#f2b705] transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="BUSCAR PERSONAL..."
                className="bg-white border border-[#0f2a44]/10 rounded-full py-3 pl-12 pr-6 text-[11px] font-black tracking-widest text-[#0f2a44] w-[300px] focus:outline-none focus:ring-2 focus:ring-[#f2b705] transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase">
                Soberanía Activa
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── INSTRUMENTS: Panel Selector ──────────────────────────────────── */}
      <div className="archon-central-axis mt-8">
        <UserManagementCards />
      </div>

      {/* ── DYNAMIC VIEWPORT: Table vs Form ──────────────────────────────── */}
      <div className="archon-central-axis mt-12 pb-20">
        {activePanel === 'DIRECTORY' ? <UsersGridView /> : <UserRegistrationForm />}
      </div>
    </main>
  );
};

/**
 * 🔱 Archon Page: UsersModule
 * Sovereign Personnel Administration v.28.23.5
 */
const UsersModule: React.FC = (): React.JSX.Element => (
  <UserProvider>
    <UsersModuleContent />
  </UserProvider>
);

export default UsersModule;
