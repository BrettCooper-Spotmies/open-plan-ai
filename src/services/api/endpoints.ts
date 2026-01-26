export const API_ENDPOINTS = {
  // Projects
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id: string) => `/projects/${id}`,
  
  // Tasks
  TASKS: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  PROJECT_TASKS: (projectId: string) => `/projects/${projectId}/tasks`,
  
  // Milestones
  MILESTONES: '/milestones',
  MILESTONE_BY_ID: (id: string) => `/milestones/${id}`,
  PROJECT_MILESTONES: (projectId: string) => `/projects/${projectId}/milestones`,
  
  // Issues
  ISSUES: '/issues',
  ISSUE_BY_ID: (id: string) => `/issues/${id}`,
  PROJECT_ISSUES: (projectId: string) => `/projects/${projectId}/issues`,
  
  // Modules
  MODULES: '/modules',
  MODULE_BY_ID: (id: string) => `/modules/${id}`,
  PROJECT_MODULES: (projectId: string) => `/projects/${projectId}/modules`,
  
  // Reports
  REPORTS_KPI: '/reports/kpi',
  REPORTS_TRENDS: '/reports/trends',
  REPORTS_WORKLOAD: '/reports/workload',
  
  // Team
  TEAM_MEMBERS: '/team/members',
  TEAM_MEMBER_BY_ID: (id: string) => `/team/members/${id}`,
  TEAM_WORKLOAD: '/team/workload',
  
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REGISTER: '/auth/register',
  AUTH_ME: '/auth/me',
} as const;
