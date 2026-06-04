import React from 'react';
import { usePermissions, useHasRole } from './hooks';
import type { Permission, OrgRole } from './rbac';

interface PermissionGuardProps {
  permissions: Permission[];
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  permissions,
  mode = 'all',
  fallback = null,
  children,
}: PermissionGuardProps) {
  const allowed = usePermissions(permissions, mode);
  return <>{allowed ? children : fallback}</>;
}

interface RoleGuardProps {
  roles: OrgRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const allowed = useHasRole(...roles);
  return <>{allowed ? children : fallback}</>;
}

export function OwnerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGuard roles={['owner']} fallback={fallback}>{children}</RoleGuard>;
}

export function AdminOrOwner({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <RoleGuard roles={['owner', 'admin']} fallback={fallback}>{children}</RoleGuard>;
}
