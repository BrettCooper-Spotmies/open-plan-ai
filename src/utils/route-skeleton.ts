export type SkeletonVariant = 'list' | 'projects' | 'dashboard' | 'detail' | 'project-detail' | 'default' | 'chat' | 'team' | 'settings' | 'notifications' | 'calendar' | 'reports';

export function getProjectSkeletonVariant(pathname: string): SkeletonVariant {
  if (pathname === '/projects' || pathname === '/projects/') return 'projects';
  if (pathname === '/projects/new' || pathname.endsWith('/edit') || pathname.includes('/issues/')) {
    return 'detail';
  }
  return 'project-detail';
}

export function getSkeletonVariant(pathname: string): SkeletonVariant {
  // Handle root and dashboards
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'dashboard';

  // Handle specific project routes delegated to helper
  if (pathname.startsWith('/projects')) return getProjectSkeletonVariant(pathname);

  // Handle base path variants
  const basePath = pathname.split('/')[1];
  const exactMatches: Record<string, SkeletonVariant> = {
    'my-day': 'list',
    'chat': 'chat',
    'team': 'team',
    'settings': 'settings',
    'notifications': 'notifications',
    'calendar': 'calendar',
    'reports': 'reports'
  };

  return exactMatches[basePath] || 'default';
}
