import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { canAccess, hasPermission } from './rbac';
import type { Permission, OrgRole } from './rbac';

export function useCurrentOrgRole(): OrgRole | undefined {
  const ctx = useContext(AuthContext);
  return (ctx?.user as { orgRole?: OrgRole } | null)?.orgRole;
}

export function usePermission(permission: Permission): boolean {
  const role = useCurrentOrgRole();
  return hasPermission(role ?? 'viewer', permission);
}

export function usePermissions(
  permissions: Permission[],
  mode: 'all' | 'any' = 'all'
): boolean {
  const role = useCurrentOrgRole();
  return canAccess(role, permissions, mode);
}

export function useHasRole(...roles: OrgRole[]): boolean {
  const role = useCurrentOrgRole();
  return role ? roles.includes(role) : false;
}
