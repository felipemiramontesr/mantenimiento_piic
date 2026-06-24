import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/Auth/Login';
import DashboardLayout from './pages/Dashboard/Layout';
import ArchonCenter from './pages/Dashboard/ArchonCenter';
import FleetModule from './pages/Dashboard/FleetModule';
import RoutesModule from './pages/Dashboard/RoutesModule';
import UsersModule from './pages/Dashboard/UsersModule';
import FinancialHealthModule from './pages/Dashboard/FinancialHealthModule';
import LogsModule from './pages/Dashboard/LogsModule';
import SettingsModule from './pages/Dashboard/SettingsModule';
import AlertsModule from './pages/Dashboard/AlertsModule';
import AdminModule from './pages/Dashboard/AdminModule';
import OnboardingModule from './pages/Dashboard/OnboardingModule';
import IncidentsModule from './pages/Dashboard/IncidentsModule';
import MaintenanceModule from './pages/Dashboard/MaintenanceModule';
import FleetUnitNode from './pages/Dashboard/FleetUnitNode';
import MaintenanceNode from './pages/Dashboard/nodes/MaintenanceNode';
import RouteNode from './pages/Dashboard/nodes/RouteNode';
import IncidentNode from './pages/Dashboard/nodes/IncidentNode';
import UserNode from './pages/Dashboard/nodes/UserNode';
import RealtimeTrackingModule from './pages/Dashboard/RealtimeTrackingModule';
import ContactsDirectory from './pages/Dashboard/ContactsDirectory';
import ContractsPanel from './pages/Dashboard/ContractsPanel';
import PipelineBoard from './pages/Dashboard/PipelineBoard';
import InteractionsLog from './pages/Dashboard/InteractionsLog';
import PortalView from './pages/Dashboard/PortalView';
import CampaignsPanel from './pages/Dashboard/CampaignsPanel';
import { UserProvider } from './context/UserContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ClientScopeGate from './components/Common/ClientScopeGate';
import './index.css';

/**
 * 🔱 Archon Root: App
 * Implementation: Sovereign Identity Orchestration
 * v.28.27.0 - In-Memory Auth Guard (httpOnly cookie flow)
 */

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Routes>
      {/* 🛡️ Protected Sovereign Grid */}
      <Route
        path="*"
        element={
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserProvider>
                      <DashboardLayout />
                    </UserProvider>
                  </ProtectedRoute>
                }
              >
                <Route
                  element={
                    <ClientScopeGate>
                      <Outlet />
                    </ClientScopeGate>
                  }
                >
                  <Route index element={<ArchonCenter />} />
                  <Route path="fleet" element={<FleetModule />} />
                  <Route path="fleet/:unitId" element={<FleetUnitNode />} />
                  <Route path="maintenance" element={<MaintenanceModule />} />
                  <Route path="maintenance/:uuid" element={<MaintenanceNode />} />
                  <Route path="routes" element={<RoutesModule />} />
                  <Route path="routes/:uuid" element={<RouteNode />} />
                  <Route path="financial" element={<FinancialHealthModule />} />
                  <Route path="logs" element={<LogsModule />} />
                  <Route path="settings" element={<SettingsModule />} />
                  <Route path="alerts" element={<AlertsModule />} />
                  <Route path="admin" element={<AdminModule />} />
                  <Route path="onboarding" element={<OnboardingModule />} />
                  <Route path="incidents" element={<IncidentsModule />} />
                  <Route path="incidents/:uuid" element={<IncidentNode />} />
                  <Route path="users" element={<UsersModule />} />
                  <Route path="users/:uuid" element={<UserNode />} />
                  <Route path="tracking" element={<RealtimeTrackingModule />} />
                  <Route path="contacts" element={<ContactsDirectory />} />
                  <Route path="contracts" element={<ContractsPanel />} />
                  <Route path="pipeline" element={<PipelineBoard />} />
                  <Route path="interactions" element={<InteractionsLog />} />
                  <Route path="portal" element={<PortalView />} />
                  <Route path="campaigns" element={<CampaignsPanel />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default App;
