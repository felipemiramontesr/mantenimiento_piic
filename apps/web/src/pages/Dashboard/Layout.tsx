import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../components/Navigation/Sidebar';
import SovereignHeader from '../../components/Navigation/SovereignHeader';
import SovereignSubheader from '../../components/Navigation/SovereignSubheader';
import SovereignFooter from '../../components/Navigation/SovereignFooter';
import ArchonNetworkBanner from '../../components/Navigation/ArchonNetworkBanner';
import { FleetProvider } from '../../context/FleetContext';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';
import usePushNotifications from '../../hooks/usePushNotifications';

/**
 * 🏛️ Archon Component: DashboardLayout
 * Implementation: Sovereign Architectural Grid (V.78.100.120)
 * Objective: High-performance structural orchestration for industrial modules.
 */

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  usePushNotifications(true);

  return (
    <SovereignLayoutProvider>
      <FleetProvider>
        <div
          className={`flex flex-col md:grid h-screen w-screen overflow-hidden bg-[#0f2a44] transition-all duration-300 ease-in-out ${
            isCollapsed ? 'md:grid-cols-[80px_minmax(0,1fr)]' : 'md:grid-cols-[220px_minmax(0,1fr)]'
          }`}
        >
          {/* 🔱 Navigation Chassis */}
          <Sidebar isCollapsed={isCollapsed} onToggle={(): void => setIsCollapsed(!isCollapsed)} />

          {/* 🏢 Workspace Chassis */}
          <main className="flex flex-col h-screen w-full overflow-hidden bg-white min-w-0 relative">
            <ArchonNetworkBanner />
            <SovereignHeader />
            <SovereignSubheader />

            <div className="h-[80vh] overflow-y-auto px-4 md:px-10 pt-0 pb-[26px] custom-scrollbar flex-1 relative">
              <Outlet />
            </div>

            <SovereignFooter />
          </main>
        </div>

        {/* 🔱 Forensic Telemetry Overlay */}
      </FleetProvider>
    </SovereignLayoutProvider>
  );
};

export default DashboardLayout;
