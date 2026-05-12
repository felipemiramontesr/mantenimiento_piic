import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Navigation/Sidebar';
import SovereignHeader from '../../components/Navigation/SovereignHeader';
import SovereignSubheader from '../../components/Navigation/SovereignSubheader';
import SovereignFooter from '../../components/Navigation/SovereignFooter';
import { FleetProvider } from '../../context/FleetContext';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';

/**
 * 🏛️ Archon Component: DashboardLayout
 * Implementation: Sovereign Architectural Grid (V.78.100.50)
 * Objective: High-performance structural orchestration for industrial modules.
 */

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  return (
    <SovereignLayoutProvider>
      <FleetProvider>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCollapsed ? '80px minmax(0, 1fr)' : '260px minmax(0, 1fr)',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            backgroundColor: '#0f2a44',
          }}
          className="transition-all duration-300 ease-in-out"
        >
          {/* 🔱 Navigation Chassis */}
          <Sidebar isCollapsed={isCollapsed} onToggle={(): void => setIsCollapsed(!isCollapsed)} />

          {/* 🏢 Workspace Chassis */}
          <main className="workspace-container-pro">
            <SovereignHeader />
            <SovereignSubheader />

            <div className="workspace-body-pro custom-scrollbar">
              <Outlet />
            </div>

            <SovereignFooter />
          </main>
        </div>
      </FleetProvider>
    </SovereignLayoutProvider>
  );
};

export default DashboardLayout;
