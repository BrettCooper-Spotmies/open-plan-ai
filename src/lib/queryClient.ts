import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
  
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (projectId: string) => [...queryKeys.tasks.lists(), projectId] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },
  
  // Issues
  issues: {
    all: ['issues'] as const,
    lists: () => [...queryKeys.issues.all, 'list'] as const,
    list: (projectId?: string) => [...queryKeys.issues.lists(), projectId] as const,
    details: () => [...queryKeys.issues.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.issues.details(), id] as const,
    openCount: () => [...queryKeys.issues.all, 'openCount'] as const,
  },
  
  // Milestones
  milestones: {
    all: ['milestones'] as const,
    list: (projectId: string) => [...queryKeys.milestones.all, 'list', projectId] as const,
  },
  
  // Team
  team: {
    all: ['team'] as const,
    members: () => [...queryKeys.team.all, 'members'] as const,
    workload: () => [...queryKeys.team.all, 'workload'] as const,
  },
  
  // Modules
  modules: {
    all: ['modules'] as const,
    list: () => [...queryKeys.modules.all, 'list'] as const,
  },
  
  // Reports
  reports: {
    all: ['reports'] as const,
    kpi: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'kpi', filters] as const,
    trends: (filters?: Record<string, unknown>) => [...queryKeys.reports.all, 'trends', filters] as const,
  },
};
