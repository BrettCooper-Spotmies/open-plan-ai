// Centralized API endpoint constants
export const ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    ME: '/auth/me',
  },
  // Users
  USERS: {
    ME: '/users/me',
    ME_PROFILE: '/users/me/profile',
    SEARCH: '/users/search',
    BY_ID: (id: string) => `/users/${id}`,
    ORGS: (id: string) => `/users/${id}/organizations`,
  },
  // Organizations
  ORGANIZATIONS: {
    MY: '/organizations/my',
    CREATE: '/organizations',
    BY_ID: (id: string) => `/organizations/${id}`,
    MEMBERS: (orgId: string) => `/organizations/${orgId}/members`,
    MEMBER_ROLE: (orgId: string, userId: string) => `/organizations/${orgId}/members/${userId}/role`,
    REMOVE_MEMBER: (orgId: string, userId: string) => `/organizations/${orgId}/members/${userId}`,
    INVITATIONS: (orgId: string) => `/organizations/${orgId}/invitations`,
    REVOKE_INVITATION: (orgId: string, invId: string) => `/organizations/${orgId}/invitations/${invId}`,
    ACCEPT_INVITATION: '/invitations/accept',
    MY_INVITATIONS: '/invitations/my',
    ACCEPT_BY_ID: (id: string) => `/invitations/${id}/accept`,
    ACTIVITIES: (orgId: string) => `/organizations/${orgId}/activities`,
    REPORTS_OVERVIEW: (orgId: string) => `/organizations/${orgId}/reports/overview`,
    ALL_TASKS: (orgId: string) => `/organizations/${orgId}/tasks`,
    ALL_ISSUES: (orgId: string) => `/organizations/${orgId}/issues`,
    LOGO: (orgId: string) => `/organizations/${orgId}/logo`,
  },
  // Projects
  PROJECTS: {
    LIST: (orgId: string) => `/organizations/${orgId}/projects`,
    CREATE: (orgId: string) => `/organizations/${orgId}/projects`,
    BY_ID: (id: string) => `/projects/${id}`,
    UPDATE: (id: string) => `/projects/${id}`,
    DELETE: (id: string) => `/projects/${id}`,
    STAGE: (id: string) => `/projects/${id}/stage`,
    MEMBERS: (id: string) => `/projects/${id}/members`,
    MEMBER: (projectId: string, userId: string) => `/projects/${projectId}/members/${userId}`,
    TEAM: (id: string) => `/projects/${id}/team`,
    LINKS: (id: string) => `/projects/${id}/links`,
    ACTIVITIES: (id: string) => `/projects/${id}/activities`,
    REPORTS_OVERVIEW: (id: string) => `/projects/${id}/reports/overview`,
    REPORTS_VELOCITY: (id: string) => `/projects/${id}/reports/velocity`,
    REPORTS_TASK_DISTRIBUTION: (id: string) => `/projects/${id}/reports/task-distribution`,
    REPORTS_TEAM_WORKLOAD: (id: string) => `/projects/${id}/reports/team-workload`,
    REPORTS_BURNDOWN: (id: string) => `/projects/${id}/reports/burndown`,
  },
  // Tasks
  TASKS: {
    LIST: (projectId: string) => `/projects/${projectId}/tasks`,
    CREATE: (projectId: string) => `/projects/${projectId}/tasks`,
    BY_ID: (id: string) => `/tasks/${id}`,
    STATUS: (id: string) => `/tasks/${id}/status`,
    ASSIGNEES: (id: string) => `/tasks/${id}/assignees`,
    ASSIGNEE: (taskId: string, userId: string) => `/tasks/${taskId}/assignees/${userId}`,
    MODULES: (id: string) => `/tasks/${id}/modules`,
    MODULE: (taskId: string, moduleId: string) => `/tasks/${taskId}/modules/${moduleId}`,
    DEPENDENCIES: (id: string) => `/tasks/${id}/dependencies`,
    DEPENDENCY: (taskId: string, depId: string) => `/tasks/${taskId}/dependencies/${depId}`,
    COMMENTS: (id: string) => `/tasks/${id}/comments`,
    ME_ALL: '/tasks/me/all',
  },
  // Hardware Modules
  MODULES: {
    LIST: (projectId: string) => `/projects/${projectId}/hardware-modules`,
    CREATE: (projectId: string) => `/projects/${projectId}/hardware-modules`,
    BY_ID: (id: string) => `/hardware-modules/${id}`,
  },
  // Milestones
  MILESTONES: {
    LIST: (projectId: string) => `/projects/${projectId}/milestones`,
    CREATE: (projectId: string) => `/projects/${projectId}/milestones`,
    BY_ID: (id: string) => `/milestones/${id}`,
    COMPLETE: (id: string) => `/milestones/${id}/complete`,
    TASKS: (id: string) => `/milestones/${id}/tasks`,
    TASK: (milestoneId: string, taskId: string) => `/milestones/${milestoneId}/tasks/${taskId}`,
    GENERATE_TASKS: (id: string) => `/milestones/${id}/generate-tasks`,
  },
  // Issues
  ISSUES: {
    LIST: (projectId: string) => `/projects/${projectId}/issues`,
    CREATE: (projectId: string) => `/projects/${projectId}/issues`,
    BY_ID: (id: string) => `/issues/${id}`,
    STATUS: (id: string) => `/issues/${id}/status`,
    ASSIGNEES: (id: string) => `/issues/${id}/assignees`,
    ASSIGNEE: (issueId: string, userId: string) => `/issues/${issueId}/assignees/${userId}`,
    TASK_LINKS: (id: string) => `/issues/${id}/task-links`,
    TASK_LINK: (issueId: string, taskId: string) => `/issues/${issueId}/task-links/${taskId}`,
    COMMENTS: (id: string) => `/issues/${id}/comments`,
  },
  // BOM
  BOM: {
    TREE:              (projectId: string) => `/projects/${projectId}/bom/tree`,
    NODES:             (projectId: string) => `/projects/${projectId}/bom/nodes`,
    SUMMARY:           (projectId: string) => `/projects/${projectId}/bom/summary`,
    EXPORT:            (projectId: string) => `/projects/${projectId}/bom/export`,
    NODE:              (nodeId: string) => `/bom/nodes/${nodeId}`,
    NODE_MOVE:         (nodeId: string) => `/bom/nodes/${nodeId}/parent`,
    NODE_REQUIREMENTS: (nodeId: string) => `/bom/nodes/${nodeId}/requirements`,
    REQ_LINK:          (linkId: string) => `/bom/requirement-links/${linkId}`,
  },
  // Parts catalog (org-scoped)
  PARTS: {
    LIST:      (orgId: string)  => `/organizations/${orgId}/parts`,
    CREATE:    (orgId: string)  => `/organizations/${orgId}/parts`,
    BY_ID:     (partId: string) => `/parts/${partId}`,
    REVISIONS: (partId: string) => `/parts/${partId}/revisions`,
    WHERE_USED:(partId: string) => `/parts/${partId}/where-used`,
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    COUNT: '/notifications/count',
    READ_ALL: '/notifications/read-all',
    READ: (id: string) => `/notifications/${id}/read`,
    DELETE: (id: string) => `/notifications/${id}`,
  },
  // Comments
  COMMENTS: {
    UPDATE: (id: string) => `/comments/${id}`,
    DELETE: (id: string) => `/comments/${id}`,
  },
  // Message reactions
  REACTIONS: {
    TOGGLE: (messageId: string) => `/messages/${messageId}/reactions`,
    BULK: '/messages/reactions',
  },
  // Chat / Conversations
  CONVERSATIONS: {
    LIST: '/conversations',
    CREATE: '/conversations',
    BY_ID: (id: string) => `/conversations/${id}`,
    MESSAGES: (id: string) => `/conversations/${id}/messages`,
    FILE_MESSAGE: (id: string) => `/conversations/${id}/messages/file`,
    READ: (id: string) => `/conversations/${id}/read`,
    MEMBERS: (id: string) => `/conversations/${id}/members`,
    MEMBER: (conversationId: string, userId: string) => `/conversations/${conversationId}/members/${userId}`,
    FILES: (id: string) => `/conversations/${id}/files`,
  },
  // Engineering Changes (ECO)
  ECOS: {
    LIST:     (projectId: string) => `/projects/${projectId}/ecos`,
    STATS:    (projectId: string) => `/projects/${projectId}/ecos/stats`,
    CREATE:   (projectId: string) => `/projects/${projectId}/ecos`,
    BY_ID:    (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}`,
    UPDATE:   (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}`,
    DELETE:   (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}`,
    SUBMIT:   (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/submit`,
    DECISION: (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/decision`,
    RELEASE:  (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/release`,
    VERIFY:   (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/verify`,
    CLOSE:    (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/close`,
    HOLD:     (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/hold`,
    RESUME:   (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/resume`,
    ECN:      (projectId: string, ecoId: string) => `/projects/${projectId}/ecos/${ecoId}/ecn`,
  },
  // Links
  LINKS: {
    DELETE: (id: string) => `/links/${id}`,
  },
  // Uploads
  UPLOADS: {
    AVATAR: '/uploads/avatar',
    ATTACHMENTS: '/uploads/attachments',
    ATTACHMENT: (id: string) => `/uploads/attachments/${id}`,
    BY_ENTITY: (entityType: string, entityId: string) => `/uploads/attachments/${entityType}/${entityId}`,
  },
};
