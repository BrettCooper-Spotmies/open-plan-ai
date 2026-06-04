export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  JOIN_ORG: '/join-org',

  DASHBOARD: '/',
  MY_DAY: '/my-day',
  CALENDAR: '/calendar',
  CHAT: '/chat',
  CHAT_CONVERSATION: (id: string) => `/chat/${id}`,
  NOTIFICATIONS: '/notifications',

  PROJECTS: '/projects',
  PROJECT_NEW: '/projects/new',
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  PROJECT_EDIT: (id: string) => `/projects/${id}/edit`,
  PROJECT_ISSUE: (projectId: string, issueId: string) =>
    `/projects/${projectId}/issues/${issueId}`,

  REPORTS: '/reports',
  TEAM: '/team',
  SETTINGS: '/settings',
} as const;
