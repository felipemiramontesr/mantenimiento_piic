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
import MaintenanceModule from './pages/Dashboard/MaintenanceModule';
import { UserProvider } from './context/UserContext';
import './index.css';

/**
 * 🔱 Archon Root: App
 * Implementation: Sovereign Identity Orchestration
 * v.28.25.0 - Elevated UserProvider for Cross-Module Identity Sync
 */

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <BrowserRouter>
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
        <Route path="maintenance" element={<MaintenanceModule />} />
        <Route path="routes" element={<RoutesModule />} />
        <Route path="users" element={<UsersModule />} />
        <Route path="financial" element={<FinancialHealthModule />} />
        <Route path="logs" element={<LogsModule />} />
        <Route path="settings" element={<SettingsModule />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
