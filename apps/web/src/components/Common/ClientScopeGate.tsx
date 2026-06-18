import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';

const ClientScopeGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuiteVIM } = usePermissions();
  const location = useLocation();

  const isAllowedForClient =
    location.pathname.startsWith('/dashboard/fleet') ||
    location.pathname.startsWith('/dashboard/alerts') ||
    location.pathname.startsWith('/dashboard/maintenance');

  if (isSuiteVIM() && !isAllowedForClient) {
    return <Navigate to="/dashboard/fleet" replace />;
  }

  return <>{children}</>;
};

export default ClientScopeGate;
