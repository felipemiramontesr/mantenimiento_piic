import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router';
import Sidebar from '../../components/Navigation/Sidebar';
import SovereignHeader from '../../components/Navigation/SovereignHeader';
import SovereignSubheader from '../../components/Navigation/SovereignSubheader';
import SovereignFooter from '../../components/Navigation/SovereignFooter';
import ArchonNetworkBanner from '../../components/Navigation/ArchonNetworkBanner';
import ItinerantArcBanner from '../../components/Navigation/ItinerantArcBanner';
import CapabilityNotice from '../../components/Navigation/CapabilityNotice';
import PanicButton from '../../components/Security/PanicButton';
import { FleetProvider } from '../../context/FleetContext';
import { SovereignLayoutProvider } from '../../context/SovereignLayoutContext';
import { ArchonDoctorProvider } from '../../context/ArchonDoctorContext';
import usePushNotifications from '../../hooks/usePushNotifications';
import usePermissions from '../../hooks/usePermissions';

/** FC182 F2 — the one destination an itinerant Arc has (`ProfileView`/Arcsial). */
const ITINERANT_ALLOWED_PATH = '/dashboard/social';

/** Client-side belt to Cond.R-182 R1's server-side suspenders: the backend already 403s any
 *  tenant-scoped endpoint for a `tenantId: null` token (`requirePermission()` + Arc's minimal
 *  whitelist), so this guard is UX, not the security boundary — it keeps a typed URL or stale
 *  bookmark from landing an itinerant on a page that would just render its own error state,
 *  and doubles as the "redirect to Arcsial by default" the FC asks for (Scenario 2): whatever
 *  path `Login.tsx`'s `navigate('/dashboard')` lands on, this bounces it here on the next
 *  render — no separate special-case needed in `Login.tsx` itself. */
function useItinerantRedirect(): boolean {
  const { isItinerantArc } = usePermissions();
  const location = useLocation();
  return isItinerantArc() && location.pathname !== ITINERANT_ALLOWED_PATH;
}

/**
 * 🏛️ Archon Component: DashboardLayout
 * Implementation: Sovereign Architectural Grid (V.78.100.120)
 * Objective: High-performance structural orchestration for industrial modules.
 */

const DashboardLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  usePushNotifications(true);
  const shouldRedirectItinerant = useItinerantRedirect();

  return (
    <SovereignLayoutProvider>
      <FleetProvider>
        <ArchonDoctorProvider>
          <div
            className={`flex flex-col md:grid h-screen w-screen overflow-hidden bg-[#0f2a44] transition-[grid-template-columns] duration-300 ease-in-out ${
              isCollapsed
                ? 'md:grid-cols-[80px_minmax(0,1fr)]'
                : 'md:grid-cols-[220px_minmax(0,1fr)]'
            }`}
          >
            {/* 🔱 Navigation Chassis */}
            <Sidebar
              isCollapsed={isCollapsed}
              onToggle={(): void => setIsCollapsed(!isCollapsed)}
            />

            {/* 🏢 Workspace Chassis */}
            <main className="flex flex-col h-screen w-full overflow-hidden bg-white min-w-0 relative">
              <ArchonNetworkBanner />
              <ItinerantArcBanner />
              <SovereignHeader />
              <SovereignSubheader />

              <div className="h-[80vh] overflow-y-auto px-4 md:px-10 pt-0 pb-[26px] custom-scrollbar flex-1 relative">
                {shouldRedirectItinerant ? (
                  <Navigate to={ITINERANT_ALLOWED_PATH} replace />
                ) : (
                  <>
                    <CapabilityNotice />
                    <Outlet />
                  </>
                )}
              </div>

              <SovereignFooter />
            </main>
          </div>
        </ArchonDoctorProvider>

        {/* 🆘 Panic SOS Button — floating, always visible */}
        <PanicButton />
      </FleetProvider>
    </SovereignLayoutProvider>
  );
};

export default DashboardLayout;
