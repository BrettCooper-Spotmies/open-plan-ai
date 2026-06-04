export const WS_EVENTS = {
  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',

  // Projects
  PROJECT_UPDATED: 'project:updated',
  PROJECT_MEMBER_JOINED: 'project:member_joined',
  PROJECT_MEMBER_LEFT: 'project:member_left',

  // Tasks
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STATUS_CHANGED: 'task:status_changed',

  // Milestones
  MILESTONE_UPDATED: 'milestone:updated',
  MILESTONE_COMPLETED: 'milestone:completed',

  // Issues
  ISSUE_CREATED: 'issue:created',
  ISSUE_UPDATED: 'issue:updated',
  ISSUE_STATUS_CHANGED: 'issue:status_changed',

  // Chat / Conversations
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_REACTION: 'message:reaction',
  CONVERSATION_READ: 'conversation:read',
  USER_TYPING: 'user:typing',
  USER_STOPPED_TYPING: 'user:stopped_typing',

  // Presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Rooms
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',
} as const;

export type WsEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];
