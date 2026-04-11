import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Auth/Login';
import DashboardLayout from './pages/Dashboard/Layout';
import ArchonCenter from './pages/Dashboard/ArchonCenter';
import FleetModule from './pages/Dashboard/FleetModule';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<ArchonCenter />} />
        <Route path="fleet" element={<FleetModule />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
