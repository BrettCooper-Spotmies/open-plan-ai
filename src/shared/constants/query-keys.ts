export const QK = {
  AUTH: {
    ME: ['auth', 'me'] as const,
  },
  ORGS: {
    root: ['orgs'] as const,
    list: () => [...QK.ORGS.root, 'list'] as const,
    detail: (id: string) => [...QK.ORGS.root, id] as const,
    members: (orgId: string) => [...QK.ORGS.root, orgId, 'members'] as const,
    activities: (orgId: string) => [...QK.ORGS.root, orgId, 'activities'] as const,
    reports: (orgId: string) => [...QK.ORGS.root, orgId, 'reports'] as const,
  },
  PROJECTS: {
    root: ['projects'] as const,
    all: (orgId?: string) => [...QK.PROJECTS.root, orgId] as const,
    detail: (id: string) => [...QK.PROJECTS.root, 'detail', id] as const,
    team: (id: string) => [...QK.PROJECTS.root, id, 'team'] as const,
    links: (id: string) => [...QK.PROJECTS.root, id, 'links'] as const,
    activities: (id: string) => [...QK.PROJECTS.root, id, 'activities'] as const,
    members: (id: string) => [...QK.PROJECTS.root, id, 'members'] as const,
    reports: (id: string) => [...QK.PROJECTS.root, id, 'reports'] as const,
  },
  TASKS: {
    root: ['tasks'] as const,
    list: (projectId: string) => [...QK.TASKS.root, 'list', projectId] as const,
    detail: (id: string) => [...QK.TASKS.root, 'detail', id] as const,
    mine: () => [...QK.TASKS.root, 'mine'] as const,
  },
  MILESTONES: {
    root: ['milestones'] as const,
    list: (projectId: string) => [...QK.MILESTONES.root, 'list', projectId] as const,
    detail: (id: string) => [...QK.MILESTONES.root, 'detail', id] as const,
  },
  MODULES: {
    root: ['modules'] as const,
    list: (projectId: string) => [...QK.MODULES.root, 'list', projectId] as const,
    detail: (id: string) => [...QK.MODULES.root, 'detail', id] as const,
  },
  ISSUES: {
    root: ['issues'] as const,
    list: (projectId?: string) => [...QK.ISSUES.root, 'list', projectId] as const,
    detail: (id: string) => [...QK.ISSUES.root, 'detail', id] as const,
  },
  BOM: {
    root: ['bom'] as const,
    list: (projectId: string) => [...QK.BOM.root, 'list', projectId] as const,
    summary: (projectId: string) => [...QK.BOM.root, projectId, 'summary'] as const,
  },
  NOTIFICATIONS: {
    root: ['notifications'] as const,
    list: () => [...QK.NOTIFICATIONS.root, 'list'] as const,
    count: () => [...QK.NOTIFICATIONS.root, 'count'] as const,
  },
  DASHBOARD: {
    root: ['dashboard'] as const,
    stats: (orgId?: string) => [...QK.DASHBOARD.root, 'stats', orgId] as const,
    activity: (orgId?: string) => [...QK.DASHBOARD.root, 'activity', orgId] as const,
    milestones: (orgId?: string) => [...QK.DASHBOARD.root, 'milestones', orgId] as const,
  },
  REPORTS: {
    root: ['reports'] as const,
    kpi: (filters?: Record<string, unknown>) => [...QK.REPORTS.root, 'kpi', filters] as const,
    trends: (f?: Record<string, unknown>) => [...QK.REPORTS.root, 'trends', f] as const,
    velocity: (id: string) => [...QK.REPORTS.root, id, 'velocity'] as const,
    burndown: (id: string) => [...QK.REPORTS.root, id, 'burndown'] as const,
  },
  TEAM: {
    root: ['team'] as const,
    members: () => [...QK.TEAM.root, 'members'] as const,
    workload: () => [...QK.TEAM.root, 'workload'] as const,
  },
  CONVERSATIONS: {
    root: ['conversations'] as const,
    list: () => [...QK.CONVERSATIONS.root, 'list'] as const,
    messages: (id: string) => [...QK.CONVERSATIONS.root, id, 'messages'] as const,
    files: (id: string) => [...QK.CONVERSATIONS.root, id, 'files'] as const,
  },
} as const;
