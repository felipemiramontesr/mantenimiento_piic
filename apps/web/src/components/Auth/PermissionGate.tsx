import React from 'react';
import usePermissions from '../../hooks/usePermissions';

interface PermissionGateProps {
  readonly permission: string;
  readonly fallback?: React.ReactNode;
  readonly children: React.ReactNode;
}

export default function PermissionGate({
  permission,
  fallback = null,
  children,
}: PermissionGateProps): React.ReactElement {
  const { hasPermission } = usePermissions();
  return <>{hasPermission(permission) ? children : fallback}</>;
}
