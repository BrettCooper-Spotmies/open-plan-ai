export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectRole = 'lead' | 'member' | 'viewer';
export type SystemRole = 'super_admin' | 'user';

export type Permission =
  | 'org:manage'
  | 'org:invite'
  | 'org:view'
  | 'org:billing'
  | 'project:create'
  | 'project:edit'
  | 'project:delete'
  | 'project:view'
  | 'task:create'
  | 'task:edit'
  | 'task:delete'
  | 'task:assign'
  | 'task:view'
  | 'milestone:create'
  | 'milestone:edit'
  | 'milestone:delete'
  | 'milestone:view'
  | 'issue:create'
  | 'issue:edit'
  | 'issue:delete'
  | 'issue:view'
  | 'bom:create'
  | 'bom:edit'
  | 'bom:delete'
  | 'bom:view'
  | 'team:manage'
  | 'team:view'
  | 'report:view'
  | 'settings:manage';

const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    'org:manage', 'org:invite', 'org:view', 'org:billing',
    'project:create', 'project:edit', 'project:delete', 'project:view',
    'task:create', 'task:edit', 'task:delete', 'task:assign', 'task:view',
    'milestone:create', 'milestone:edit', 'milestone:delete', 'milestone:view',
    'issue:create', 'issue:edit', 'issue:delete', 'issue:view',
    'bom:create', 'bom:edit', 'bom:delete', 'bom:view',
    'team:manage', 'team:view',
    'report:view', 'settings:manage',
  ],
  admin: [
    'org:invite', 'org:view',
    'project:create', 'project:edit', 'project:delete', 'project:view',
    'task:create', 'task:edit', 'task:delete', 'task:assign', 'task:view',
    'milestone:create', 'milestone:edit', 'milestone:delete', 'milestone:view',
    'issue:create', 'issue:edit', 'issue:delete', 'issue:view',
    'bom:create', 'bom:edit', 'bom:delete', 'bom:view',
    'team:manage', 'team:view',
    'report:view', 'settings:manage',
  ],
  member: [
    'org:view',
    'project:create', 'project:edit', 'project:view',
    'task:create', 'task:edit', 'task:assign', 'task:view',
    'milestone:create', 'milestone:edit', 'milestone:view',
    'issue:create', 'issue:edit', 'issue:view',
    'bom:create', 'bom:edit', 'bom:view',
    'team:view',
    'report:view',
  ],
  viewer: [
    'org:view', 'project:view', 'task:view',
    'milestone:view', 'issue:view', 'bom:view', 'team:view', 'report:view',
  ],
};

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ORG_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: OrgRole): Permission[] {
  return ORG_ROLE_PERMISSIONS[role] ?? [];
}

export function canAccess(
  userRole: OrgRole | undefined,
  requiredPermissions: Permission[],
  mode: 'all' | 'any' = 'all'
): boolean {
  if (!userRole) return false;
  const perms = getPermissions(userRole);

  return mode === 'all'
    ? requiredPermissions.every((p) => perms.includes(p))
    : requiredPermissions.some((p) => perms.includes(p));
}
