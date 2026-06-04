import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Auth/Login';
import DashboardLayout from './pages/Dashboard/Layout';
import ArchonCenter from './pages/Dashboard/ArchonCenter';
import FleetModule from './pages/Dashboard/FleetModule';
import RoutesModule from './pages/Dashboard/RoutesModule';
import UsersModule from './pages/Dashboard/UsersModule';
import FinancialHealthModule from './pages/Dashboard/FinancialHealthModule';
import LogsModule from './pages/Dashboard/LogsModule';
import SettingsModule from './pages/Dashboard/SettingsModule';
import AdminModule from './pages/Dashboard/AdminModule';
import IncidentsModule from './pages/Dashboard/IncidentsModule';
import MaintenanceModule from './pages/Dashboard/MaintenanceModule';
import FleetUnitNode from './pages/Dashboard/FleetUnitNode';
import MaintenanceNode from './pages/Dashboard/nodes/MaintenanceNode';
import RouteNode from './pages/Dashboard/nodes/RouteNode';
import IncidentNode from './pages/Dashboard/nodes/IncidentNode';
import UserNode from './pages/Dashboard/nodes/UserNode';
import { UserProvider } from './context/UserContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

/**
 * 🔱 Archon Root: App
 * Implementation: Sovereign Identity Orchestration
 * v.28.26.0 - Forensic Independence for AuthDebug
 */

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/login" replace />;
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
                <Route path="admin" element={<AdminModule />} />
                <Route path="incidents" element={<IncidentsModule />} />
                <Route path="incidents/:id" element={<IncidentNode />} />
                <Route path="users" element={<UsersModule />} />
                <Route path="users/:id" element={<UserNode />} />
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
