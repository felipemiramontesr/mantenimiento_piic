import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';

const ClientScopeGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isExternalClientOnly } = usePermissions();
  const location = useLocation();

  if (isExternalClientOnly() && !location.pathname.startsWith('/dashboard/fleet')) {
    return <Navigate to="/dashboard/fleet" replace />;
  }

  return <>{children}</>;
};

export default ClientScopeGate;
