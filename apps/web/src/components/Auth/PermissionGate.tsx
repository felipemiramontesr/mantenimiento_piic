import React from 'react';
import usePermissions from '../../hooks/usePermissions';

interface PermissionGateProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PermissionGate({
  permission,
  fallback = null,
  children,
}: PermissionGateProps): React.ReactElement {
  const { hasPermission } = usePermissions();
  return <>{hasPermission(permission) ? children : fallback}</>;
}
