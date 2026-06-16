import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface OwnerTypeGateProps {
  type: 'FLOTILLA' | 'PRIVATE' | 'CENTER';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the authenticated user's ownerType matches the
 * required type. Used to conditionally show suite-specific UI sections.
 * Internal users (ownerType === null) never match any gate.
 */
const OwnerTypeGate: React.FC<OwnerTypeGateProps> = ({ type, children, fallback = null }) => {
  const { ownerType } = useAuth();
  if (ownerType !== type) return <>{fallback}</>;
  return <>{children}</>;
};

export default OwnerTypeGate;
